/**
 * @fileoverview MQTT-based chat
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENA, Paho */

import * as Paho from 'paho-mqtt'; // https://www.npmjs.com/package/paho-mqtt
import {ARENAEventEmitter} from '../event-emitter.js';
import linkify from 'linkifyjs';
import linkifyStr from 'linkifyjs/string';
import Swal from 'sweetalert2';
import './style.css';
import {SideMenu} from '../icons/index.js';

let mqttc;

/**
 * Generate a UUID.
 * @return {string} The generated UUID string.
 */
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
}

/**
 * A class to manage an instance of the ARENA chat MQTT and GUI message system.
 */
export class ARENAChat {
    static userType = {
        EXTERNAL: 'external',
        SCREENSHARE: 'screenshare',
        ARENA: 'arena',
    };

    /**
     * ARENAChat constructor connects to MQTT and generates GUI.
     * @param {Object} st The Chat settings config object.
     */
    constructor(st) {
        // handle default this.settings
        st = st || {};
        this.settings = {
            userid: st.userid !== undefined ? st.userid : uuidv4(),
            cameraid: st.cameraid !== undefined ? st.cameraid : 'camera_auser',
            username: st.username !== undefined ? st.username : 'chat-dft-username',
            realm: st.realm !== undefined ? st.realm : 'realm',
            namespace: st.namespace !== undefined ? st.namespace : 'public',
            scene: st.scene !== undefined ? st.scene : 'render',
            persist_uri:
                st.persist_uri !== undefined ?
                    st.persist_uri :
                    `${location.protocol}//${location.hostname}${(location.port ? `:${location.port}` : '')}/persist/'`,
            keepalive_interval_ms: st.keepalive_interval_ms !== undefined ? st.keepalive_interval_ms : 30000,
            mqtt_host:
                st.mqtt_host !== undefined ?
                    st.mqtt_host :
                    `wss://${location.hostname}${(location.port ? `:${location.port}` : '')}/mqtt/`,
            mqtt_username: st.mqtt_username !== undefined ? st.mqtt_username : 'non_auth',
            mqtt_token: st.mqtt_token !== undefined ? st.mqtt_token : null,
            devInstance: st.devInstance !== undefined ? st.devInstance : false,
            isSceneWriter: st.isSceneWriter !== undefined ? st.isSceneWriter : false,
            isSpeaker: false,
            stats: undefined,
        };

        // users list
        this.liveUsers = [];

        // cleanup userlist periodically
        setInterval(this.userCleanup.bind(this), this.settings.keepalive_interval_ms * 3);

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
        this.settings.subscribePrivateTopic = `${this.settings.realm}/c/${this.settings.namespace}/p/${this.settings.userid}/#`;

        // receive open messages to everyone and/or scene (subscribe only)
        this.settings.subscribePublicTopic = `${this.settings.realm}/c/${this.settings.namespace}/o/#`;

        // send private messages to a user (publish only)
        this.settings.publishPrivateTopic = `${this.settings.realm}/c/${this.settings.namespace}/p/\{to_uid\}/${`${this.settings.userid}${btoa(this.settings.userid)}`}`;

        // send open messages (chat keepalive, messages to all/scene) (publish only)
        this.settings.publishPublicTopic = `${this.settings.realm}/c/${this.settings.namespace}/o/${`${this.settings.userid}${btoa(this.settings.userid)}`}`;

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
        const btnGroup = document.querySelector('.chat-button-group');
        btnGroup.parentElement.classList.remove('d-none');

        this.chatBtn = document.createElement('div');
        this.chatBtn.className = 'chat-button';
        this.chatBtn.setAttribute('title', 'Chat');
        this.chatBtn.style.backgroundImage = 'url(\'src/icons/images/message.png\')';
        btnGroup.appendChild(this.chatBtn);

        this.chatDot = document.createElement('span');
        this.chatDot.className = 'dot';
        this.chatDot.innerText = '...';
        this.chatBtn.appendChild(this.chatDot);

        this.usersBtn = document.createElement('div');
        this.usersBtn.className = 'users-button';
        this.usersBtn.setAttribute('title', 'User List');
        this.usersBtn.style.backgroundImage = 'url(\'src/icons/images/users.png\')';
        btnGroup.appendChild(this.usersBtn);

        this.usersDot = document.createElement('span');
        this.usersDot.className = 'dot';
        this.usersDot.innerText = '1';
        this.usersBtn.appendChild(this.usersDot);

        this.lmBtn = document.createElement('div');
        this.lmBtn.className = 'landmarks-button';
        this.lmBtn.style.backgroundImage = 'url(\'src/icons/images/landmarks.png\')';
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
        document.body.appendChild(this.usersPopup);

        this.closeUsersBtn = document.createElement('span');
        this.closeUsersBtn.className = 'close';
        this.closeUsersBtn.innerText = '×';
        this.usersPopup.appendChild(this.closeUsersBtn);

        if (this.settings.isSceneWriter) {
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
        };

        this.usersBtn.onclick = function() {
            _this.chatPopup.style.display = 'none';
            _this.usersPopup.style.display = 'block';
            _this.lmPopup.style.display = 'none';
            _this.populateUserList();
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
            _this.chatPopup.style.display = 'none';
            _this.usersPopup.style.display = 'none';
            _this.lmPopup.style.display = 'block';
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
            this.moveToFrontOfCamera(moveToCamera, this.settings.scene);
        }

        ARENA.events.on(ARENAEventEmitter.events.NEW_SETTINGS, (e) => {
            const args = e.detail;
            if (!args.userName) return; // only handle a user name change
            _this.settings.username = args.userName;
            _this.keepalive(); // let other users know
            _this.populateUserList();
        });

        ARENA.events.on(ARENAEventEmitter.events.JITSI_CONNECT, this.jitsiConnectCallback);
        ARENA.events.on(ARENAEventEmitter.events.USER_JOINED, this.userJoinCallback);
        ARENA.events.on(ARENAEventEmitter.events.SCREENSHARE, this.screenshareCallback);
        ARENA.events.on(ARENAEventEmitter.events.USER_LEFT, this.userLeftCallback);
        ARENA.events.on(ARENAEventEmitter.events.DOMINANT_SPEAKER, this.dominantSpeakerCallback);
        ARENA.events.on(ARENAEventEmitter.events.TALK_WHILE_MUTED, this.talkWhileMutedCallback);
        ARENA.events.on(ARENAEventEmitter.events.NOISY_MIC, this.noisyMicCallback);
        ARENA.events.on(ARENAEventEmitter.events.CONFERENCE_ERROR, this.conferenceErrorCallback);
        ARENA.events.on(ARENAEventEmitter.events.JITSI_STATS, this.jitsiStatsCallback);
    }

