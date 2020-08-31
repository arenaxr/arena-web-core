var mqttc;

// generate an uuid
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

export default class MQTTChat {

    constructor(st) {
        // handle default this.settings
        st = st || {};
        this.settings = {
            userid: st.userid !== undefined ? st.userid : uuidv4(),
            cameraid: st.cameraid !== undefined ? st.cameraid : "camera_auser",
            username: st.username !== undefined ? st.username : "auser",
            realm: st.realm !== undefined ? st.chat_topic : "realm",
            scene: st.scene !== undefined ? st.scene : "render",
            keepalive_interval_ms: st.keepalive_interval_ms !== undefined ? st.keepalive_interval_ms : 30000,
            mqtt_host: st.mqtt_host !== undefined ? st.mqtt_host : "wss://spatial.andrew.cmu.edu/mqtt/"
        }

        // users list
        this.liveUsers = [];

        // cleanup userlist every minute
        setInterval(this.userCleanup.bind(this), this.settings.keepalive_interval_ms * 3);

        // scene chat topic from realm and scene
        this.settings.ctopic = this.settings.realm + "/s/" + this.settings.scene + "/c/";

        // "all"/global topic from realm
        this.settings.atopic = this.settings.realm + "/g/c/";

        // user topic from realm and user id
        this.settings.utopic = this.settings.realm + "/g/c/" + this.settings.userid;

        let btnGroup = document.createElement("div");
        btnGroup.className = "chat-button-group";
        document.body.appendChild(btnGroup);

        this.chatBtn = document.createElement("button");
        this.chatBtn.className = "chat-button";
        btnGroup.appendChild(this.chatBtn);

        this.usersBtn = document.createElement("button");
        this.usersBtn.className = "users-button";
        btnGroup.appendChild(this.usersBtn);

        this.chatDot = document.createElement("span");
        this.chatDot.className = "dot";
        btnGroup.appendChild(this.chatDot);

        this.chatPopup = document.createElement("div");
        this.chatPopup.className = "chat-popup";
        this.chatPopup.style.display = 'none';
        document.body.appendChild(this.chatPopup);

        this.closeChatBtn = document.createElement("span");
        this.closeChatBtn.className = "close";
        this.closeChatBtn.innerHTML = "&times";
        this.chatPopup.appendChild(this.closeChatBtn);

        this.msgList = document.createElement("div");
        this.msgList.className = "message-list";
        this.chatPopup.appendChild(this.msgList);

        let formDiv = document.createElement("div");
        formDiv.className = "form-container";
        this.chatPopup.appendChild(formDiv);

        this.msgTxt = document.createElement("textarea");
        this.msgTxt.setAttribute("rows", "1");
        this.msgTxt.setAttribute("placeholder", "Type message..");
        formDiv.appendChild(this.msgTxt);

        this.toSel = document.createElement("select");
        this.toSel.className = "sel";
        formDiv.appendChild(this.toSel);

        this.addToSelOptions();

        this.msgBtn = document.createElement("button");
        this.msgBtn.className = "btn";
        formDiv.appendChild(this.msgBtn);

        this.usersPopup = document.createElement("div");
        this.usersPopup.className = "users-popup";
        document.body.appendChild(this.usersPopup);

        this.closeUsersBtn = document.createElement("span");
        this.closeUsersBtn.className = "close";
        this.closeUsersBtn.innerHTML = "&times";
        this.usersPopup.appendChild(this.closeUsersBtn);

        let label = document.createElement("span");
        label.innerHTML = "<br/><br/>&nbspUsers (press 'find user' icon to move near user):";
        label.style.fontSize = "small";
        this.usersPopup.appendChild(label);

        let userDiv = document.createElement("div");
        userDiv.className = "user-list";
        this.usersPopup.appendChild(userDiv);

        this.usersList = document.createElement("ul");
        userDiv.appendChild(this.usersList);

        var _this = this;

        this.chatBtn.onclick = function() {
            _this.chatPopup.style.display = 'block';
            _this.usersPopup.style.display = 'none';
            _this.chatDot.style.display = 'none';

            // scroll to bottom
            _this.msgList.scrollTop = _this.msgList.scrollHeight;

            // focus on textbox
            _this.msgTxt.focus();

            // re-establish connection, in case client disconnected
            _this.connect();
        }

        this.usersBtn.onclick = function() {
            _this.chatPopup.style.display = 'none';
            _this.usersPopup.style.display = 'block';
            _this.populateUserList();
        }

        this.closeChatBtn.onclick = function() {
            _this.chatPopup.style.display = 'none';
        }

        this.closeUsersBtn.onclick = function() {
            _this.usersPopup.style.display = 'none';
        }

        this.msgBtn.onclick = function() {
            if (_this.msgTxt.value.length > 0) _this.sendMsg(_this.msgTxt.value);
            _this.msgTxt.value = "";
        }

        this.msgTxt.addEventListener("keyup", function(event) {
            event.preventDefault();
            if (event.keyCode === 13) {
                if (_this.msgTxt.value.length > 1) _this.sendMsg(_this.msgTxt.value);
                _this.msgTxt.value = "";
            }
        });
    }

