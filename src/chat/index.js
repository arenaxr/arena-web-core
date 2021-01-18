/**
 * @fileoverview MQTT-based chat
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENA, Paho */

import * as Paho from 'paho-mqtt'; //https://www.npmjs.com/package/paho-mqtt
import {ARENAEventEmitter} from '../event-emitter.js';
import linkify from 'linkifyjs';
import linkifyStr from 'linkifyjs/string';
import Swal from 'sweetalert2';
import './style.css';

var mqttc;
// generate an uuid
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}

export class ARENAChat {
    static PUBLIC_TOPIC_PREFIX = '/g/c/o/';
    static PRIVATE_TOPIC_PREFIX = '/g/c/p/';

    static userType = {
        EXTERNAL: 'external',
        SCREENSHARE: 'screenshare',
        ARENA: 'arena'
    };

    constructor(st) {
        // handle default this.settings
        st = st || {};
        this.settings = {
            userid: st.userid !== undefined ? st.userid : uuidv4(),
            cameraid: st.cameraid !== undefined ? st.cameraid : 'camera_auser',
            username: st.username !== undefined ? st.username : 'chat-dft-username',
            realm: st.realm !== undefined ? st.realm : 'realm',
            scene: st.scene !== undefined ? st.scene : 'render',
            persist_uri:
                st.persist_uri !== undefined
                    ? st.persist_uri
                    : location.protocol +
                      '//' +
                      location.hostname +
                      (location.port ? ':' + location.port : '') +
                      '/persist/',
            keepalive_interval_ms: st.keepalive_interval_ms !== undefined ? st.keepalive_interval_ms : 30000,
            mqtt_host:
                st.mqtt_host !== undefined
                    ? st.mqtt_host
                    : 'wss://' + location.hostname + (location.port ? ':' + location.port : '') + '/mqtt/',
            mqtt_username: st.mqtt_username !== undefined ? st.mqtt_username : 'non_auth',
            mqtt_token: st.mqtt_token !== undefined ? st.mqtt_token : null,
            supportDevFolders: st.supportDevFolders !== undefined ? st.supportDevFolders : false,
        };

        // users list
        this.liveUsers = [];

        // cleanup userlist periodically
        setInterval(this.userCleanup.bind(this), this.settings.keepalive_interval_ms * 3);

        /*
	    Clients listen for chat messages on:
				- global public (*o*pen) topic (gtopic; realm/g/c/o/#)
				- a user (*p*rivate) topic (utopic; realm/g/c/p/userhandle/#)

		  Clients write always to a topic with its own userhandle:
  		   - a topic for each user for private messages (ugtopic; realm/g/c/p/[other-cameraid]/userhandle)
				 - a global topic (ugtopic; realm/g/c/o/userhandle);

		    where userhandle = cameraid + btoa(cameraid)

			Note: topic must always end with userhandle and match from_un in the message (check on client at receive, and/or on publish at pubsub server)
			Note: scene-only messages are sent to public topic and filtered at the client

			Summary of topics/permissions:
			 subscribePrivateTopic  - receive private messages (realm/g/c/p/cameraid/#): Read
			 subscribePublicTopic  - receive open messages to everyone and/or scene (realm/g/c/o/#): Read
			 publishPrivateTopic - send private messages to a user (realm/g/c/p/[regex-matching-any-cameraid]/userhandle): Write
			 publishPublicTopic - send open messages (chat keepalive, messages to all/scene) (realm/g/c/o/userhandle): Write
	    */

        // receive private messages  (subscribe only)
        this.settings.subscribePrivateTopic =
            this.settings.realm + ARENAChat.PRIVATE_TOPIC_PREFIX + this.settings.userid + '/#';

        // receive open messages to everyone and/or scene (subscribe only)
        this.settings.subscribePublicTopic = this.settings.realm + ARENAChat.PUBLIC_TOPIC_PREFIX + '#';

        // send private messages to a user (publish only)
        this.settings.publishPrivateTopic =
            this.settings.realm +
            ARENAChat.PRIVATE_TOPIC_PREFIX +
            '{to_uid}/' +
            this.settings.userid +
            btoa(this.settings.userid);

        // send open messages (chat keepalive, messages to all/scene) (publish only)
        this.settings.publishPublicTopic =
            this.settings.realm + ARENAChat.PUBLIC_TOPIC_PREFIX + this.settings.userid + btoa(this.settings.userid);

        // counter for unread msgs
        this.unreadMsgs = 0;

        this.alertBox = document.createElement('div');
        this.alertBox.className = 'chat-alert-box';
        this.alertBox.innerHTML = '';
        document.body.appendChild(this.alertBox);

        let btnGroup = document.createElement('div');
        btnGroup.className = 'chat-button-group';
        document.body.appendChild(btnGroup);

        this.chatBtn = document.createElement('div');
        this.chatBtn.className = 'chat-button';
        this.chatBtn.setAttribute('title', 'Chat');
        btnGroup.appendChild(this.chatBtn);

        this.chatDot = document.createElement('span');
        this.chatDot.className = 'dot';
        this.chatDot.innerHTML = '...';
        this.chatBtn.appendChild(this.chatDot);

        this.usersBtn = document.createElement('div');
        this.usersBtn.className = 'users-button';
        this.usersBtn.setAttribute('title', 'User List');
        btnGroup.appendChild(this.usersBtn);

        this.usersDot = document.createElement('span');
        this.usersDot.className = 'dot';
        this.usersDot.innerHTML = '1';
        this.usersBtn.appendChild(this.usersDot);

        this.lmBtn = document.createElement('div');
        this.lmBtn.className = 'landmarks-button';
        btnGroup.appendChild(this.lmBtn);

        // chat
        this.chatPopup = document.createElement('div');
        this.chatPopup.className = 'chat-popup';
        this.chatPopup.style.display = 'none';
        document.body.appendChild(this.chatPopup);

        this.closeChatBtn = document.createElement('span');
        this.closeChatBtn.className = 'close';
        this.closeChatBtn.innerHTML = '×';
        this.chatPopup.appendChild(this.closeChatBtn);

        this.msgList = document.createElement('div');
        this.msgList.className = 'message-list';
        this.chatPopup.appendChild(this.msgList);

        let formDiv = document.createElement('div');
        formDiv.className = 'form-container';
        this.chatPopup.appendChild(formDiv);

        this.msgTxt = document.createElement('textarea');
        this.msgTxt.setAttribute('rows', '1');
        this.msgTxt.setAttribute('placeholder', 'Type message..');
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
        this.closeUsersBtn.innerHTML = '×';
        this.usersPopup.appendChild(this.closeUsersBtn);

        let muteAllDiv = document.createElement('div');
        muteAllDiv.className = 'mute-all';
        this.usersPopup.appendChild(muteAllDiv);

        this.silenceAllBtn = document.createElement('span');
        this.silenceAllBtn.className = 'users-list-btn ma';
        this.silenceAllBtn.title = 'Silence (Mute Everyone)';
        muteAllDiv.appendChild(this.silenceAllBtn);

        let label = document.createElement('span');
        label.innerHTML = '<br/><br/>&nbsp';
        label.style.fontSize = 'small';
        this.usersPopup.appendChild(label);

        this.nSceneUserslabel = document.createElement('span');
        this.nSceneUserslabel.style.fontSize = 'small';
        this.usersPopup.appendChild(this.nSceneUserslabel);

        label = document.createElement('span');
        label.innerHTML = ' Users (buttons allow to find and mute users):';
        label.style.fontSize = 'small';
        this.usersPopup.appendChild(label);

        let userDiv = document.createElement('div');
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
        label.innerHTML = '<br/><br/>&nbspLandmarks (buttons allow to find landmarks):';
        label.style.fontSize = 'small';
        this.lmPopup.appendChild(label);

        let lmDiv = document.createElement('div');
        lmDiv.className = 'user-list';
        this.lmPopup.appendChild(lmDiv);

        this.lmList = document.createElement('ul');
        lmDiv.appendChild(this.lmList);

        var _this = this;

        this.displayAlert('Not sending audio or video. Use icons on the right to start.', 5000);

        this.chatBtn.onclick = function () {
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

        this.usersBtn.onclick = function () {
            _this.chatPopup.style.display = 'none';
            _this.usersPopup.style.display = 'block';
            _this.lmPopup.style.display = 'none';
            _this.populateUserList();
        };

        this.closeChatBtn.onclick = function () {
            _this.chatPopup.style.display = 'none';
        };

        this.closeUsersBtn.onclick = function () {
            _this.usersPopup.style.display = 'none';
        };

        this.msgBtn.onclick = function () {
            if (_this.msgTxt.value.length > 0) _this.sendMsg(_this.msgTxt.value);
            _this.msgTxt.value = '';
        };

        this.lmBtn.onclick = function () {
            _this.chatPopup.style.display = 'none';
            _this.usersPopup.style.display = 'none';
            _this.lmPopup.style.display = 'block';
        };

        this.closeLmBtn.onclick = function () {
            _this.lmPopup.style.display = 'none';
        };

        this.msgTxt.addEventListener('keyup', function (event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                if (_this.msgTxt.value.length > 1) _this.sendMsg(_this.msgTxt.value);
                _this.msgTxt.value = '';
            }
        });

        // send sound on/off msg to all
        this.silenceAllBtn.onclick = function () {
            if (!_this.isUserAuthenticated(_this.settings.cameraid)) {
                _this.displayAlert('Anonymous users may not mute others.', 3000);
                return;
            }

            Swal.fire({
                title: 'Are you sure?',
                text: 'This will send a mute request to all users.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
            })
                .then((result) => {
                    if (result.isConfirmed) {
                        // send to all scene topic
                        _this.ctrlMsg('scene', 'sound:off');
                    }
                });
        };

        // check if we jumped to a different scene from a "teleport"
        const moveToCamera = localStorage.getItem('moveToFrontOfCamera');
        if (moveToCamera !== null) {
            localStorage.removeItem('moveToFrontOfCamera');
            this.moveToFrontOfCamera(moveToCamera, this.settings.scene);
        }

        ARENA.events.on(ARENAEventEmitter.events.NEW_SETTINGS, (e) => {
            const args = e.detail;   
            if (!args.userName) return // only handle a user name change
            _this.settings.username = args.userName;
            _this.keepalive(); // let other users know
            _this.populateUserList();
        });

        ARENA.events.on(ARENAEventEmitter.events.JITSI_CONNECT, this.jitsiConnectCallback);
        ARENA.events.on(ARENAEventEmitter.events.USER_JOINED, this.userJoinCallback);
        ARENA.events.on(ARENAEventEmitter.events.SCREENSHARE, this.screenshareCallback);
        ARENA.events.on(ARENAEventEmitter.events.USER_LEFT, this.userLeftCallback);
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
            let _this = this;
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
            let _this = this;
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

    // perform some async startup tasks
    async start(force = false) {
        // connect mqtt
        this.connect();

        // populate landmark list
        this.populateLandmarkList();
    }

    getUserList() {
        return this.liveUsers;
    }

    async connect(force = false) {
        if (this.connected == true && force == false) return;
        this.mqttc = new Paho.Client(this.settings.mqtt_host, 'chat-' + this.settings.userid);

        var _this = this; /* save reference to class instance */
        let msg = {
            object_id: uuidv4(),
            type: 'chat-ctrl',
            to_uid: 'all',
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            text: 'left',
        };
        let willMessage = new Paho.Message(JSON.stringify(msg));
        willMessage.destinationName = this.settings.publishPublicTopic;
        this.mqttc.connect({
            onSuccess: () => {
                console.info(
                    'Chat connected. Subscribing to:',
                    this.settings.subscribePublicTopic,
                    ';',
                    this.settings.subscribePrivateTopic
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
                this.keepaliveInterval = setInterval(function () {
                    _this.keepalive(true);
                }, this.settings.keepalive_interval_ms);

                this.connected = true;
            },
            onFailure: () => {
                console.error('Chat failed to connect.');
                this.connected = false;
            },
            willMessage: willMessage,
            userName: this.settings.mqtt_username,
            password: this.settings.mqtt_token,
        });
    }

    onConnectionLost(message) {
        console.error('Chat disconnect.');
        this.connected = false;
    }

    isUserAuthenticated(cameraId) {
        return !cameraId.includes('anonymous');
    }

    sendMsg(msgTxt) {
        let msg = {
            object_id: uuidv4(),
            type: 'chat',
            to_uid: this.toSel.value,
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            from_desc:
                decodeURI(this.settings.username) +
                ' (' +
                this.toSel.options[this.toSel.selectedIndex].text +
                ') ' +
                new Date().toLocaleTimeString(),
            cameraid: this.settings.cameraid,
            text: msgTxt,
        };
        let dstTopic =
            this.toSel.value == 'scene' || this.toSel.value == 'all'
                ? this.settings.publishPublicTopic
                : this.settings.publishPrivateTopic.replace('{to_uid}', this.toSel.value);
        //console.log("sending", msg, "to", dstTopic);
        this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
        this.txtAddMsg(msg.text, msg.from_desc, 'self');
    }

    onMessageArrived(mqttMsg) {
        //console.log("Received:", mqttMsg);
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
            this.settings.realm +
                ARENAChat.PRIVATE_TOPIC_PREFIX +
                this.settings.userid +
                '/' +
                msg.from_uid +
                btoa(msg.from_uid)
        )
            if (
                !mqttMsg.destinationName ===
                this.settings.realm + ARENAChat.PUBLIC_TOPIC_PREFIX + msg.from_uid + btoa(msg.from_uid)
            )
                return;

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
                //console.log("muteAudio");
                let abtn = document.getElementById('btn-audio-off');
                if (abtn == undefined) {
                    console.error('Could not find audio button');
                    return;
                }
                if (abtn.style.backgroundImage.includes('audio-on.png') == true) {
                    abtn.click();
                    this.displayAlert('Sound muted. Requested by ' + msg.from_un + '.', 3000);
                }
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
        this.chatDot.innerHTML = this.unreadMsgs < 100 ? this.unreadMsgs : '...';

        // check if chat is visible
        if (this.chatPopup.style.display == 'none') {
            this.chatDot.style.display = 'block';
        }
    }

    txtAddMsg(msg, status, whoClass) {
        let statusSpan = document.createElement('span');
        statusSpan.className = 'status ' + whoClass; // "self" | "other"
        statusSpan.innerHTML = status;
        this.msgList.appendChild(statusSpan);

        let msgSpan = document.createElement('span');
        msgSpan.className = 'msg ' + whoClass; // "self" | "other"
        let host = window.location.host.replace('.', '\\.');
        let pattern = `${host}(.*scene=.*|\\/\n|\\/$)`;
        let regex = new RegExp(pattern);

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

    populateUserList(newUser = undefined) {
        this.usersList.innerHTML = '';
        let selVal = this.toSel.value;
        this.toSel.innerHTML = '';
        this.addToSelOptions();

        let _this = this;
        let userList = [];
        let nSceneUsers = 1;
        let nTotalUsers = 1;
        Object.keys(this.liveUsers).forEach(function (key) {
            nTotalUsers++; // count all users
            if (_this.liveUsers[key].scene == _this.settings.scene) nSceneUsers++; // only count users in the same scene
            userList.push({
                uid: key,
                sort_key: _this.liveUsers[key].scene == _this.settings.scene ? 'aaa' : 'zzz',
                scene: _this.liveUsers[key].scene,
                un: _this.liveUsers[key].un,
                cid: _this.liveUsers[key].cid,
                type: _this.liveUsers[key].type,
            });
        });

        userList.sort((a, b) => ('' + a.sort_key + a.scene + a.un).localeCompare(b.sort_key + b.scene + b.un));

        this.nSceneUserslabel.innerHTML = nTotalUsers;
        this.usersDot.innerHTML = nSceneUsers < 100 ? nSceneUsers : '...';
        if (newUser) {
            var msg = "";
            if (newUser.type !== ARENAChat.userType.SCREENSHARE) {
                msg = newUser.un + ((newUser.type === ARENAChat.userType.EXTERNAL) ? ' (external)' : '') + ' joined.';
            } else {
                msg = newUser.un + " started screen sharing.";
            }
            this.displayAlert(
                msg,
                5000,
                newUser.type
            );
        }

        let uli = document.createElement('li');
        uli.innerHTML = this.settings.username + ' (Me)';
        _this.usersList.appendChild(uli);
        let uBtnCtnr = document.createElement('div');
        uBtnCtnr.className = 'users-list-btn-ctnr';
        uli.appendChild(uBtnCtnr);
        let usspan = document.createElement('span');
        usspan.className = 'users-list-btn s';
        usspan.title = 'Mute User';
        uBtnCtnr.appendChild(usspan);
        // span click event (send sound on/off msg to ussr)
        usspan.onclick = function () {
            let abtn = document.getElementById('btn-audio-off');
            if (abtn == undefined) {
                console.error('Could not find audio button');
                return;
            }
            abtn.click();
        };

        // list users
        userList.forEach((user) => {
            let uli = document.createElement('li');

            let name = user.type !== ARENAChat.userType.SCREENSHARE ? user.un : user.un + '\'s Screen Share';
            uli.innerHTML = ((user.scene == _this.settings.scene) ? '' : user.scene + '/') +
                                    decodeURI(name) + (user.type === ARENAChat.userType.EXTERNAL ? ' (external)' : '');

            if (user.type !== ARENAChat.userType.SCREENSHARE) {
                let uBtnCtnr = document.createElement('div');
                uBtnCtnr.className = 'users-list-btn-ctnr';
                uli.appendChild(uBtnCtnr);

                let fuspan = document.createElement('span');
                fuspan.className = 'users-list-btn fu';
                fuspan.title = 'Find User';
                uBtnCtnr.appendChild(fuspan);

                // span click event (move us to be in front of another clicked user)
                let cid = user.cid;
                let scene = user.scene;
                fuspan.onclick = function () {
                    _this.moveToFrontOfCamera(cid, scene);
                };

                if (user.scene == _this.settings.scene) {
                    let sspan = document.createElement('span');
                    sspan.className = 'users-list-btn s';
                    sspan.title = 'Mute User';
                    uBtnCtnr.appendChild(sspan);

                    // span click event (send sound on/off msg to ussr)
                    sspan.onclick = function () {
                        if (!_this.isUserAuthenticated(_this.settings.cameraid)) {
                            _this.displayAlert('Anonymous users may not mute others.', 3000);
                            return;
                        }
                        // message to target user
                        _this.ctrlMsg(user.uid, 'sound:off');
                    };
                    if (user.type === ARENAChat.userType.EXTERNAL) uli.className = 'external';
                } else {
                    uli.className = 'oscene';
                }
            }
            let op = document.createElement('option');
            op.value = user.uid;
            op.innerHTML =
                'to: ' + decodeURI(user.un) + (user.scene != _this.settings.scene ? ' (' + user.scene + ')' : '');
            _this.toSel.appendChild(op);
            _this.usersList.appendChild(uli);
        });
        this.toSel.value = selVal; // preserve selected value
    }

    async populateLandmarkList() {
        try {
            let data = await fetch(this.settings.persist_uri + this.settings.scene + '?type=landmarks');
            if (!data) {
                console.error('Could not fetch landmarks from persist!');
                return;
            }
            if (!data.ok) {
                console.error('Could not fetch landmarks from persist!');
                return;
            }
            let persistRes = await data.json();
            // support multiple landmark list objects; merge all into a single array
            this.landmarks = [];
            persistRes.forEach((lmObj) => {
                Array.prototype.push.apply(this.landmarks, lmObj.attributes.landmarks);
            });
        } catch (err) {
            console.error('Could not fetch landmarks from persist!');
            console.error(err);
            return;
        }

        if (this.landmarks.length == 0) {
            this.lmBtn.style.display = 'none'; // hide landmarks button
            return;
        }

        let _this = this;
        this.landmarks.forEach((lm) => {
            let uli = document.createElement('li');
            uli.innerHTML = lm.label.length > 45 ? lm.label.substring(0, 45) + '...' : lm.label;

            let lmBtnCtnr = document.createElement('div');
            lmBtnCtnr.className = 'lm-list-btn-ctnr';
            uli.appendChild(lmBtnCtnr);

            let lspan = document.createElement('span');
            lspan.className = 'lm-list-btn l';
            lspan.title = 'Move to Landmark';
            lmBtnCtnr.appendChild(lspan);

            // setup click event
            lspan.onclick = function () {
                _this.moveToLandmark(lm.object_id);
            };

            _this.lmList.appendChild(uli);
        });
    }

    addToSelOptions() {
        let op = document.createElement('option');
        op.value = 'scene';
        op.innerHTML = 'to: scene ' + this.settings.scene;
        this.toSel.appendChild(op);

        op = document.createElement('option');
        op.value = 'all';
        op.innerHTML = 'to: all scenes';
        this.toSel.appendChild(op);
    }

    keepalive(tryconnect = false) {
        this.ctrlMsg('all', 'keepalive', tryconnect);
    }

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
        let msg = {
            object_id: uuidv4(),
            type: 'chat-ctrl',
            to_uid: to,
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            cameraid: this.settings.cameraid,
            text: text,
        };
        //console.log("ctrl", msg, "to", dstTopic);
        this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
    }

    userCleanup() {
        let now = new Date().getTime();
        let _this = this;
        Object.keys(_this.liveUsers).forEach(function (key) {
            if (now - _this.liveUsers[key].ts > _this.settings.keepalive_interval_ms && _this.liveUsers[key].type === ARENAChat.userType.ARENA) {
                delete _this.liveUsers[key];
            }
        });
    }

    displayAlert(msg, timeMs, type='') {
        this.alertBox.innerHTML = msg;
        this.alertBox.style.display = 'block';
        this.alertBox.className = "chat-alert-box " + type;
        setTimeout(() => {
            this.alertBox.style.display = 'none';
        }, timeMs); // clear message in timeMs milliseconds
    }

    moveToLandmark(objectId) {
        let sceneEl = document.querySelector('a-scene');

        if (!sceneEl) {
            console.error('Could not find aframe scene');
            return;
        }

        let landmarkObj = sceneEl.querySelector('[id="' + objectId + '"]');

        let myCamera = document.getElementById('my-camera');

        if (!myCamera) {
            console.error('Could not find our camera');
            return;
        }

        let direction = new THREE.Vector3();
        landmarkObj.object3D.getWorldDirection(direction);
        let distance = ARENA.landmarkTeleportDistance ? ARENA.landmarkTeleportDistance : 3.5; // distance to put you
        let pos = new THREE.Vector3();
        landmarkObj.object3D.getWorldPosition(pos);
        myCamera.object3D.position.copy(pos);
        myCamera.object3D.position.add(direction.multiplyScalar(distance));
        myCamera.object3D.position.y = 1.6; // set at a fixed height

        // rotate our camera to face the object
        myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2(
            myCamera.object3D.position.x - pos.x,
            myCamera.object3D.position.z - pos.z
        );
    }

    moveToFrontOfCamera(cameraId, scene) {
        //console.log("Move to near camera:", cameraId);

        if (scene !== this.settings.scene) {
            localStorage.setItem('moveToFrontOfCamera', cameraId);
            let path = window.location.pathname.substring(1);
            let devPath = '';
            if (this.settings.supportDevFolders && path.length > 0) {
                try {
                    devPath = path.match(/(?:x|dev)\/([^\/]+)\/?/g)[0];
                } catch (e) {
                    // no devPath
                }
            }
            var href = new URL(
                document.location.protocol +
                    '//' +
                    document.location.hostname +
                    document.location.port +
                    '/' +
                    devPath +
                    scene
            );
            document.location.href = href.toString();
            return;
        }

        let sceneEl = document.querySelector('a-scene');
        if (!sceneEl) {
            console.error('Could not find aframe scene');
            return;
        }

        let toCam = sceneEl.querySelector('[id="' + cameraId + '"]');

        if (!toCam) {
            // TODO: find a better way to do this
            // when we jump to a scene, the "to" user needs to move for us to be able to find his camera
            console.error('Could not find destination user camera', cameraId);
            return;
        }

        let myCamera = document.getElementById('my-camera');

        if (!myCamera) {
            console.error('Could not find our camera');
            return;
        }

        let direction = new THREE.Vector3();
        toCam.object3D.getWorldDirection(direction);
        let distance = ARENA.userTeleportDistance ? ARENA.userTeleportDistance : 2; // distance to put you
        myCamera.object3D.position.copy(toCam.object3D.position.clone()).add(direction.multiplyScalar(-distance));
        myCamera.object3D.position.y = toCam.object3D.position.y;
        // rotate our camera to face the other user
        myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2(
            myCamera.object3D.position.x - toCam.object3D.position.x,
            myCamera.object3D.position.z - toCam.object3D.position.z
        );
    }
}