    /**
     * Called when we connect to a jitsi conference (including reconnects)
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiConnectCallback = (e) => {
        const args = e.detail;
        args.pl.forEach((user) => {
            // console.log('Jitsi User: ', user);
            // check if jitsi knows about someone we don't; add to user list
            if (!this.liveUsers[user.id]) {
                this.liveUsers[user.id] = {
                    un: user.dn,
                    scene: args.scene,
                    cid: user.cn,
                    ts: new Date().getTime(),
                    type: ARENAChat.userType.EXTERNAL, // indicate we only know about the user from jitsi
                };
                if (args.scene === this.settings.scene) this.populateUserList(this.liveUsers[user.id]);
                else this.populateUserList();
            }
        });
    };

    /**
     * Called when user joins
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    userJoinCallback = (e) => {
        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            const _this = this;
            this.liveUsers[user.id] = {
                un: user.dn,
                scene: user.scene,
                cid: user.cn,
                ts: new Date().getTime(),
                type: ARENAChat.userType.EXTERNAL, // indicate we only know about the users from jitsi
            };
            if (user.scene === this.settings.scene) this.populateUserList(this.liveUsers[user.id]);
            else this.populateUserList();
        }
    };

    /**
     * Called when a user screenshares
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    screenshareCallback = (e) => {
        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
        const user = e.detail;
        // check if jitsi knows about someone we don't; add to user list
        if (!this.liveUsers[user.id]) {
            const _this = this;
            this.liveUsers[user.id] = {
                un: user.dn,
                scene: user.scene,
                cid: user.cn,
                ts: new Date().getTime(),
                type: ARENAChat.userType.SCREENSHARE, // indicate we know the user is screensharing
            };
            if (user.scene === this.settings.scene) this.populateUserList(this.liveUsers[user.id]);
            else this.populateUserList();
        }
    };

    /**
     * Called when user leaves
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    userLeftCallback = (e) => {
        if (e.detail.src === ARENAEventEmitter.sources.CHAT) return; // ignore our events
        const user = e.detail;
        if (!this.liveUsers[user.id]) return;
        if (this.liveUsers[user.id].type === ARENAChat.userType.ARENA) return; // will be handled through mqtt messaging
        delete this.liveUsers[user.id];
        this.populateUserList();
    };

    /**
     * Called when dominant speaker changes.
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    dominantSpeakerCallback = (e) => {
        const user = e.detail;
        const roomName = this.settings.scene.toLowerCase().replace(/[!#$&'()*+,\/:;=?@[\]]/g, '_');
        if (user.scene === roomName) {
            // if speaker exists, show speaker graph in user list
            const speaker_id = user.id ? user.id : this.settings.userid; // or self is speaker
            if (this.liveUsers[speaker_id]) {
                this.liveUsers[speaker_id].speaker = true;
            }
            // if previous speaker exists, show speaker graph in user list
            if (this.liveUsers[user.pid]) {
                this.liveUsers[user.pid].speaker = false;
            }
            this.settings.isSpeaker = (speaker_id === this.settings.userid);
            this.populateUserList();
        }
    };

    /**
     * Called when user is talking on mute.
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    talkWhileMutedCallback = (e) => {
        this.displayAlert(`You are talking on mute.`, 2000, 'warning');
    };

    /**
     * Called when user's microphone is very noisy.
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    noisyMicCallback = (e) => {
        this.displayAlert(`Your microphone appears to be noisy.`, 2000, 'warning');
    };

    conferenceErrorCallback = (e) => {
        // display error to user
        const errorCode = e.detail.errorCode;
        const err = ARENA.health.getErrorDetails(errorCode);
        this.displayAlert(err.title, 5000, 'error');
    };

    /**
     * Called when Jitsi stats are updated.
     * Defined as a closure to capture 'this'
     * @param {Object} e event object; e.detail contains the callback arguments
     */
    jitsiStatsCallback = (e) => {
        const id = e.detail.id;
        const stats = e.detail.stats;
        console.warn('jitsiStatsCallback', id, stats)
        if (id === this.settings.userid) this.settings.stats = stats;
        if (!this.liveUsers[id]) return;
        this.liveUsers[id].stats = stats;
    };