    async connect(force = false) {
        if (this.connected == true && force == false) return;
        this.mqttc = new Paho.MQTT.Client(this.settings.mqtt_host, "chat-" + this.settings.userid);

        var _this = this;
        let msg = {
            type: "chat-ctrl",
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            text: "left"
        }
        let willMessage = new Paho.MQTT.Message(JSON.stringify(msg));
        willMessage.destinationName = this.settings.atopic;
        this.mqttc.connect({
            onSuccess: () => {
                console.log("Chat connected.");
                this.mqttc.subscribe(this.settings.ctopic);
                this.mqttc.subscribe(this.settings.atopic);
                this.mqttc.subscribe(this.settings.utopic);

                this.mqttc.onConnectionLost = this.onConnectionLost.bind(_this);
                this.mqttc.onMessageArrived = this.onMessageArrived.bind(_this);

                this.keepalive(false);

                // periodically send a keep alive
                setInterval(function() {
                    _this.keepalive(true);
                }, this.settings.keepalive_interval_ms);
                this.connected = true;
            },
            onFailure: () => {
                console.log("Chat failed to connect.");
                this.connected = false;
            },
            willMessage: willMessage,
        });
    }

    onConnectionLost(message) {
        console.log("Chat disconnect.");
        this.connected = false;
    }

    sendMsg(msgTxt) {
        let msg = {
            type: "chat",
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            from_desc: this.settings.username + " (" + this.toSel.options[this.toSel.selectedIndex].text + ") " + new Date().toLocaleTimeString(),
            cameraid: this.settings.cameraid,
            text: msgTxt
        }
        let dstTopic = (this.toSel.value == "scene") ? this.settings.ctopic : (this.toSel.value == "all") ? this.settings.atopic : this.settings.realm + "/g/c/" + this.toSel.value;
        //console.log("sending", msg, "to", dstTopic);
        this.mqttc.send(dstTopic, JSON.stringify(msg), 0, false);
        this.txtAddMsg(msg.text, msg.from_desc, "self");
    }

    onMessageArrived(mqttMsg) {
        //console.log("Received:", mqttMsg);
        let msg;
        try {
            msg = JSON.parse(mqttMsg.payloadString);
        } catch (err) {
            console.log("Error parsing chat msg.");
        }

        // save user data and timestamp
        if (this.liveUsers[msg.from_uid] == undefined) {
            let _this = this;
            this.liveUsers[msg.from_uid] = {
                un: msg.from_un,
                scene: msg.from_scene,
                cid: msg.cameraid,
                ts: new Date().getTime()
            };
            this.populateUserList();
            this.keepalive(); // let this user know about us
        } else {
            this.liveUsers[msg.from_uid].un = msg.from_un;
            this.liveUsers[msg.from_uid].scene = msg.from_scene;
            this.liveUsers[msg.from_uid].cid = msg.cameraid;
            this.liveUsers[msg.from_uid].ts = new Date();
            if (msg.text) {
                if (msg.text == "left") {
                    delete this.liveUsers[msg.from_uid];
                    this.populateUserList();
                }
            }
        }

        // ignore our messages
        if (msg.from_uid == this.settings.userid) return;

        // only proceed for chat messages
        if (msg.type !== "chat") return;

        this.txtAddMsg(msg.text, msg.from_desc, "other");

        // check if chat is visible
        if (this.chatPopup.style.display == "none") this.chatDot.style.display = 'block';
    }

