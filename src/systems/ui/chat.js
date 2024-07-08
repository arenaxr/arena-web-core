/**
 * @fileoverview MQTT-based chat
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global ARENAAUTH, $ */

import 'linkifyjs';
import 'linkifyjs/string';
import { proxy } from 'comlink';
import { Notify } from 'notiflix/build/notiflix-notify-aio';
import { ARENAUtils } from '../../utils';
import { ARENA_EVENTS, JITSI_EVENTS, EVENT_SOURCES } from '../../constants';

const UserType = Object.freeze({
    EXTERNAL: 'external',
    SCREENSHARE: 'screenshare',
    ARENA: 'arena',
});

const notifyTypes = Object.freeze({
    info: Notify.info,
    warning: Notify.warning,
    error: Notify.failure,
    success: Notify.success,
});

Notify.init({
    position: 'center-top',
    width: '440px',
    timeout: 1500,
    showOnlyTheLastOne: false,
    messageMaxLength: 100,
    fontFamily: 'Roboto',
    fontSize: '1em',
    clickToClose: true,
    info: {
        textColor: '#545454',
        notiflixIconColor: '#26c0d3',
        background: '#FFFFFF',
    },
    error: {
        notiflixIconColor: '#FFFFFF',
    },
    warning: {
        notiflixIconColor: '#FFFFFF',
    },
});

/**
 * A class to manage an instance of the ARENA chat MQTT and GUI message system.
 */