    /**
     * Perform some async startup tasks.
     * @param {boolean} force True to force the startup.
     */
    async start(force = false) {
        // connect mqtt
        await this.connect();
    }

    /**
     * Getter to return the active user list state.
     * @return {[Object]} The list of active users.
     */
    getUserList() {
        return this.liveUsers;
    }

    /**
     * Connect to the MQTT broker and subscribe.
     * @param {boolean} force True to force the connection.
     */
    async connect(force = false) {
        if (this.connected == true && force == false) return;
        this.mqttc = new Paho.Client(this.settings.mqtt_host, `chat-${this.settings.userid}`);

        const _this = this; /* save reference to class instance */
        const msg = {
            object_id: uuidv4(),
            type: 'chat-ctrl',
            to_uid: 'all',
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            text: 'left',
        };
        const willMessage = new Paho.Message(JSON.stringify(msg));
        willMessage.destinationName = this.settings.publishPublicTopic;
        this.mqttc.connect({
            onSuccess: () => {
                ARENA.health.removeError('mqttChat.connection');
                console.info(
                    'Chat connected. Subscribing to:',
                    this.settings.subscribePublicTopic,
                    ';',
                    this.settings.subscribePrivateTopic,
                );
                this.mqttc.subscribe(this.settings.subscribePublicTopic);
                this.mqttc.subscribe(this.settings.subscribePrivateTopic);

                /* bind callback to _this, so it can access the class instance */
                this.mqttc.onConnectionLost = this.onConnectionLost.bind(_this);
                this.mqttc.onMessageArrived = this.onMessageArrived.bind(_this);

                // say hello to everyone
                this.keepalive(false);

                // periodically send a keep alive
                if (this.keepaliveInterval != undefined) clearInterval(this.keepaliveInterval);
                this.keepaliveInterval = setInterval(function() {
                    _this.keepalive(true);
                }, this.settings.keepalive_interval_ms);

                this.connected = true;
            },
            onFailure: () => {
                ARENA.health.addError('mqttChat.connection');
                console.error('Chat failed to connect.');
                this.connected = false;
            },
            willMessage: willMessage,
            userName: this.settings.mqtt_username,
            password: this.settings.mqtt_token,
        });
    }

