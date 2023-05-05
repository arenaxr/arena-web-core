/**
 * @fileoverview MQTT-based chat
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME, ARENA */

import * as Paho from 'paho-mqtt'; // https://www.npmjs.com/package/paho-mqtt
import {ARENAEventEmitter} from '../event-emitter';
import {ARENAUtils} from '../utils';
import {EVENTS} from '../constants/events';
import 'linkifyjs';
import 'linkifyjs/string';
import Swal from 'sweetalert2';

const UserType = Object.freeze({
    EXTERNAL:       'external',
    SCREENSHARE:    'screenshare',
    ARENA:          'arena',
});

/**
 * A class to manage an instance of the ARENA chat MQTT and GUI message system.
 */
AFRAME.registerSystem('arena-chat-ui', {
    schema: {
        enabled: {type: 'boolean', default: true},
    },

    init: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        if (!data.enabled) return;

        if (!sceneEl.ARENALoaded) {
            sceneEl.addEventListener(EVENTS.ARENA_LOADED, this.init.bind(this));
            return;
        }

        this.arena = sceneEl.systems['arena-scene'];

        this.isSpeaker = false;
        this.stats = {};
        this.status = {};

        // users list
        this.liveUsers = [];

        this.userid = this.arena.idTag;
        this.cameraid = this.arena.camName;
        this.username = this.arena.getDisplayName();
        this.realm = ARENADefaults.realm;
        this.namespace = this.arena.nameSpace;
        this.scene = this.arena.namespacedScene;
        this.persist_uri = this.arena.persistenceUrl;
        this.mqtt_host = this.arena.mqttHostURI;
        this.mqtt_username = this.arena.username;
        this.mqtt_token = this.arena.mqttToken;
        this.devInstance = ARENADefaults.devInstance;
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
        this.subscribePrivateTopic = `${this.realm}/c/${this.namespace}/p/${this.userid}/#`;

        // receive open messages to everyone and/or scene (subscribe only)
        this.subscribePublicTopic = `${this.realm}/c/${this.namespace}/o/#`;

        // send private messages to a user (publish only)
        this.publishPrivateTopic = `${this.realm}/c/${this.namespace}/p/\{to_uid\}/${`${this.userid}${btoa(this.userid)}`}`;

        // send open messages (chat keepalive, messages to all/scene) (publish only)
        this.publishPublicTopic = `${this.realm}/c/${this.namespace}/o/${`${this.userid}${btoa(this.userid)}`}`;

        // counter for unread msgs
        this.unreadMsgs = 0;

        // sweetalert mixin for our messages
        this.Alert = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            showCloseButton: true,
            timerProgressBar: true,
            timer: 1500,
            background: '#d3e2e6',
        });

        // create chat html elements
        const btnGroup = document.getElementById('chat-button-group');
        btnGroup.parentElement.classList.remove('d-none');

        this.chatBtn = document.createElement('div');
        this.chatBtn.className = 'arena-button chat-button';
        this.chatBtn.setAttribute('title', 'Chat');
        this.chatBtn.style.backgroundImage = 'url(\'src/ui/images/message.png\')';
        btnGroup.appendChild(this.chatBtn);

        this.chatDot = document.createElement('span');
        this.chatDot.className = 'dot';
        this.chatDot.innerText = '...';
        this.chatBtn.appendChild(this.chatDot);

        this.usersBtn = document.createElement('div');
        this.usersBtn.className = 'arena-button users-button';
        this.usersBtn.setAttribute('title', 'User List');
        this.usersBtn.style.backgroundImage = 'url(\'src/ui/images/users.png\')';
        btnGroup.appendChild(this.usersBtn);

        this.usersDot = document.createElement('span');
        this.usersDot.className = 'dot';
        this.usersDot.innerText = '1';
        this.usersBtn.appendChild(this.usersDot);

        this.lmBtn = document.createElement('div');
        this.lmBtn.className = 'arena-button landmarks-button';
        this.lmBtn.setAttribute('title', 'Landmarks');
        this.lmBtn.style.backgroundImage = 'url(\'src/ui/images/landmarks.png\')';
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
            if (expanded) { // toggled
                expandBtn.classList.replace('fa-angle-left', 'fa-angle-right');
                btnGroup.classList.add('d-none');
            } else {
                expandBtn.classList.replace('fa-angle-right', 'fa-angle-left');
                btnGroup.classList.remove('d-none');
            }
        });

        this.chatBtn.onclick = function() {
            if (_this.chatPopup.style.display == 'none') {
                _this.chatPopup.style.display = 'block';
                _this.usersPopup.style.display = 'none';
                _this.chatDot.style.display = 'none';
                _this.lmPopup.style.display = 'none';
                _this.unreadMsgs = 0;

                // scroll to bottom
                _this.msgList.scrollTop = _this.msgList.scrollHeight;

                // focus on textbox
                _this.msgTxt.focus();

                // re-establish connection, in case client disconnected
                _this.connect();
            } else {
                _this.chatPopup.style.display = 'none';
            }
        };

        this.usersBtn.onclick = function() {
            if (_this.usersPopup.style.display == 'none') {
                _this.chatPopup.style.display = 'none';
                _this.usersPopup.style.display = 'block';
                _this.lmPopup.style.display = 'none';
                _this.populateUserList();
            } else {
                _this.usersPopup.style.display = 'none';
            }
        };

        this.closeChatBtn.onclick = function() {
            _this.chatPopup.style.display = 'none';
        };

        this.closeUsersBtn.onclick = function() {
            _this.usersPopup.style.display = 'none';
        };

        this.msgBtn.onclick = function() {
            if (_this.msgTxt.value.length > 0) _this.sendMsg(_this.msgTxt.value);
            _this.msgTxt.value = '';
        };

        this.lmBtn.onclick = function() {
            if (_this.lmPopup.style.display == 'none') {
                _this.chatPopup.style.display = 'none';
                _this.usersPopup.style.display = 'none';
                _this.lmPopup.style.display = 'block';
            } else {
                _this.lmPopup.style.display = 'none';
            }
        };

        this.closeLmBtn.onclick = function() {
            _this.lmPopup.style.display = 'none';
        };

        this.msgTxt.addEventListener('keyup', function(event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                if (_this.msgTxt.value.length > 1) _this.sendMsg(_this.msgTxt.value);
                _this.msgTxt.value = '';
            }
        });

        // send sound on/off msg to all
        if (this.silenceAllBtn) {
            this.silenceAllBtn.onclick = function() {
                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This will send a mute request to all users.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    reverseButtons: true,
                })
                    .then((result) => {
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

        // this.arena.events.on(ARENAEventEmitter.events.NEW_SETTINGS, (e) => {
        //     const args = e.detail;
        //     if (!args.userName) return; // only handle a user name change
        //     _this.username = args.userName;
        //     _this.keepalive(); // let other users know
        //     _this.populateUserList();
        // });

        // this.arena.events.on(ARENAEventEmitter.events.JITSI_CONNECT, this.jitsiConnectCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.USER_JOINED, this.userJoinCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.SCREENSHARE, this.screenshareCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.USER_LEFT, this.userLeftCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.DOMINANT_SPEAKER, this.dominantSpeakerCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.TALK_WHILE_MUTED, this.talkWhileMutedCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.NOISY_MIC, this.noisyMicCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.CONFERENCE_ERROR, this.conferenceErrorCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.JITSI_STATS_LOCAL, this.jitsiStatsLocalCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.JITSI_STATS_REMOTE, this.jitsiStatsRemoteCallback.bind(this));
        // this.arena.events.on(ARENAEventEmitter.events.JITSI_STATUS, this.jitsiStatusCallback.bind(this));

        this.start();
    },

    /**
     * Called when we connect to a jitsi conference (including reconnects)
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiConnectCallback: function(e) {
        const data = this.data;
        const el = this.el;

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
                if (args.scene === this.scene) this.populateUserList(this.liveUsers[user.id]);
                else this.populateUserList();
            }
        });
    },

    /**
     * Called when user joins
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    userJoinCallback: function(e) {
        const data = this.data;
        const el = this.el;

        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            const _this = this;
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
    screenshareCallback: function (e) {
        const data = this.data;
        const el = this.el;

        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            const _this = this;
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
    userLeftCallback: function (e) {
        const data = this.data;
        const el = this.el;

        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
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
    dominantSpeakerCallback: function(e) {
        const data = this.data;
        const el = this.el;

        const user = e.detail;
        const roomName = this.scene.toLowerCase().replace(/[!#$&'()*+,\/:;=?@[\]]/g, '_');
        if (user.scene === roomName) {
            // if speaker exists, show speaker graph in user list
            const speaker_id = user.id ? user.id : this.userid; // or self is speaker
            if (this.liveUsers[speaker_id]) {
                this.liveUsers[speaker_id].speaker = true;
            }
            // if previous speaker exists, show speaker graph in user list
            if (this.liveUsers[user.pid]) {
                this.liveUsers[user.pid].speaker = false;
            }
            this.isSpeaker = (speaker_id === this.userid);
            this.populateUserList();
        }
    },

    /**
     * Called when user is talking on mute.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    talkWhileMutedCallback: function(e) {
        this.displayAlert(`You are talking on mute.`, 2000, 'warning');
    },

    /**
     * Called when user's microphone is very noisy.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    noisyMicCallback: function(e) {
        this.displayAlert(`Your microphone appears to be noisy.`, 2000, 'warning');
    },

    conferenceErrorCallback: function(e) {
        // display error to user
        const errorCode = e.detail.errorCode;
        const err = this.arena.health.getErrorDetails(errorCode);
        this.displayAlert(err.title, 5000, 'error');
    },

    /**
     * Called when Jitsi local stats are updated.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiStatsLocalCallback : function(e) {
        const data = this.data;
        const el = this.el;

        const jid = e.detail.jid;
        const stats = e.detail.stats;
        // local
        if (!this.stats) this.stats = {};
        this.stats.conn = stats;
        this.stats.resolution = stats.resolution[jid];
        this.stats.framerate = stats.framerate[jid];
        this.stats.codec = stats.codec[jid];
        // local and remote
        const _this = this;
        Object.keys(this.liveUsers).forEach(function(arenaId) {
            if (!_this.liveUsers[arenaId].stats) _this.liveUsers[arenaId].stats = {};
            const jid = _this.liveUsers[arenaId].jid;
            _this.liveUsers[arenaId].stats.resolution = stats.resolution[jid];
            _this.liveUsers[arenaId].stats.framerate = stats.framerate[jid];
            _this.liveUsers[arenaId].stats.codec = stats.codec[jid];
        });
        this.populateUserList();
    },

    /**
     * Called when Jitsi remote stats are updated.
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiStatsRemoteCallback : function(e) {
        const data = this.data;
        const el = this.el;

        const jid = e.detail.jid;
        const arenaId = e.detail.id ? e.detail.id : e.detail.jid;
        const stats = e.detail.stats;
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
    jitsiStatusCallback : function(e) {
        const data = this.data;
        const el = this.el;

        const jid = e.detail.jid;
        const arenaId = e.detail.id;
        const status = e.detail.status;
        // local
        if (this.userid == arenaId){
            this.status = status;
        }
        // remote
        if (this.liveUsers[arenaId]) {
            this.liveUsers[arenaId].status = status;
        }
        this.populateUserList();
    },


    /**
     * Perform some async startup tasks.
     * @param {boolean} force True to force the startup.
     */
    async start(force = false) {
        // connect mqtt
        await this.connect();
    },

    /**
     * Getter to return the active user list state.
     * @return {[Object]} The list of active users.
     */
    getUserList() {
        return this.liveUsers;
    },

    /**
     * Connect to the MQTT broker and subscribe.
     * @param {boolean} force True to force the connection.
     */
    connect: async function(force = false) {
        const data = this.data;
        const el = this.el;

        if (this.connected == true && force == false) return;
        this.mqttc = new Paho.Client(this.mqtt_host, `chat-${this.userid}`);

        const _this = this; /* save reference to class instance */
        const msg = {
            object_id: ARENAUtils.uuidv4(),
            type: 'chat-ctrl',
            to_uid: 'all',
            from_uid: this.userid,
            from_un: this.username,
            from_scene: this.scene,
            text: 'left',
        };
        const willMessage = new Paho.Message(JSON.stringify(msg));
        willMessage.destinationName = this.publishPublicTopic;
        this.mqttc.connect({
            onSuccess: () => {
                this.arena.health.removeError('mqttChat.connection');
                console.info(
                    'Chat connected. Subscribing to:',
                    this.subscribePublicTopic,
                    ';',
                    this.subscribePrivateTopic,
                );
                this.mqttc.subscribe(this.subscribePublicTopic);
                this.mqttc.subscribe(this.subscribePrivateTopic);

                /* bind callback to _this, so it can access the class instance */
                this.mqttc.onConnectionLost = this.onConnectionLost.bind(_this);
                this.mqttc.onMessageArrived = this.onMessageArrived.bind(_this);

                // say hello to everyone
                this.keepalive(false);

                // periodically send a keep alive
                if (this.keepaliveInterval != undefined) clearInterval(this.keepaliveInterval);
                this.keepaliveInterval = setInterval(function() {
                    _this.keepalive(true);
                }, this.keepalive_interval_ms);

                this.connected = true;
            },
            onFailure: () => {
                this.arena.health.addError('mqttChat.connection');
                console.error('Chat failed to connect.');
                this.connected = false;
            },
            willMessage: willMessage,
            userName: this.mqtt_username,
            password: this.mqtt_token,
        });
    },

    /**
     * Chat MQTT connection lost handler.
     * @param {Object} message Broker message.
     */
    onConnectionLost: function(message) {
        console.log(message)
        this.arena.health.addError('mqttChat.connection');
        console.error('Chat disconnect.');
        this.connected = false;
    },

    /**
     * Utility to know if the user has been authenticated.
     * @param {string} cameraId The user camera id.
     * @return {boolean} True if non-anonymous.
     */
    isUserAuthenticated: function(cameraId) {
        return !cameraId.includes('anonymous');
    },

    /**
     * Method to publish outgoing chat messages, gathers destination from UI.
     * @param {*} msgTxt The message text.
     */
    sendMsg: function(msgTxt) {
        const data = this.data;
        const el = this.el;

        const now = new Date();
        const msg = {
            object_id: ARENAUtils.uuidv4(),
            type: 'chat',
            to_uid: this.toSel.value,
            from_uid: this.userid,
            from_un: this.username,
            from_scene: this.scene,
            from_desc: `${decodeURI(this.username)} (${this.toSel.options[this.toSel.selectedIndex].text})`,
            from_time: now.toJSON(),
            cameraid: this.cameraid,
            text: msgTxt,
        };
        const dstTopic =
            this.toSel.value == 'scene' || this.toSel.value == 'all' ?
                this.publishPublicTopic :
                this.publishPrivateTopic.replace('{to_uid}', this.toSel.value);
        // console.log('sending', msg, 'to', dstTopic);
        try {
            this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
        } catch (err) {
            console.error('chat msg send failed:', err.message);
        }
        this.txtAddMsg(msg.text, msg.from_desc + ' ' + now.toLocaleTimeString(), 'self');
    },

    /**
     * Handler for incoming subscription chat messages.
     * @param {Object} mqttMsg The MQTT Paho message object.
     */
    onMessageArrived: function(mqttMsg) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        let msg;
        try {
            msg = JSON.parse(mqttMsg.payloadString);
        } catch (err) {
            console.error('Error parsing chat msg.');
            return;
        }
        // console.log('Received:', msg);

        // ignore invalid and our own messages
        if (msg.from_uid == undefined) return;
        if (msg.to_uid == undefined) return;
        if (msg.from_uid == this.userid) return;

        // save user data and timestamp
        if (this.liveUsers[msg.from_uid] == undefined && msg.from_un !== undefined && msg.from_scene !== undefined) {
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
            this.liveUsers[msg.from_uid].un = msg.from_un;
            this.liveUsers[msg.from_uid].scene = msg.from_scene;
            this.liveUsers[msg.from_uid].cid = msg.cameraid;
            this.liveUsers[msg.from_uid].ts = new Date().getTime();
            this.liveUsers[msg.from_uid].type = UserType.ARENA;
            if (msg.text) {
                if (msg.text == 'left') {
                    delete this.liveUsers[msg.from_uid];
                    this.populateUserList();
                }
            }
        }

        // process commands
        if (msg.type == 'chat-ctrl') {
            if (msg.text == 'sound:off') {
                // console.log('muteAudio', this.arena.Jitsi.hasAudio);
                // only mute
                if (this.arena.Jitsi.hasAudio) {
                    const sideMenu = sceneEl.components['arena-side-menu-ui'];
                    sideMenu.clickButton(sideMenu.buttons.AUDIO);
                }
            } else if (msg.text == 'logout') {
                const warn = `You have been asked to leave in 5 seconds by ${msg.from_un}.`;
                this.displayAlert(warn, 5000, 'warning');
                setTimeout(() => {
                    signOut();
                }, 5000);
            }
            return;
        }

        // only proceed for chat messages sent to us or to all
        if (msg.type !== 'chat') return;
        if (msg.to_uid !== this.userid && msg.to_uid !== 'all' && msg.to_uid !== 'scene') return;

        // drop messages to scenes different from our scene
        if (msg.to_uid === 'scene' && msg.from_scene != this.scene) return;

        this.txtAddMsg(msg.text, msg.from_desc + ' ' + new Date(msg.from_time).toLocaleTimeString(), 'other');

        this.unreadMsgs++;
        this.chatDot.textContent = this.unreadMsgs < 100 ? this.unreadMsgs : '...';

        // check if chat is visible
        if (this.chatPopup.style.display === 'none') {
            const msgText = (msg.text.length > 15) ? msg.text.substring(0, 15) + '...' : msg.text;
            this.displayAlert(`New message from ${msg.from_un}: ${msgText}.`, 3000);
            this.chatDot.style.display = 'block';
        }
    },

    /**
     * Adds a text message to the to the text message panel.
     * @param {string} msg The message text.
     * @param {string} status The 'from' display user name.
     * @param {string} whoClass Sender scope: self, other.
     */
    txtAddMsg: function(msg, status, whoClass) {
        if (whoClass !== 'self' && whoClass !== 'other') whoClass='other';
        const statusSpan = document.createElement('span');
        statusSpan.className = `status ${whoClass}`; // "self" | "other"
        statusSpan.textContent = status;
        this.msgList.appendChild(statusSpan);

        const msgSpan = document.createElement('span');
        msgSpan.className = `msg ${whoClass}`; // "self" | "other"
        const host = `https:\/\/${window.location.host.replace(/\./g, '\\.')}`;
        const pattern = `${host}\/[a-zA-Z0-9]*\/[a-zA-Z0-9]*(.*)*`; // permissive regex for a scene
        const regex = new RegExp(pattern);

        if (msg.match(regex) != null) {
            // no new tab if we have a link to an arena scene
            msg = msg.linkify({
                target: '_parent',
            });
        } else {
            msg = msg.linkify({
                target: '_blank',
            });
        }
        msgSpan.innerHTML = msg;
        this.msgList.appendChild(msgSpan);

        // scroll to bottom
        this.msgList.scrollTop = this.msgList.scrollHeight;
    },

    /**
     * Draw the contents of the Chat user list panel given its current state.
     * Adds a newUser if requested.
     * @param {Object} newUser The new user object to add.
     */
    populateUserList: function(newUser = undefined) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;

        this.usersList.textContent = '';
        const selVal = this.toSel.value;
        if (newUser) { // only update 'to' select for new users
            this.toSel.textContent = '';
            this.addToSelOptions();
        }

        const _this = this;
        const userList = [];
        let nSceneUsers = 1;
        let nTotalUsers = 1;
        Object.keys(this.liveUsers).forEach(function(key) {
            nTotalUsers++; // count all users
            if (_this.liveUsers[key].scene == _this.scene) nSceneUsers++; // only count users in the same scene
            userList.push({
                uid: key,
                sort_key: _this.liveUsers[key].scene == _this.scene ? 'aaa' : 'zzz',
                scene: _this.liveUsers[key].scene,
                un: _this.liveUsers[key].un,
                cid: _this.liveUsers[key].cid,
                type: _this.liveUsers[key].type,
                speaker: _this.liveUsers[key].speaker,
                stats: _this.liveUsers[key].stats,
                status: _this.liveUsers[key].status,
            });
        });

        userList.sort((a, b) => (`${a.sort_key}${a.scene}${a.un}`).localeCompare(`${b.sort_key}${b.scene}${b.un}`));

        this.nSceneUserslabel.textContent = nTotalUsers;
        this.usersDot.textContent = nSceneUsers < 100 ? nSceneUsers : '...';
        if (newUser) {
            let msg = '';
            if (newUser.type !== UserType.SCREENSHARE) {
                msg = `${newUser.un}${((newUser.type === UserType.EXTERNAL) ? ' (external)' : '')} joined.`;
            } else {
                msg = `${newUser.un} started screen sharing.`;
            }
            let alertType = 'info';
            if (newUser.type !== 'arena') alertType = 'warning';
            this.displayAlert(
                msg,
                5000,
                alertType,
            );
        }

        const uli = document.createElement('li');
        uli.textContent = `${this.username} (Me)`;
        if (this.isSpeaker) {
            uli.style.color = 'green';
        }
        _this.usersList.appendChild(uli);
        this.addJitsiStats(uli, this.stats, this.status, uli.textContent);
        const uBtnCtnr = document.createElement('div');
        uBtnCtnr.className = 'users-list-btn-ctnr';
        uli.appendChild(uBtnCtnr);

        const usspan = document.createElement('span');
        usspan.className = 'users-list-btn s';
        usspan.title = 'Mute User';
        uBtnCtnr.appendChild(usspan);
        // span click event (sound off)
        usspan.onclick = function() {
            // only mute
            if (this.arena.Jitsi.hasAudio) {
                const sideMenu = sceneEl.components['arena-side-menu-ui'];
                sideMenu.clickButton(sideMenu.buttons.AUDIO);
            }
        };

        // list users
        userList.forEach((user) => {
            const uli = document.createElement('li');
            const name = user.type !== UserType.SCREENSHARE ? user.un : `${user.un}\'s Screen Share`;
            if (user.speaker) {
                uli.style.color = 'green';
            }
            uli.textContent = `${((user.scene == _this.scene) ? '' : `${user.scene}/`)}${decodeURI(name)}${(user.type === UserType.EXTERNAL ? ' (external)' : '')}`;
            if (user.type !== UserType.SCREENSHARE) {
                const uBtnCtnr = document.createElement('div');
                uBtnCtnr.className = 'users-list-btn-ctnr';
                uli.appendChild(uBtnCtnr);

                const fuspan = document.createElement('span');
                fuspan.className = 'users-list-btn fu';
                fuspan.title = 'Find User';
                uBtnCtnr.appendChild(fuspan);

                // span click event (move us to be in front of another clicked user)
                const cid = user.cid;
                const scene = user.scene;
                fuspan.onclick = function() {
                    _this.moveToFrontOfCamera(cid, scene);
                };

                if (user.scene == _this.scene) {
                    const sspan = document.createElement('span');
                    sspan.className = 'users-list-btn s';
                    sspan.title = 'Mute User';
                    uBtnCtnr.appendChild(sspan);

                    // span click event (send sound on/off msg to ussr)
                    sspan.onclick = function() {
                        if (!_this.isUserAuthenticated(_this.cameraid)) {
                            _this.displayAlert('Anonymous users may not mute others.', 3000);
                            return;
                        }
                        // message to target user
                        _this.ctrlMsg(user.uid, 'sound:off');
                    };

                    // remove user to be rendered for scene editors only
                    if (_this.isSceneWriter) {
                        const kospan = document.createElement('span');
                        kospan.className = 'users-list-btn ko';
                        kospan.title = 'Remove User';
                        uBtnCtnr.appendChild(kospan);
                        kospan.onclick = function() {
                            Swal.fire({
                                title: 'Are you sure?',
                                text: `This will send an automatic logout request to ${decodeURI(user.un)}.`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Yes',
                                reverseButtons: true,
                            })
                                .then((result) => {
                                    if (result.isConfirmed) {
                                        _this.displayAlert(`Notifying ${decodeURI(user.un)} of removal.`, 5000);
                                        _this.ctrlMsg(user.uid, 'logout');
                                        // kick jitsi channel directly as well
                                        const warn = `You have been asked to leave by ${_this.username}.`;
                                        this.arena.Jitsi.kickout(user.uid, warn);
                                    }
                                });
                        };
                    }

                    if (user.type === UserType.EXTERNAL) uli.className = 'external';
                } else {
                    uli.className = 'oscene';
                }
                if (newUser) { // only update 'to' select for new users
                    const op = document.createElement('option');
                    op.value = user.uid;
                    op.textContent =
                        `to: ${decodeURI(user.un)}${(user.scene != _this.scene ? ` (${user.scene})` : '')}`;
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
     * @param {string} name The display name of the user
     */
    addJitsiStats: function(uli, stats, status, name) {
        if (!stats) return;
        const iconStats = document.createElement('i');
        iconStats.className = 'videoStats fa fa-signal';
        iconStats.style.color = (stats.conn ? this.arena.Jitsi.getConnectionColor(stats.conn.connectionQuality) : 'gray');
        iconStats.style.paddingLeft = '5px';
        uli.appendChild(iconStats);
        const spanStats = document.createElement('span');
        uli.appendChild(spanStats);
        // show current stats on hover/mouseover
        const _this = this;
        iconStats.onmouseover = function() {
            spanStats.textContent = (stats ? this.arena.Jitsi.getConnectionText(name, stats, status) : 'None');
            const offset_ul = $('.user-list').offset();
            const midpoint_w = offset_ul.left + ($('.user-list').width() / 2);
            const midpoint_h = offset_ul.top + ($('.user-list').height() / 2);
            const offset_sig = $(this).offset();
            const off_left = offset_sig.left < midpoint_w ? offset_sig.left : 0;
            const off_top = offset_sig.top < midpoint_h ? 10 : offset_ul.top - offset_sig.top;
            $(this).next('span').fadeIn(200).addClass('videoTextTooltip');
            $(this).next('span').css('left', off_left + 'px');
            $(this).next('span').css('top', off_top + 'px');
        };
        iconStats.onmouseleave = function() {
            $(this).next('span').fadeOut(200);
        };

        // show moderator info
        if (status && status.role == 'moderator'){
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
    addLandmark: function(lm) {
        const data = this.data;
        const el = this.el;

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
        lspan.onclick = function() {
            lm.teleportTo();
        };
        this.lmList.appendChild(uli);
        this.lmBtn.style.display = 'block';
    },

    /**
     * Remove a landmark from the landmarks list.
     * @param {Object} lm The landmark object.
     */
    removeLandmark: function(lm) {
        document.getElementById(`lmList_${lm.el.id}`).remove();
        if (this.lmList.childElementCount === 0) {
            this.lmBtn.style.display = 'none'; // hide landmarks button
        }
    },

    /**
     * Adds UI elements to select dropdown message destination.
     */
    addToSelOptions: function() {
        const data = this.data;
        const el = this.el;

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
     * @param {boolean} tryconnect True, to first try connecting to MQTT.
     */
    keepalive: function(tryconnect = false) {
        this.ctrlMsg('all', 'keepalive', tryconnect);
    },

    /**
     * Send a chat system control message for other users. Uses chat system topic structure
     * to send a private message.
     * @param {string} to Destination: all, scene, or the user id
     * @param {string} text Body of the message/command.
     * @param {boolean} tryconnect True, to first try connecting to MQTT.
     */
    ctrlMsg: function(to, text, tryconnect = false) {
        const data = this.data;
        const el = this.el;

        // re-establish connection, in case client disconnected
        if (tryconnect) this.connect();

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
            from_uid: this.userid,
            from_un: this.username,
            from_scene: this.scene,
            cameraid: this.cameraid,
            text: text,
        };
        // console.info('ctrl', msg, 'to', dstTopic);
        try {
            this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
        } catch (err) {
            console.error('chat-ctrl send failed:', err.message);
        }
    },

    /**
     * Removes orphaned Jitsi users from visible user list.
     * Is called periodically = keepalive_interval_ms * 3.
     */
    userCleanup: function() {
        const data = this.data;
        const el = this.el;

        const now = new Date().getTime();
        const _this = this;
        Object.keys(_this.liveUsers).forEach(function(key) {
            if (now - _this.liveUsers[key].ts > _this.keepalive_interval_ms && _this.liveUsers[key].type === UserType.ARENA) {
                delete _this.liveUsers[key];
            }
        });
    },

    /**
     * Uses Sweetalert library to popup a toast message.
     * @param {string} msg Text of the message.
     * @param {number} timeMs Duration of message in milliseconds.
     * @param {string} type Style of message: success, error, warning, info, question
     */
    displayAlert: function(msg, timeMs, type='info') {
        if (type !== 'info' && type !== 'success' && type !== 'error' && type !== 'warning' && type !== 'question') type = 'error';
        let backgroundColor=undefined;
        let iconColor=undefined;
        if (type == 'error') {
            iconColor='#616161';
            backgroundColor = '#ff9e9e';
        }
        if (type == 'warning') {
            iconColor='#616161';
            backgroundColor = '#f8bb86';
        }

        this.Alert.fire({
            icon: type,
            titleText: msg,
            timer: timeMs,
            iconColor: iconColor,
            background: backgroundColor,
        });
    },

    /**
     * Teleport method to move this user's camera to the front of another user's camera.
     * @param {string} cameraId Camera object id of the target user
     * @param {string} scene The scene name
     */
    moveToFrontOfCamera: function(cameraId, scene) {
        const data = this.data;
        const el = this.el;

        const sceneEl = el.sceneEl;
        const cameraEl = sceneEl.camera.el;

        // console.log('Move to near camera:', cameraId);

        if (scene !== this.scene) {
            localStorage.setItem('moveToFrontOfCamera', cameraId);
            const path = window.location.pathname.substring(1);
            let devPath = '';
            if (this.devInstance && path.length > 0) {
                try {
                    devPath = path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0];
                } catch (e) {
                    // no devPath
                }
            }
            const href = new URL(
                `${document.location.protocol}//${document.location.hostname}${(document.location.port) ? `:${document.location.port}`:''}/${devPath}${scene}`,
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
            cameraEl.object3D.position.z - toCam.object3D.position.z,
        );
    }
});