AFRAME.registerSystem('arena-chat-ui', {
    schema: {
        enabled: { type: 'boolean', default: true },
    },

    async init() {
        const { data } = this;

        if (!data.enabled) return;

        this.sceneEl.addEventListener(JITSI_EVENTS.CONNECTED, this.onJitsiConnect.bind(this));

        ARENA.events.addMultiEventListener(
            [ARENA_EVENTS.ARENA_LOADED, ARENA_EVENTS.MQTT_LOADED, ARENA_EVENTS.JITSI_LOADED],
            this.ready.bind(this)
        );
    },
    async ready() {
        const { el } = this;

        const { sceneEl } = el;

        this.arena = sceneEl.systems['arena-scene'];
        this.mqtt = sceneEl.systems['arena-mqtt'];
        this.jitsi = sceneEl.systems['arena-jitsi'];
        this.health = sceneEl.systems['arena-health-ui'];

        this.isSpeaker = false;
        this.stats = {};
        this.status = {};

        // users list
        this.liveUsers = {};

        this.userId = this.arena.idTag;
        this.cameraId = this.arena.camName;
        this.userName = this.arena.getDisplayName();
        this.realm = ARENA.defaults.realm;
        this.nameSpace = this.arena.nameSpace;
        this.scene = this.arena.namespacedScene;
        this.devInstance = ARENA.defaults.devInstance;
        this.isSceneWriter = this.arena.isUserSceneWriter();

        this.keepalive_interval_ms = 30000;

        // cleanup userlist periodically
        window.setInterval(this.userCleanup.bind(this), this.keepalive_interval_ms * 3);

        /*
        Clients listen for chat messages on:
            - global public (*o*pen) topic (<realm>/c/<scene-namespace>/o/#)
            - a user (*p*rivate) topic (<realm>/c/<scene-namespace>/p/userhandle/#)

        Clients write always to a topic with its own userhandle:
              - a topic for each user for private messages ( <realm>/c/<scene-namespace>/p/[other-cameraid]/userhandle)
            - a global topic (ugtopic; r<realm>/c/<scene-namespace>/o/userhandle);

        where userhandle = cameraid + btoa(cameraid)

        Note: topic must always end with userhandle and match from_un in the message (check on client at receive, and/or on publish at pubsub server)
        Note: scene-only messages are sent to public topic and filtered at the client
        Note: scene-namespace is the current scene namespace

        Summary of topics/permissions:
            <realm>/c/<scene-namespace>/p/<userid>/#  - receive private messages
            <realm>/c/<scene-namespace>/o/#  - receive open messages to everyone and/or scene
            <realm>/c/<scene-namespace>/o/userhandle - send open messages (chat keepalive, messages to all/scene)
            <realm>/c/<scene-namespace>/p/[regex-matching-any-userid]/userhandle - private messages to user
        */

        // receive private messages  (subscribe only)
        this.subscribePrivateTopic = `${this.realm}/c/${this.nameSpace}/p/${this.userId}/#`;

        // receive open messages to everyone and/or scene (subscribe only)
        this.subscribePublicTopic = `${this.realm}/c/${this.nameSpace}/o/#`;

        // send private messages to a user (publish only)
        this.publishPrivateTopic = `${this.realm}/c/${this.nameSpace}/p/{to_uid}/${`${this.userId}${btoa(
            this.userId
        )}`}`;

        // send open messages (chat keepalive, messages to all/scene) (publish only)
        this.publishPublicTopic = `${this.realm}/c/${this.nameSpace}/o/${`${this.userId}${btoa(this.userId)}`}`;

        // counter for unread msgs
        this.unreadMsgs = 0;

        // create chat html elements
        const btnGroup = document.getElementById('chat-button-group');
        btnGroup.parentElement.classList.remove('d-none');

        this.chatBtn = document.createElement('div');
        this.chatBtn.className = 'arena-button chat-button';
        this.chatBtn.setAttribute('title', 'Chat');
        this.chatBtn.style.backgroundImage = "url('src/systems/ui/images/message.png')";
        btnGroup.appendChild(this.chatBtn);

        this.chatDot = document.createElement('span');
        this.chatDot.className = 'dot';
        this.chatDot.innerText = '...';
        this.chatBtn.appendChild(this.chatDot);

        this.usersBtn = document.createElement('div');
        this.usersBtn.className = 'arena-button users-button';
        this.usersBtn.setAttribute('title', 'User List');
        this.usersBtn.style.backgroundImage = "url('src/systems/ui/images/users.png')";
        btnGroup.appendChild(this.usersBtn);

        this.usersDot = document.createElement('span');
        this.usersDot.className = 'dot';
        this.usersDot.innerText = '1';
        this.usersBtn.appendChild(this.usersDot);

        this.lmBtn = document.createElement('div');
        this.lmBtn.className = 'arena-button landmarks-button';
        this.lmBtn.setAttribute('title', 'Landmarks');
        this.lmBtn.style.backgroundImage = "url('src/systems/ui/images/landmarks.png')";
        btnGroup.appendChild(this.lmBtn);
        this.lmBtn.style.display = 'none';

        // chat
        this.chatPopup = document.createElement('div');
        this.chatPopup.className = 'chat-popup';
        this.chatPopup.style.display = 'none';
        document.body.appendChild(this.chatPopup);

        this.closeChatBtn = document.createElement('span');
        this.closeChatBtn.className = 'close';
        this.closeChatBtn.innerText = '×';
        this.chatPopup.appendChild(this.closeChatBtn);

        this.msgList = document.createElement('div');
        this.msgList.className = 'message-list';
        this.chatPopup.appendChild(this.msgList);

        const formDiv = document.createElement('div');
        formDiv.className = 'form-container';
        this.chatPopup.appendChild(formDiv);

        this.msgTxt = document.createElement('textarea');
        this.msgTxt.setAttribute('rows', '1');
        this.msgTxt.setAttribute('placeholder', 'Type message..');
        formDiv.className = 'form-container';
        formDiv.appendChild(this.msgTxt);

        this.toSel = document.createElement('select');
        this.toSel.className = 'sel';
        formDiv.appendChild(this.toSel);

        this.addToSelOptions();

        this.msgBtn = document.createElement('button');
        this.msgBtn.className = 'btn';
        formDiv.appendChild(this.msgBtn);

        // users
        this.usersPopup = document.createElement('div');
        this.usersPopup.className = 'users-popup';
        this.usersPopup.style.display = 'none';
        document.body.appendChild(this.usersPopup);

        this.closeUsersBtn = document.createElement('span');
        this.closeUsersBtn.className = 'close';
        this.closeUsersBtn.innerText = '×';
        this.usersPopup.appendChild(this.closeUsersBtn);

        if (this.isSceneWriter) {
            const muteAllDiv = document.createElement('div');
            muteAllDiv.className = 'mute-all';
            this.usersPopup.appendChild(muteAllDiv);

            this.silenceAllBtn = document.createElement('span');
            this.silenceAllBtn.className = 'users-list-btn ma';
            this.silenceAllBtn.title = 'Silence (Mute Everyone)';
            muteAllDiv.appendChild(this.silenceAllBtn);
        }

        let label = document.createElement('span');
        label.innerHTML = '<br/>&nbsp';
        label.style.fontSize = 'small';
        this.usersPopup.appendChild(label);

        this.nSceneUserslabel = document.createElement('span');
        this.nSceneUserslabel.style.fontSize = 'small';
        this.usersPopup.appendChild(this.nSceneUserslabel);

        label = document.createElement('span');
        label.innerText = ' Users (you can find and mute users):';
        label.style.fontSize = 'small';
        this.usersPopup.appendChild(label);

        const userDiv = document.createElement('div');
        userDiv.className = 'user-list';
        this.usersPopup.appendChild(userDiv);

        this.usersList = document.createElement('ul');
        userDiv.appendChild(this.usersList);

        // landmarks
        this.lmPopup = document.createElement('div');
        this.lmPopup.className = 'users-popup';
        this.lmPopup.style.display = 'none';
        document.body.appendChild(this.lmPopup);

        this.closeLmBtn = document.createElement('span');
        this.closeLmBtn.className = 'close';
        this.closeLmBtn.innerHTML = '&times';
        this.lmPopup.appendChild(this.closeLmBtn);

        label = document.createElement('span');
        label.innerHTML = '<br/>&nbspLandmarks (buttons allow to find landmarks):';
        label.style.fontSize = 'small';
        this.lmPopup.appendChild(label);

        const lmDiv = document.createElement('div');
        lmDiv.className = 'user-list';
        this.lmPopup.appendChild(lmDiv);

        this.lmList = document.createElement('ul');
        lmDiv.appendChild(this.lmList);

        const _this = this;

        this.displayAlert('Not sending audio or video. Use icons on the right to start.', 5000);

        let expanded = false;
        const expandBtn = document.getElementById('chat-button-group-expand-icon');
        document.querySelector('.chat-button-group-expand').addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) {
                // toggled
                expandBtn.classList.replace('fa-angle-left', 'fa-angle-right');
                btnGroup.classList.add('d-none');
            } else {
                expandBtn.classList.replace('fa-angle-right', 'fa-angle-left');
                btnGroup.classList.remove('d-none');
            }
        });

        this.chatBtn.onclick = function onChatClick() {
            if (_this.chatPopup.style.display === 'none') {
                _this.chatPopup.style.display = 'block';
                _this.usersPopup.style.display = 'none';
                _this.chatDot.style.display = 'none';
                _this.lmPopup.style.display = 'none';
                _this.unreadMsgs = 0;

                // scroll to bottom
                _this.msgList.scrollTop = _this.msgList.scrollHeight;

                // focus on textbox
                _this.msgTxt.focus();
            } else {
                _this.chatPopup.style.display = 'none';
            }
        };

        this.usersBtn.onclick = function onUsersClick() {
            if (_this.usersPopup.style.display === 'none') {
                _this.chatPopup.style.display = 'none';
                _this.usersPopup.style.display = 'block';
                _this.lmPopup.style.display = 'none';
                _this.populateUserList();
            } else {
                _this.usersPopup.style.display = 'none';
            }
        };

        this.closeChatBtn.onclick = function onCloseChatClick() {
            _this.chatPopup.style.display = 'none';
        };

        this.closeUsersBtn.onclick = function onCloseUsersClick() {
            _this.usersPopup.style.display = 'none';
        };

        this.msgBtn.onclick = function onMsgClick() {
            if (_this.msgTxt.value.length > 0) _this.sendMsg(_this.msgTxt.value);
            _this.msgTxt.value = '';
        };

        this.lmBtn.onclick = function onLandmarkClick() {
            if (_this.lmPopup.style.display === 'none') {
                _this.chatPopup.style.display = 'none';
                _this.usersPopup.style.display = 'none';
                _this.lmPopup.style.display = 'block';
            } else {
                _this.lmPopup.style.display = 'none';
            }
        };

        this.closeLmBtn.onclick = function onCloseLandmarkClick() {
            _this.lmPopup.style.display = 'none';
        };

        this.msgTxt.addEventListener('keyup', (event) => {
            event.preventDefault();
            if (event.key === 'Enter') {
                if (_this.msgTxt.value.length > 1) _this.sendMsg(_this.msgTxt.value);
                _this.msgTxt.value = '';
            }
        });

        // send sound on/off msg to all
        if (this.silenceAllBtn) {
            this.silenceAllBtn.onclick = function onSilenceAllClick() {
                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This will send a mute request to all users.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    reverseButtons: true,
                }).then((result) => {
                    if (result.isConfirmed) {
                        // send to all scene topic
                        _this.ctrlMsg('scene', 'sound:off');
                    }
                });
            };
        }

        // check if we jumped to a different scene from a "teleport"
        const moveToCamera = localStorage.getItem('moveToFrontOfCamera');
        if (moveToCamera !== null) {
            localStorage.removeItem('moveToFrontOfCamera');
            this.moveToFrontOfCamera(moveToCamera, this.scene);
        }

        this.onNewSettings = this.onNewSettings.bind(this);
        this.onUserJoin = this.onUserJoin.bind(this);
        this.onScreenshare = this.onScreenshare.bind(this);
        this.onUserLeft = this.onUserLeft.bind(this);
        this.onDominantSpeakerChanged = this.onDominantSpeakerChanged.bind(this);
        this.onTalkWhileMuted = this.onTalkWhileMuted.bind(this);
        this.onNoisyMic = this.onNoisyMic.bind(this);
        this.onConferenceError = this.onConferenceError.bind(this);
        this.onJitsiStatsLocal = this.onJitsiStatsLocal.bind(this);
        this.onJitsiStatsRemote = this.onJitsiStatsRemote.bind(this);
        this.onJitsiStatus = this.onJitsiStatus.bind(this);

        sceneEl.addEventListener(ARENA_EVENTS.NEW_SETTINGS, this.onNewSettings);
        sceneEl.addEventListener(JITSI_EVENTS.USER_JOINED, this.onUserJoin);
        sceneEl.addEventListener(JITSI_EVENTS.SCREENSHARE, this.onScreenshare);
        sceneEl.addEventListener(JITSI_EVENTS.USER_LEFT, this.onUserLeft);
        sceneEl.addEventListener(JITSI_EVENTS.DOMINANT_SPEAKER_CHANGED, this.onDominantSpeakerChanged);
        sceneEl.addEventListener(JITSI_EVENTS.TALK_WHILE_MUTED, this.onTalkWhileMuted);
        sceneEl.addEventListener(JITSI_EVENTS.NOISY_MIC, this.onNoisyMic);
        sceneEl.addEventListener(JITSI_EVENTS.CONFERENCE_ERROR, this.onConferenceError);
        sceneEl.addEventListener(JITSI_EVENTS.STATS_LOCAL, this.onJitsiStatsLocal);
        sceneEl.addEventListener(JITSI_EVENTS.STATS_REMOTE, this.onJitsiStatsRemote);
        sceneEl.addEventListener(JITSI_EVENTS.STATUS, this.onJitsiStatus);

        await this.connect();
    },

    onNewSettings(e) {
        const args = e.detail;
        if (!args.userName) return; // only handle a user name change
        this.userName = args.userName;
        this.keepalive(); // let other users know
        this.populateUserList();
    },

    /**
     * Called when we connect to a jitsi conference (including reconnects)
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onJitsiConnect(e) {
        const args = e.detail;
        args.pl.forEach((user) => {
            // console.log('Jitsi User: ', user);
            // check if jitsi knows about someone we don't; add to user list
            if (!this.liveUsers[user.id]) {
                this.liveUsers[user.id] = {
                    jid: args.jid,
                    un: user.dn,
                    scene: args.scene,
                    cid: user.cn,
                    ts: new Date().getTime(),
                    type: UserType.EXTERNAL, // indicate we only know about the user from jitsi
                };
            }
        });
    },

    /**
     * Called when user joins
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onUserJoin(e) {
        if (e.detail.src === EVENT_SOURCES.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            this.liveUsers[user.id] = {
                jid: user.jid,
                un: user.dn,
                scene: user.scene,
                cid: user.cn,
                ts: new Date().getTime(),
                type: UserType.EXTERNAL, // indicate we only know about the users from jitsi
            };
            if (user.scene === this.scene) this.populateUserList(this.liveUsers[user.id]);
            else this.populateUserList();
        }
    },

    /**
     * Called when a user screenshares
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onScreenshare(e) {
        if (e.detail.src === EVENT_SOURCES.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            this.liveUsers[user.id] = {
                jid: user.jid,
                un: user.dn,
                scene: user.scene,
                cid: user.cn,
                ts: new Date().getTime(),
                type: UserType.SCREENSHARE, // indicate we know the user is screensharing
            };
            if (user.scene === this.scene) this.populateUserList(this.liveUsers[user.id]);
            else this.populateUserList();
        }
    },

    /**
     * Called when user leaves
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onUserLeft(e) {
        if (e.detail.src === EVENT_SOURCES.CHAT) return; // ignore our events
        const user = e.detail;
        if (!this.liveUsers[user.id]) return;
        if (this.liveUsers[user.id].type === UserType.ARENA) return; // will be handled through mqtt messaging
        delete this.liveUsers[user.id];
        this.populateUserList();
    },

    /**
     * Called when dominant speaker changes.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onDominantSpeakerChanged(e) {
        const user = e.detail;
        const roomName = this.scene.toLowerCase().replace(/[!#$&'()*+,/:;=?@[\]]/g, '_');
        if (user.scene === roomName) {
            // if speaker exists, show speaker graph in user list
            const speakerId = user.id ? user.id : this.userId; // or self is speaker
            if (this.liveUsers[speakerId]) {
                this.liveUsers[speakerId].speaker = true;
            }
            // if previous speaker exists, show speaker graph in user list
            if (this.liveUsers[user.pid]) {
                this.liveUsers[user.pid].speaker = false;
            }
            this.isSpeaker = speakerId === this.userId;
            this.populateUserList();
        }
    },

    /**
     * Called when user is talking on mute.
     */
    onTalkWhileMuted() {
        this.displayAlert(`You are talking on mute.`, 2000, 'warning');
    },

    /**
     * Called when user's microphone is very noisy.
     */
    onNoisyMic() {
        this.displayAlert(`Your microphone appears to be noisy.`, 2000, 'warning');
    },

    onConferenceError(e) {
        // display error to user
        const { errorCode } = e.detail;
        const err = this.health.getErrorDetails(errorCode);
        this.displayAlert(err.title, 5000, 'error');
    },

    /**
     * Called when Jitsi local stats are updated.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onJitsiStatsLocal(e) {
        const { jid } = e.detail;
        const { stats } = e.detail;
        // local
        if (!this.stats) this.stats = {};
        this.stats.conn = stats;
        this.stats.resolution = stats.resolution[jid];
        this.stats.framerate = stats.framerate[jid];
        this.stats.codec = stats.codec[jid];
        // local and remote
        const _this = this;
        Object.keys(this.liveUsers).forEach((arenaId) => {
            if (!_this.liveUsers[arenaId].stats) _this.liveUsers[arenaId].stats = {};
            const { jid: _jid } = _this.liveUsers[arenaId];
            _this.liveUsers[arenaId].stats.resolution = stats.resolution[_jid];
            _this.liveUsers[arenaId].stats.framerate = stats.framerate[_jid];
            _this.liveUsers[arenaId].stats.codec = stats.codec[_jid];
        });
        this.populateUserList();
    },

    /**
     * Called when Jitsi remote stats are updated.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onJitsiStatsRemote(e) {
        const { jid } = e.detail;
        const arenaId = e.detail.id ? e.detail.id : e.detail.jid;
        const { stats } = e.detail;
        // remote
        if (this.liveUsers[arenaId]) {
            if (!this.liveUsers[arenaId].stats) this.liveUsers[arenaId].stats = {};
            this.liveUsers[arenaId].stats.conn = stats;
            this.liveUsers[arenaId].jid = jid;
            this.populateUserList();
            // update arena-user connection quality
            if (stats && stats.connectionQuality) {
                const userCamId = `camera_${arenaId}`;
                const userCamEl = document.querySelector(`[id='${userCamId}']`);
                if (userCamEl) {
                    userCamEl.setAttribute('arena-user', 'jitsiQuality', stats.connectionQuality);
                }
            }
        }
    },

    /**
     * Called when Jitsi remote and local status object is updated.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    onJitsiStatus(e) {
        const arenaId = e.detail.id;
        const { status } = e.detail;
        // local
        if (this.userId === arenaId) {
            this.status = status;
        }
        // remote
        if (this.liveUsers[arenaId]) {
            this.liveUsers[arenaId].status = status;
        }
        this.populateUserList();
    },

    /**
     * Getter to return the active user list state.
     * @return {[Object]} The list of active users.
     */
    getUserList() {
        return this.liveUsers;
    },

    /**
     * Subscribe to mqtt channels.
     */
    async connect() {
        if (this.connected === true) return;
        this.mqttc = ARENA.Mqtt.MQTTWorker;

        const _this = this; /* save reference to class instance */

        this.mqttc.registerMessageHandler('c', proxy(this.onMessageArrived.bind(_this)), true);
        this.mqttc.addConnectionLostHandler(proxy(this.onConnectionLost.bind(_this)));

        this.mqttc.subscribe(this.subscribePublicTopic);
        this.mqttc.subscribe(this.subscribePrivateTopic);

        this.keepalive();
        // periodically send a keep alive
        if (this.keepaliveInterval !== undefined) clearInterval(this.keepaliveInterval);
        this.keepaliveInterval = setInterval(() => {
            _this.keepalive();
        }, this.keepalive_interval_ms);

        this.connected = true;
    },

    /**
     * Chat MQTT connection lost handler.
     */
    onConnectionLost() {
        console.error('Chat disconnected.');
        this.connected = false;
    },

    /**
     * Utility to know if the user has been authenticated.
     * @param {string} cameraId The user camera id.
     * @return {boolean} True if non-anonymous.
     */
    isUserAuthenticated(cameraId) {
        return !cameraId.includes('anonymous');
    },

    isModerator(status) {
        return status && status.role === 'moderator';
    },

    /**
     * Method to publish outgoing chat messages, gathers destination from UI.
     * @param {*} msgTxt The message text.
     */
    sendMsg(msgTxt) {
        const now = new Date();
        const msg = {
            object_id: ARENAUtils.uuidv4(),
            type: 'chat',
            to_uid: this.toSel.value,
            from_uid: this.userId,
            from_un: this.userName,
            from_scene: this.scene,
            from_desc: `${decodeURI(this.userName)} (${this.toSel.options[this.toSel.selectedIndex].text})`,
            from_time: now.toJSON(),
            cameraid: this.cameraId,
            text: msgTxt,
        };
        const dstTopic =
            this.toSel.value === 'scene' || this.toSel.value === 'all'
                ? this.publishPublicTopic
                : this.publishPrivateTopic.replace('{to_uid}', this.toSel.value);
        // console.log('sending', msg, 'to', dstTopic);
        try {
            this.mqttc.publish(dstTopic, JSON.stringify(msg), 0, false);
        } catch (err) {
            console.error('chat msg send failed:', err.message);
        }
        this.txtAddMsg(msg.text, `${msg.from_desc} ${now.toLocaleTimeString()}`, 'self');
    },

    /**
     * Handler for incoming subscription chat messages.
     * @param {Object} mqttMsg The MQTT Paho message object.
     */
    onMessageArrived(mqttMsg) {
        const { el } = this;

        const { sceneEl } = el;

        const msg = mqttMsg.payloadObj;
        // console.log('Received:', msg);

        // ignore invalid and our own messages
        if (msg.from_uid === undefined) return;
        if (msg.to_uid === undefined) return;
        if (msg.from_uid === this.userId) return;

        // save user data and timestamp
        if (this.liveUsers[msg.from_uid] === undefined && msg.from_un !== undefined && msg.from_scene !== undefined) {
            this.liveUsers[msg.from_uid] = {
                un: msg.from_un,
                scene: msg.from_scene,
                cid: msg.cameraid,
                ts: new Date().getTime(),
                type: UserType.ARENA,
            };
            if (msg.from_scene === this.scene) this.populateUserList(this.liveUsers[msg.from_uid]);
            else this.populateUserList();
            this.keepalive(); // let this user know about us
        } else if (msg.from_un !== undefined && msg.from_scene !== undefined) {
            if (msg?.text === 'left') {
                delete this.liveUsers[msg.from_uid];
                this.populateUserList();
                return;
            }
            this.liveUsers[msg.from_uid].un = msg.from_un;
            this.liveUsers[msg.from_uid].scene = msg.from_scene;
            this.liveUsers[msg.from_uid].cid = msg.cameraid;
            this.liveUsers[msg.from_uid].ts = new Date().getTime();
            this.liveUsers[msg.from_uid].type = UserType.ARENA;
        }

        // process commands
        if (msg.type === 'chat-ctrl') {
            if (msg.text === 'sound:off') {
                // console.log('muteAudio', this.jitsi.hasAudio);
                // only mute
                if (this.jitsi.hasAudio) {
                    const sideMenu = sceneEl.systems['arena-side-menu-ui'];
                    sideMenu.clickButton(sideMenu.buttons.AUDIO);
                }
            } else if (msg.text === 'logout') {
                const warn = `You have been asked to leave in 5 seconds by ${msg.from_un}.`;
                this.displayAlert(warn, 5000, 'warning');
                setTimeout(() => {
                    ARENAAUTH.signOut();
                }, 5000);
            }
            return;
        }

        // only proceed for chat messages sent to us or to all
        if (msg.type !== 'chat') return;
        if (msg.to_uid !== this.userId && msg.to_uid !== 'all' && msg.to_uid !== 'scene') return;

        // drop messages to scenes different from our scene
        if (msg.to_uid === 'scene' && msg.from_scene !== this.scene) return;

        this.txtAddMsg(msg.text, `${msg.from_desc} ${new Date(msg.from_time).toLocaleTimeString()}`, 'other');

        this.unreadMsgs++;
        this.chatDot.textContent = this.unreadMsgs < 100 ? this.unreadMsgs : '...';

        // check if chat is visible
        if (this.chatPopup.style.display === 'none') {
            const msgText = msg.text.length > 15 ? `${msg.text.substring(0, 15)}...` : msg.text;
            this.displayAlert(`New message from ${msg.from_un}: ${msgText}.`, 3000);
            this.chatDot.style.display = 'block';
        }
    },

    /**
     * Adds a text message to the text message panel.
     * @param {string} msg The message text.
     * @param {string} status The 'from' display username.
     * @param {string} who Sender scope: self, other.
     */
    txtAddMsg(msg, status, who) {
        let whoClass;
        if (who !== 'self' && who !== 'other') {
            whoClass = 'other';
        } else {
            whoClass = who;
        }
        const statusSpan = document.createElement('span');
        statusSpan.className = `status ${whoClass}`; // "self" | "other"
        statusSpan.textContent = status;
        this.msgList.appendChild(statusSpan);

        const msgSpan = document.createElement('span');
        msgSpan.className = `msg ${whoClass}`; // "self" | "other"
        const host = `https://${window.location.host.replace(/\./g, '\\.')}`;
        const pattern = `${host}/[a-zA-Z0-9]*/[a-zA-Z0-9]*(.*)*`; // permissive regex for a scene
        const regex = new RegExp(pattern);

        let displayMsg;
        if (msg.match(regex) != null) {
            // no new tab if we have a link to an arena scene
            displayMsg = msg.linkify({
                target: '_parent',
            });
        } else {
            displayMsg = msg.linkify({
                target: '_blank',
            });
        }
        msgSpan.innerHTML = displayMsg;
        this.msgList.appendChild(msgSpan);

        // scroll to bottom
        this.msgList.scrollTop = this.msgList.scrollHeight;
    },

    /**
     * Draw the contents of the Chat user list panel given its current state.
     * Adds a newUser if requested.
     * @param {Object} newUser The new user object to add.
     */
    populateUserList(newUser = undefined) {
        const { el } = this;

        const { sceneEl } = el;

        this.usersList.textContent = '';
        const selVal = this.toSel.value;
        if (newUser) {
            // only update 'to' select for new users
            this.toSel.textContent = '';
            this.addToSelOptions();
        }

        const _this = this;
        const userList = [];
        let nSceneUsers = 1;
        let nTotalUsers = 1;
        Object.keys(this.liveUsers).forEach((key) => {
            nTotalUsers++; // count all users
            if (_this.liveUsers[key].scene === _this.scene) nSceneUsers++; // only count users in the same scene
            userList.push({
                uid: key,
                sort_key: _this.liveUsers[key].scene === _this.scene ? 'aaa' : 'zzz',
                scene: _this.liveUsers[key].scene,
                un: _this.liveUsers[key].un,
                cid: _this.liveUsers[key].cid,
                type: _this.liveUsers[key].type,
                speaker: _this.liveUsers[key].speaker,
                stats: _this.liveUsers[key].stats,
                status: _this.liveUsers[key].status,
            });
        });

        userList.sort((a, b) => `${a.sort_key}${a.scene}${a.un}`.localeCompare(`${b.sort_key}${b.scene}${b.un}`));

        this.nSceneUserslabel.textContent = nTotalUsers;
        this.usersDot.textContent = nSceneUsers < 100 ? nSceneUsers : '...';
        if (newUser) {
            let msg = '';
            if (newUser.type !== UserType.SCREENSHARE) {
                msg = `${newUser.un}${newUser.type === UserType.EXTERNAL ? ' (external)' : ''} joined.`;
            } else {
                msg = `${newUser.un} started screen sharing.`;
            }
            let alertType = 'info';
            if (newUser.type !== 'arena') alertType = 'warning';
            this.displayAlert(msg, 5000, alertType, true);
        }

        const meUli = document.createElement('li');
        meUli.textContent = `${this.userName} (Me)`;
        if (this.isSpeaker) {
            meUli.style.color = 'green';
        }
        _this.usersList.appendChild(meUli);
        this.addJitsiStats(meUli, this.stats, this.status, meUli.textContent);
        const myUBtnCtnr = document.createElement('div');
        myUBtnCtnr.className = 'users-list-btn-ctnr';
        meUli.appendChild(myUBtnCtnr);

        const usspan = document.createElement('span');
        usspan.className = 'users-list-btn s';
        usspan.title = 'Mute Myself';
        myUBtnCtnr.appendChild(usspan);
        // span click event (sound off)
        usspan.onclick = () => {
            // only mute
            if (this.jitsi.hasAudio) {
                const sideMenu = sceneEl.systems['arena-side-menu-ui'];
                sideMenu.clickButton(sideMenu.buttons.AUDIO);
            }
        };

        // list users
        userList.forEach((user) => {
            const uli = document.createElement('li');
            const name = user.type !== UserType.SCREENSHARE ? user.un : `${user.un}'s Screen Share`;
            if (user.speaker) {
                uli.style.color = 'green';
            }
            uli.textContent = `${user.scene === _this.scene ? '' : `${user.scene}/`}${decodeURI(name)}${
                user.type === UserType.EXTERNAL ? ' (external)' : ''
            }`;
            if (user.type !== UserType.SCREENSHARE) {
                const uBtnCtnr = document.createElement('div');
                uBtnCtnr.className = 'users-list-btn-ctnr';
                uli.appendChild(uBtnCtnr);

                const fuspan = document.createElement('span');
                fuspan.className = 'users-list-btn fu';
                fuspan.title = 'Find User';
                uBtnCtnr.appendChild(fuspan);

                // span click event (move us to be in front of another clicked user)
                const { cid } = user;
                const { scene } = user;
                fuspan.onclick = function findUserClick() {
                    _this.moveToFrontOfCamera(cid, scene);
                };

                if (user.scene === _this.scene) {
                    const sspan = document.createElement('span');
                    sspan.className = 'users-list-btn s';
                    sspan.title = 'Mute User';
                    uBtnCtnr.appendChild(sspan);

                    // span click event (send sound on/off msg to ussr)
                    sspan.onclick = function muteUserClick() {
                        // message to target user
                        _this.ctrlMsg(user.uid, 'sound:off');
                    };

                    // Remove user to be rendered for all users, allowing full moderation for all.
                    // This follows Jitsi's philosophy that everyone should have the power to kick
                    // out inappropriate participants: https://jitsi.org/security/.
                    const kospan = document.createElement('span');
                    kospan.className = 'users-list-btn ko';
                    kospan.title = 'Remove User';
                    uBtnCtnr.appendChild(kospan);
                    kospan.onclick = function kickUserClick() {
                        Swal.fire({
                            title: 'Are you sure?',
                            text: `This will send an automatic logout request to ${decodeURI(user.un)}.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes',
                            reverseButtons: true,
                        }).then((result) => {
                            if (result.isConfirmed) {
                                _this.displayAlert(`Notifying ${decodeURI(user.un)} of removal.`, 5000);
                                _this.ctrlMsg(user.uid, 'logout');
                                // kick jitsi channel directly as well
                                const warn = `You have been asked to leave by ${_this.userName}.`;
                                _this.jitsi.kickout(user.uid, warn);
                            }
                        });
                    };

                    if (user.type === UserType.EXTERNAL) uli.className = 'external';
                } else {
                    uli.className = 'oscene';
                }
                if (newUser) {
                    // only update 'to' select for new users
                    const op = document.createElement('option');
                    op.value = user.uid;
                    op.textContent = `to: ${decodeURI(user.un)}${user.scene !== _this.scene ? ` (${user.scene})` : ''}`;
                    _this.toSel.appendChild(op);
                }
            }
            _this.usersList.appendChild(uli);
            this.addJitsiStats(uli, user.stats, user.status, uli.textContent);
        });
        this.toSel.value = selVal; // preserve selected value
    },

    /**
     * Apply a jitsi signal icon after the user name in list item 'uli'.
     * @param {Element} uli List item with only name, not buttons yet.
     * @param {Object} stats The jisti video stats object if any
     * @param {Object} status The jitsi status object if any
     * @param {string} name The display name of the user
     */
    addJitsiStats(uli, stats, status, name) {
        if (!stats) return;
        const iconStats = document.createElement('i');
        iconStats.className = 'videoStats fa fa-signal';
        iconStats.style.color = stats.conn ? this.jitsi.getConnectionColor(stats.conn.connectionQuality) : 'gray';
        iconStats.style.paddingLeft = '5px';
        uli.appendChild(iconStats);
        const spanStats = document.createElement('span');
        uli.appendChild(spanStats);
        // show current stats on hover/mouseover
        const _this = this;
        iconStats.onmouseover = function statsMouseOver() {
            spanStats.textContent = stats ? _this.jitsi.getConnectionText(name, stats, status) : 'None';
            const userList = $('.user-list');
            const offsetUl = userList.offset();
            const midpointW = offsetUl.left + userList.width() / 2;
            const midpointH = offsetUl.top + userList.height() / 2;
            const offsetSig = $(this).offset();
            const offLeft = offsetSig.left < midpointW ? offsetSig.left : 0;
            const offTop = offsetSig.top < midpointH ? 10 : offsetUl.top - offsetSig.top;
            $(this).next('span').fadeIn(200).addClass('videoTextTooltip');
            $(this).next('span').css('left', `${offLeft}px`);
            $(this).next('span').css('top', `${offTop}px`);
        };
        iconStats.onmouseleave = function statsMouseLeave() {
            $(this).next('span').fadeOut(200);
        };

        // show moderator info
        if (this.isModerator(status)) {
            const iconModerator = document.createElement('i');
            iconModerator.className = 'fa fa-crown';
            iconModerator.style.color = 'black';
            iconModerator.style.paddingLeft = '5px';
            iconModerator.title = 'Moderator';
            uli.appendChild(iconModerator);
        }
    },

    /**
     * Add a landmark to the landmarks list.
     * @param {Object} lm The landmark object.
     */
    addLandmark(lm) {
        const uli = document.createElement('li');
        uli.id = `lmList_${lm.el.id}`;
        uli.textContent = lm.data.label.length > 45 ? `${lm.data.label.substring(0, 45)}...` : lm.data.label;

        const lmBtnCtnr = document.createElement('div');
        lmBtnCtnr.className = 'lm-list-btn-ctnr';
        uli.appendChild(lmBtnCtnr);

        const lspan = document.createElement('span');
        lspan.className = 'lm-list-btn l';
        lspan.title = 'Move to Landmark';
        lmBtnCtnr.appendChild(lspan);

        // setup click event
        lspan.onclick = function onTeleportClick() {
            lm.teleportTo();
        };
        this.lmList.appendChild(uli);
        this.lmBtn.style.display = 'block';
    },

    /**
     * Remove a landmark from the landmarks list.
     * @param {Object} lm The landmark object.
     */
    removeLandmark(lm) {
        document.getElementById(`lmList_${lm.el.id}`).remove();
        if (this.lmList.childElementCount === 0) {
            this.lmBtn.style.display = 'none'; // hide landmarks button
        }
    },

    /**
     * Adds UI elements to select dropdown message destination.
     */
    addToSelOptions() {
        let op = document.createElement('option');
        op.value = 'scene';
        op.textContent = `to: scene ${this.scene}`;
        this.toSel.appendChild(op);

        op = document.createElement('option');
        op.value = 'all';
        op.textContent = 'to: namespace';
        this.toSel.appendChild(op);
    },

    /**
     * Send a chat system keepalive control message.
     */
    keepalive() {
        this.ctrlMsg('all', 'keepalive');
    },

    /**
     * Send a chat system control message for other users. Uses chat system topic structure
     * to send a private message.
     * @param {string} to Destination: all, scene, or the user id
     * @param {string} text Body of the message/command.
     */
    ctrlMsg(to, text) {
        let dstTopic;
        if (to === 'all' || to === 'scene') {
            dstTopic = this.publishPublicTopic; // public messages
        } else {
            // replace '{to_uid}' for the 'to' value
            dstTopic = this.publishPrivateTopic.replace('{to_uid}', to);
        }
        const msg = {
            object_id: ARENAUtils.uuidv4(),
            type: 'chat-ctrl',
            to_uid: to,
            from_uid: this.userId,
            from_un: this.userName,
            from_scene: this.scene,
            cameraid: this.cameraId,
            text,
        };
        // console.info('ctrl', msg, 'to', dstTopic);
        try {
            this.mqttc.publish(dstTopic, JSON.stringify(msg), 0, false);
        } catch (err) {
            console.error('chat-ctrl send failed:', err.message);
        }
    },

    /**
     * Removes orphaned Jitsi users from visible user list.
     * Is called periodically = keepalive_interval_ms * 3.
     */
    userCleanup() {
        const now = new Date().getTime();
        const _this = this;
        Object.keys(_this.liveUsers).forEach((key) => {
            if (
                now - _this.liveUsers[key].ts > _this.keepalive_interval_ms &&
                _this.liveUsers[key].type === UserType.ARENA
            ) {
                delete _this.liveUsers[key];
            }
        });
    },

    /**
     * Uses Notiflix library to popup a toast message.
     * @param {string} msg Text of the message.
     * @param {number} timeMs Duration of message in milliseconds.
     * @param {string} type Style of message: success, error, warning, info, question
     * @param {boolean} closeOthers Close other messages before displaying this one.
     */

    displayAlert(msg, timeMs, type = 'info', closeOthers = false) {
        const options = {
            showOnlyTheLastOne: closeOthers,
        };
        if (timeMs !== undefined) {
            options.timeout = timeMs;
        }
        notifyTypes[type](msg, options);
    },

    /**
     * Teleport method to move this user's camera to the front of another user's camera.
     * @param {string} cameraId Camera object id of the target user
     * @param {string} scene The scene name
     */
    moveToFrontOfCamera(cameraId, scene) {
        const { el } = this;

        const { sceneEl } = el;
        const cameraEl = sceneEl.camera.el;

        // console.log('Move to near camera:', cameraId);

        if (scene !== this.scene) {
            localStorage.setItem('moveToFrontOfCamera', cameraId);
            const path = window.location.pathname.substring(1);
            let devPath = '';
            if (this.devInstance && path.length > 0) {
                try {
                    [devPath] = path.match(/(?:x|dev)\/([^/]+)\/?/g);
                } catch (e) {
                    // no devPath
                }
            }
            const href = new URL(
                `${document.location.protocol}//${document.location.hostname}${
                    document.location.port ? `:${document.location.port}` : ''
                }/${devPath}${scene}`
            );
            document.location.href = href.toString();
            return;
        }

        const toCam = sceneEl.querySelector(`[id='${cameraId}']`);

        if (!toCam) {
            // TODO: find a better way to do this
            // when we jump to a scene, the "to" user needs to move for us to be able to find his camera
            console.error('Could not find destination user camera', cameraId);
            return;
        }

        if (!cameraEl) {
            console.error('Could not find our camera');
            return;
        }

        const direction = new THREE.Vector3();
        toCam.object3D.getWorldDirection(direction);
        const distance = this.arena.userTeleportDistance ? this.arena.userTeleportDistance : 2; // distance to put you
        cameraEl.object3D.position.copy(toCam.object3D.position.clone()).add(direction.multiplyScalar(-distance));
        cameraEl.object3D.position.y = toCam.object3D.position.y;
        // Reset navMesh data
        cameraEl.components['wasd-controls'].resetNav();
        cameraEl.components['press-and-move'].resetNav();
        // rotate our camera to face the other user
        cameraEl.components['look-controls'].yawObject.rotation.y = Math.atan2(
            cameraEl.object3D.position.x - toCam.object3D.position.x,
            cameraEl.object3D.position.z - toCam.object3D.position.z
        );
    },
});