    /**
     * Chat MQTT connection lost handler.
     * @param {Object} message Broker message.
     */
    onConnectionLost(message) {
        ARENA.health.addError('mqttChat.connection');
        console.error('Chat disconnect.');
        this.connected = false;
    }

    /**
     * Utility to know if the user has been authenticated.
     * @param {string} cameraId The user camera id.
     * @return {boolean} True if non-anonymous.
     */
    isUserAuthenticated(cameraId) {
        return !cameraId.includes('anonymous');
    }

    /**
     * Method to publish outgoing chat messages, gathers destination from UI.
     * @param {*} msgTxt The message text.
     */
    sendMsg(msgTxt) {
        const msg = {
            object_id: uuidv4(),
            type: 'chat',
            to_uid: this.toSel.value,
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            from_desc: `${decodeURI(this.settings.username)} (${this.toSel.options[this.toSel.selectedIndex].text}) ${new Date().toLocaleTimeString()}`,
            cameraid: this.settings.cameraid,
            text: msgTxt,
        };
        const dstTopic =
            this.toSel.value == 'scene' || this.toSel.value == 'all' ?
                this.settings.publishPublicTopic :
                this.settings.publishPrivateTopic.replace('{to_uid}', this.toSel.value);
        // console.log("sending", msg, "to", dstTopic);
        this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
        this.txtAddMsg(msg.text, msg.from_desc, 'self');
    }