    txtAddMsg(msg, status, whoClass) {
        let statusSpan = document.createElement("span");
        statusSpan.className = "status " + whoClass // "self" | "other"
        statusSpan.innerHTML = status;
        this.msgList.appendChild(statusSpan);

        let msgSpan = document.createElement("span");
        msgSpan.className = "msg " + whoClass // "self" | "other"
        msgSpan.innerHTML = msg;
        this.msgList.appendChild(msgSpan);

        // scroll to bottom
        this.msgList.scrollTop = this.msgList.scrollHeight;
    }

    populateUserList() {
        this.usersList.innerHTML = "";
        let selVal = this.toSel.value;
        this.toSel.innerHTML = "";
        this.addToSelOptions();

        let _this = this;
        Object.keys(this.liveUsers).forEach(function(key) {
            let uli = document.createElement("li");

            uli.innerHTML = _this.liveUsers[key].scene + "/" + _this.liveUsers[key].un + ((key == _this.settings.userid) ? " (me)" : "");
            //uli.setAttribute("cameraid", _this.liveUsers[key].cid);

            if (key !== _this.settings.userid && _this.liveUsers[key].scene == _this.settings.scene) {
                let uspan = document.createElement("span");
                uspan.className = "users-list-btn";
                uspan.title = "Find User";
                uli.appendChild(uspan);

                console.log("**", _this.liveUsers[key].cid);

                // span click event (move us to be in front of another clicked user)
                uspan.onclick = function() {
                    _this.moveToFrontOfCamera(_this.liveUsers[key].cid);
                }

                let op = document.createElement("option");
                op.value = key;
                op.innerHTML = "to user: " + _this.liveUsers[key].un;
                _this.toSel.appendChild(op);
            }
            _this.usersList.appendChild(uli);
        });
        this.toSel.value = selVal; // preserve selected value
    }

    addToSelOptions() {
        let op = document.createElement("option");
        op.value = "scene";
        op.innerHTML = "to scene: " + this.settings.scene;
        this.toSel.appendChild(op);

        op = document.createElement("option");
        op.value = "all";
        op.innerHTML = "to all scenes";
        this.toSel.appendChild(op);
    }

    keepalive(tryconnect = false) {
        // re-establish connection, in case client disconnected
        if (tryconnect) this.connect();

        let msg = {
            type: "chat-ctrl",
            from_uid: this.settings.userid,
            from_un: this.settings.username,
            from_scene: this.settings.scene,
            cameraid: this.settings.cameraid,
            text: "keepalive"
        }
        //console.log("keep alive:", msg, "to", this.settings.atopic);
        this.mqttc.send(this.settings.atopic, JSON.stringify(msg), 0, false);
    }

    userCleanup() {
        let now = new Date().getTime();
        let _this = this;
        Object.keys(_this.liveUsers).forEach(function(key) {
            if (now - _this.liveUsers[key].ts > _this.settings.keepalive_interval_ms) {
                delete _this.liveUsers[key];
            }
        });
    }

    moveToFrontOfCamera(cameraId) {
        //console.log("Move to near camera:", cameraId);

        let sceneEl = document.querySelector('a-scene');
        if (!sceneEl) {
            console.log("Could not find aframe scene");
            return;
        }
        let toCam = sceneEl.querySelector('#' + cameraId);
        //let cameraRig = sceneEl.querySelector('#CameraRig');
        let myCamera = document.getElementById('my-camera'); // TODO: change to use settings.cameraid
        //let cameraSpinner = sceneEl.querySelector('#CameraSpinner');

        var direction = new THREE.Vector3();
		    toCam.object3D.getWorldDirection( direction );
        let distance = 1; // distance to put you
        myCamera.object3D.position.copy( toCam.object3D.position.clone() ).add( direction.multiplyScalar( -distance ) );
        myCamera.object3D.lookAt(toCam.object3D.position);
        // TODO: find a way to rotate the camera!
    }
}