    /**
     * Handler for incoming subscription chat messages.
     * @param {Object} mqttMsg The MQTT Paho message object.
     */
    onMessageArrived(mqttMsg) {
        // console.log("Received:", mqttMsg);
        let msg;
        try {
            msg = JSON.parse(mqttMsg.payloadString);
        } catch (err) {
            console.error('Error parsing chat msg.');
            return;
        }

        // ignore invalid and our own messages
        if (msg.from_uid == undefined) return;
        if (msg.to_uid == undefined) return;
        if (msg.from_uid == this.settings.userid) return;

        // ignore spoofed messages
        if (
            !mqttMsg.destinationName ===
            `${this.settings.realm}${ARENAChat.PRIVATE_TOPIC_PREFIX}${this.settings.userid}/${msg.from_uid}${btoa(msg.from_uid)}`
        ) {
            if (
                !mqttMsg.destinationName ===
                `${this.settings.realm}${ARENAChat.PUBLIC_TOPIC_PREFIX}${msg.from_uid}${btoa(msg.from_uid)}`
            ) {
                return;
            }
        }

        // save user data and timestamp
        if (this.liveUsers[msg.from_uid] == undefined && msg.from_un !== undefined && msg.from_scene !== undefined) {
            this.liveUsers[msg.from_uid] = {
                un: msg.from_un,
                scene: msg.from_scene,
                cid: msg.cameraid,
                ts: new Date().getTime(),
                type: ARENAChat.userType.ARENA,
            };
            if (msg.from_scene === this.settings.scene) this.populateUserList(this.liveUsers[msg.from_uid]);
            else this.populateUserList();
            this.keepalive(); // let this user know about us
        } else if (msg.from_un !== undefined && msg.from_scene !== undefined) {
            this.liveUsers[msg.from_uid].un = msg.from_un;
            this.liveUsers[msg.from_uid].scene = msg.from_scene;
            this.liveUsers[msg.from_uid].cid = msg.cameraid;
            this.liveUsers[msg.from_uid].ts = new Date().getTime();
            this.liveUsers[msg.from_uid].type = ARENAChat.userType.ARENA;
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
                // console.log("muteAudio", ARENA.Jitsi.hasAudio);
                // only mute
                if (ARENA.Jitsi.hasAudio) {
                    SideMenu.clickButton(SideMenu.buttons.AUDIO);
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
        if (msg.to_uid !== this.settings.userid && msg.to_uid !== 'all' && msg.to_uid !== 'scene') return;

        // drop messages to scenes different from our scene
        if (msg.to_uid === 'scene' && msg.from_scene != this.settings.scene) return;

        this.txtAddMsg(msg.text, msg.from_desc, 'other');

        this.unreadMsgs++;
        this.chatDot.textContent = this.unreadMsgs < 100 ? this.unreadMsgs : '...';

        // check if chat is visible
        if (this.chatPopup.style.display == 'none') {
            const msgText = (msg.text.length > 15) ? msg.text.substring(0, 15) + '...' : msg.text;
            this.displayAlert(`New message from ${msg.from_un}: ${msgText}.`, 3000);
            this.chatDot.style.display = 'block';
        }
    }

    /**
     * Adds a text message to the to the text message panel.
     * @param {string} msg The message text.
     * @param {string} status The 'from' display user name.
     * @param {string} whoClass Sender scope: self, other.
     */
    txtAddMsg(msg, status, whoClass) {
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
    }

    /**
     * Draw the contents of the Chat user list panel given its current state.
     * Adds a newUser if requested.
     * @param {Object} newUser The new user object to add.
     */
    populateUserList(newUser = undefined) {
        this.usersList.textContent = '';
        const selVal = this.toSel.value;
        this.toSel.textContent = '';
        this.addToSelOptions();

        const _this = this;
        const userList = [];
        let nSceneUsers = 1;
        let nTotalUsers = 1;
        Object.keys(this.liveUsers).forEach(function(key) {
            nTotalUsers++; // count all users
            if (_this.liveUsers[key].scene == _this.settings.scene) nSceneUsers++; // only count users in the same scene
            userList.push({
                uid: key,
                sort_key: _this.liveUsers[key].scene == _this.settings.scene ? 'aaa' : 'zzz',
                scene: _this.liveUsers[key].scene,
                un: _this.liveUsers[key].un,
                cid: _this.liveUsers[key].cid,
                type: _this.liveUsers[key].type,
                speaker: _this.liveUsers[key].speaker,
            });
        });

        userList.sort((a, b) => (`${a.sort_key}${a.scene}${a.un}`).localeCompare(`${b.sort_key}${b.scene}${b.un}`));

        this.nSceneUserslabel.textContent = nTotalUsers;
        this.usersDot.textContent = nSceneUsers < 100 ? nSceneUsers : '...';
        if (newUser) {
            let msg = '';
            if (newUser.type !== ARENAChat.userType.SCREENSHARE) {
                msg = `${newUser.un}${((newUser.type === ARENAChat.userType.EXTERNAL) ? ' (external)' : '')} joined.`;
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
        uli.textContent = `${this.settings.username} (Me)`;
        if (this.settings.isSpeaker) {
            uli.style.color = 'green';
        }
        _this.usersList.appendChild(uli);
        this.addJitsiStats(uli, this.settings.stats, uli.textContent);
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
            if (ARENA.Jitsi.hasAudio) {
                SideMenu.clickButton(SideMenu.buttons.AUDIO);
            }
        };

        // list users
        userList.forEach((user) => {
            const uli = document.createElement('li');
            const name = user.type !== ARENAChat.userType.SCREENSHARE ? user.un : `${user.un}\'s Screen Share`;
            if (user.speaker) {
                uli.style.color = 'green';
            }
            uli.textContent = `${((user.scene == _this.settings.scene) ? '' : `${user.scene}/`)}${decodeURI(name)}${(user.type === ARENAChat.userType.EXTERNAL ? ' (external)' : '')}`;
            this.addJitsiStats(uli, user.stats, uli.textContent);
            if (user.type !== ARENAChat.userType.SCREENSHARE) {
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

                if (user.scene == _this.settings.scene) {
                    const sspan = document.createElement('span');
                    sspan.className = 'users-list-btn s';
                    sspan.title = 'Mute User';
                    uBtnCtnr.appendChild(sspan);

                    // span click event (send sound on/off msg to ussr)
                    sspan.onclick = function() {
                        if (!_this.isUserAuthenticated(_this.settings.cameraid)) {
                            _this.displayAlert('Anonymous users may not mute others.', 3000);
                            return;
                        }
                        // message to target user
                        _this.ctrlMsg(user.uid, 'sound:off');
                    };

                    // remove user to be rendered for scene editors only
                    if (_this.settings.isSceneWriter) {
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
                                        const warn = `You have been asked to leave by ${_this.settings.username}.`;
                                        ARENA.Jitsi.kickout(user.uid, warn);
                                    }
                                });
                        };
                    }

                    if (user.type === ARENAChat.userType.EXTERNAL) uli.className = 'external';
                } else {
                    uli.className = 'oscene';
                }
                const op = document.createElement('option');
                op.value = user.uid;
                op.textContent =
                    `to: ${decodeURI(user.un)}${(user.scene != _this.settings.scene ? ` (${user.scene})` : '')}`;
                _this.toSel.appendChild(op);
            }
            _this.usersList.appendChild(uli);
        });
        this.toSel.value = selVal; // preserve selected value
    }

    /**
     *
     * @param {*} uli
     * @param {*} stats
     * @param {*} name
     */
    addJitsiStats(uli, stats, name) {
        const _this = this;
        const iconStats = document.createElement('i');
        iconStats.className = 'videoStats fa fa-signal';
        iconStats.style.color = (stats ? this.getConnectionColor(stats.connectionQuality) : 'gray');
        iconStats.style.paddingLeft = '5px';
        uli.appendChild(iconStats);
        const spanStats = document.createElement('span');
        uli.appendChild(spanStats);

        iconStats.onmouseover = function() {
            // TODO: format text from stats
            spanStats.textContent = (stats ? _this.getConnectionText(name, stats) : 'None');
            console.warn('stats', stats)
            const offset = $(this).offset();
            console.warn('offset', offset)
            $(this).next('span').fadeIn(200).addClass('videoTextTooltip');
            $(this).next('span').css('left', offset.left + 'px');
        };
        iconStats.onmouseleave = function() {
            $(this).next('span').fadeOut(200);
        };
    }

    /**
     *
     * @param {*} quality
     * @returns
     */
     getConnectionColor(quality) {
        if (quality > 67) {
            return 'green';
        } else if (quality > 33) {
            return 'orange';
        } else if (quality > 0) {
            return 'yellow';
        } else {
            return 'red';
        }
    }

    /**
     *
     * @param {*} name
     * @param {*} stats
     * @returns
     */
    getConnectionText(name, stats) {
        const lines = [];
        lines.push(`${name}`);
        lines.push(`quality: ${stats.connectionQuality}%`);
        lines.push(`resolution: ${this._extractResolutionString(stats)}`);
        lines.push(`bitrate: ${stats.bitrate.upload} up, ${stats.bitrate.download} dn`);
        lines.push(`br audio: ${stats.bitrate.audio.upload} up, ${stats.bitrate.audio.download} dn`);
        lines.push(`br video: ${stats.bitrate.video.upload} up, ${stats.bitrate.video.download} dn`);
        return lines.join('\r\n');
    }

    // https://github.com/jitsi/jitsi-meet/blob/master/react/features/video-menu/components/native/ConnectionStatusComponent.js#L281
    /**
     * Extracts the resolution and framerate.
     *
     * @param {Object} stats - Connection stats from the library.
     * @private
     * @returns {string}
     */
    _extractResolutionString(stats) {
        const {
            framerate,
            resolution,
        } = stats;

        const resolutionString = Object.keys(resolution || {})
            .map((ssrc) => {
                const {
                    width,
                    height,
                } = resolution[ssrc];

                return `${width}x${height}`;
            })
            .join(', ') || null;

        const frameRateString = Object.keys(framerate || {})
            .map((ssrc) => framerate[ssrc])
            .join(', ') || null;

        return resolutionString && frameRateString ? `${resolutionString}@${frameRateString}fps` : undefined;
    }

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
        lspan.onclick = function() {
            lm.teleportTo();
        };
        this.lmList.appendChild(uli);
        this.lmBtn.style.display = 'block';
    }

    /**
     * Remove a landmark from the landmarks list.
     * @param {Object} lm The landmark object.
     */
    removeLandmark(lm) {
        document.getElementById(`lmList_${lm.el.id}`).remove();
        if (this.lmList.childElementCount === 0) {
            this.lmBtn.style.display = 'none'; // hide landmarks button
        }
    }

    /**
     * Adds UI elements to select dropdown message destination.
     */
    addToSelOptions() {
        let op = document.createElement('option');
        op.value = 'scene';
        op.textContent = `to: scene ${this.settings.scene}`;
        this.toSel.appendChild(op);

        op = document.createElement('option');
        op.value = 'all';
        op.textContent = 'to: namespace';
        this.toSel.appendChild(op);
    }

    /**
     * Send a chat system keepalive control message.
     * @param {boolean} tryconnect True, to first try connecting to MQTT.
     */
    keepalive(tryconnect = false) {
        this.ctrlMsg('all', 'keepalive', tryconnect);
    }

    /**
     * Send a chat system control message for other users. Uses chat system topic structure
     * to send a private message.
     * @param {string} to Destination: all, scene, or the user id
     * @param {string} text Body of the message/command.
     * @param {boolean} tryconnect True, to first try connecting to MQTT.
     */
    ctrlMsg(to, text, tryconnect = false) {
        // re-establish connection, in case client disconnected
        if (tryconnect) this.connect();

        let dstTopic;
        if (to === 'all' || to === 'scene') {
            dstTopic = this.settings.publishPublicTopic; // public messages
        } else {
            // replace '{to_uid}' for the 'to' value
            dstTopic = this.settings.publishPrivateTopic.replace('{to_uid}', to);
        }
        const msg = {
            object_id: uuidv4(),
            type: 'chat-ctrl',
            to_uid: to,
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            cameraid: this.settings.cameraid,
            text: text,
        };
        // console.info("ctrl", msg, "to", dstTopic);
        this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
    }

    /**
     * Removes orphaned Jitsi users from visible user list.
     * Is called periodically = keepalive_interval_ms * 3.
     */
    userCleanup() {
        const now = new Date().getTime();
        const _this = this;
        Object.keys(_this.liveUsers).forEach(function(key) {
            if (now - _this.liveUsers[key].ts > _this.settings.keepalive_interval_ms && _this.liveUsers[key].type === ARENAChat.userType.ARENA) {
                delete _this.liveUsers[key];
            }
        });
    }

    /**
     * Uses Sweetalert library to popup a toast message.
     * @param {string} msg Text of the message.
     * @param {number} timeMs Duration of message in milliseconds.
     * @param {string} type Style of message: success, error, warning, info, question
     */
    displayAlert(msg, timeMs, type='info') {
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
    }

    /**
     * Teleport method to move this user's camera to the front of another user's camera.
     * @param {string} cameraId Camera object id of the target user
     * @param {string} scene The scene name
     */
    moveToFrontOfCamera(cameraId, scene) {
        // console.log("Move to near camera:", cameraId);

        if (scene !== this.settings.scene) {
            localStorage.setItem('moveToFrontOfCamera', cameraId);
            const path = window.location.pathname.substring(1);
            let devPath = '';
            if (this.settings.devInstance && path.length > 0) {
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

        const sceneEl = document.querySelector('a-scene');
        if (!sceneEl) {
            console.error('Could not find aframe scene');
            return;
        }

        const toCam = sceneEl.querySelector(`[id="${cameraId}"]`);

        if (!toCam) {
            // TODO: find a better way to do this
            // when we jump to a scene, the "to" user needs to move for us to be able to find his camera
            console.error('Could not find destination user camera', cameraId);
            return;
        }

        const myCamera = document.getElementById('my-camera');

        if (!myCamera) {
            console.error('Could not find our camera');
            return;
        }

        const direction = new THREE.Vector3();
        toCam.object3D.getWorldDirection(direction);
        const distance = ARENA.userTeleportDistance ? ARENA.userTeleportDistance : 2; // distance to put you
        myCamera.object3D.position.copy(toCam.object3D.position.clone()).add(direction.multiplyScalar(-distance));
        myCamera.object3D.position.y = toCam.object3D.position.y;
        // Reset navMesh data
        myCamera.components['wasd-controls'].resetNav();
        myCamera.components['press-and-move'].resetNav();
        // rotate our camera to face the other user
        myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2(
            myCamera.object3D.position.x - toCam.object3D.position.x,
            myCamera.object3D.position.z - toCam.object3D.position.z,
        );
    }
}
