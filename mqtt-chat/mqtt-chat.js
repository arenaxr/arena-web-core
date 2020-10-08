import './linkify.min.js';
import './linkify-string.min.js';

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
			username: st.username !== undefined ? st.username : "chat-dft-username",
			realm: st.realm !== undefined ? st.realm : "realm",
			scene: st.scene !== undefined ? st.scene : "render",
			keepalive_interval_ms: st.keepalive_interval_ms !== undefined ? st.keepalive_interval_ms : 30000,
			mqtt_host: st.mqtt_host !== undefined ? st.mqtt_host : "wss://spatial.andrew.cmu.edu/mqtt/",
			mqtt_username: st.mqtt_username !== undefined ? st.mqtt_username : "non_auth",
			mqtt_token: st.mqtt_token,
		}

		// users list
		this.liveUsers = [];

		// cleanup userlist periodically
		setInterval(this.userCleanup.bind(this), this.settings.keepalive_interval_ms * 3);

		// scene chat topic from realm and scene
		this.settings.ctopic = this.settings.realm + "/s/" + this.settings.scene + "/c/";

		// "all"/global topic from realm
		this.settings.atopic = this.settings.realm + "/g/c/";

		// user topic from realm and user id
		this.settings.utopic = this.settings.realm + "/g/c/" + this.settings.userid;

		// counter for unread msgs
		this.unreadMsgs = 0;

		this.alertBox = document.createElement("div");
		this.alertBox.className = "chat-alert-box";
		this.alertBox.innerHTML= "Muted by user xxx";
		document.body.appendChild(this.alertBox);

		let btnGroup = document.createElement("div");
		btnGroup.className = "chat-button-group";
		document.body.appendChild(btnGroup);

		this.chatBtn = document.createElement("button");
		this.chatBtn.className = "chat-button";
		this.chatBtn.setAttribute("title", "Chat");
		btnGroup.appendChild(this.chatBtn);

		this.usersBtn = document.createElement("button");
		this.usersBtn.className = "users-button";
		this.usersBtn.setAttribute("title", "User List");
		btnGroup.appendChild(this.usersBtn);

		this.chatDot = document.createElement("span");
		this.chatDot.className = "dot";
		this.chatDot.innerHTML = "0";
		this.chatBtn.appendChild(this.chatDot);

		this.chatPopup = document.createElement("div");
		this.chatPopup.className = "chat-popup";
		this.chatPopup.style.display = 'none';
		document.body.appendChild(this.chatPopup);

		this.closeChatBtn = document.createElement("span");
		this.closeChatBtn.className = "close";
		this.closeChatBtn.innerHTML = "×";
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
		this.closeUsersBtn.innerHTML = "×";
		this.usersPopup.appendChild(this.closeUsersBtn);

		let label = document.createElement("span");
		label.innerHTML = "<br/><br/>&nbsp";
		label.style.fontSize = "small";
		this.usersPopup.appendChild(label);

		this.nUserslabel = document.createElement("span");
		this.nUserslabel.style.fontSize = "small";
		this.usersPopup.appendChild(this.nUserslabel);

		label = document.createElement("span");
		label.innerHTML = " Users (buttons allow to find and mute users):";
		label.style.fontSize = "small";
		this.usersPopup.appendChild(label);

		let userDiv = document.createElement("div");
		userDiv.className = "user-list";
		this.usersPopup.appendChild(userDiv);

		this.usersList = document.createElement("ul");
		userDiv.appendChild(this.usersList);

		var _this = this;

		this.displayAlert("Not sending audio or video. Use icons on the right to start.", 5000);

		this.chatBtn.onclick = function () {
			_this.chatPopup.style.display = 'block';
			_this.usersPopup.style.display = 'none';
			_this.chatDot.style.display = 'none';
			this.unreadMsgs = 0;

			// scroll to bottom
			_this.msgList.scrollTop = _this.msgList.scrollHeight;

			// focus on textbox
			_this.msgTxt.focus();

			// re-establish connection, in case client disconnected
			_this.connect();
		}

		this.usersBtn.onclick = function () {
			_this.chatPopup.style.display = 'none';
			_this.usersPopup.style.display = 'block';
			_this.populateUserList();
		}

		this.closeChatBtn.onclick = function () {
			_this.chatPopup.style.display = 'none';
		}

		this.closeUsersBtn.onclick = function () {
			_this.usersPopup.style.display = 'none';
		}

		this.msgBtn.onclick = function () {
			if (_this.msgTxt.value.length > 0) _this.sendMsg(_this.msgTxt.value);
			_this.msgTxt.value = "";
		}

		this.msgTxt.addEventListener("keyup", function (event) {
			event.preventDefault();
			if (event.keyCode === 13) {
				if (_this.msgTxt.value.length > 1) _this.sendMsg(_this.msgTxt.value);
				_this.msgTxt.value = "";
			}
		});

		const moveToCamera = localStorage.getItem('moveToFrontOfCamera');
		//console.log(moveToCamera);
		if (moveToCamera !== null) {
			localStorage.removeItem('moveToFrontOfCamera');
			this.moveToFrontOfCamera(moveToCamera, this.settings.scene);
		}

		window.addEventListener('newsettings', e => {
			_this.settings.username = e.detail.name;
			_this.keepalive(); // let other users know
			_this.populateUserList();
		});
	}

	async connect(force = false) {
		if (this.connected == true && force == false) return;
		this.mqttc = new Paho.Client(this.settings.mqtt_host, "chat-" + this.settings.userid);

		var _this = this;
		let msg = {
			object_id: uuidv4(),
			type: "chat-ctrl",
			from_uid: this.settings.userid,
			from_un: this.settings.username,
			from_scene: this.settings.scene,
			text: "left"
		}
		let willMessage = new Paho.Message(JSON.stringify(msg));
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
				setInterval(function () {
					_this.keepalive(true);
				}, this.settings.keepalive_interval_ms);
				this.connected = true;
			},
			onFailure: () => {
				console.error("Chat failed to connect.");
				this.connected = false;
			},
			willMessage: willMessage,
			userName: this.settings.mqtt_username,
			password: this.settings.mqtt_token
		});
	}

	onConnectionLost(message) {
		console.error("Chat disconnect.");
		this.connected = false;
	}

	sendMsg(msgTxt) {
		let msg = {
			object_id: uuidv4(),
			type: "chat",
			from_uid: this.settings.userid,
			from_un: decodeURI(this.settings.username),
			from_scene: this.settings.scene,
			from_desc: decodeURI(this.settings.username) + " (" + this.toSel.options[this.toSel.selectedIndex].text + ") " + new Date().toLocaleTimeString(),
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
			console.error("Error parsing chat msg.");
		}

    // ignore our messages
		if (msg.from_uid == this.settings.userid) return;

		// save user data and timestamp
		if (this.liveUsers[msg.from_uid] == undefined && msg.from_un !== undefined && msg.from_scene !== undefined) {
			this.liveUsers[msg.from_uid] = {
				un: msg.from_un,
				scene: msg.from_scene,
				cid: msg.cameraid,
				ts: new Date().getTime()
			};
			this.populateUserList();
			this.keepalive(); // let this user know about us
		} else if (msg.from_un !== undefined && msg.from_scene !== undefined) {
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

		// process commands
		if (msg.type == "chat-cmd") {
			if (msg.text == "sound:off") {
        console.log("muteAudio");
				let abtn = document.getElementById('btn-audio-off');
				if (abtn == undefined) {
					console.error("Could not find audio button");
					return;
				}
				if (abtn.style.backgroundImage.includes('audio-on.png') == true) {
					abtn.click();
					this.displayAlert("Sound muted. User " + msg.from_un + " requested silence.", 3000);
				}
			}
			return;
		}

		// only proceed for chat messages
		if (msg.type !== "chat") return;

		this.txtAddMsg(msg.text, msg.from_desc, "other");

		this.unreadMsgs++;
		this.chatDot.innerHTML = (this.unreadMsgs < 100) ? this.unreadMsgs : "...";

		// check if chat is visible
		if (this.chatPopup.style.display == "none") {
			this.chatDot.style.display = 'block';
		}
	}

	txtAddMsg(msg, status, whoClass) {
		let statusSpan = document.createElement("span");
		statusSpan.className = "status " + whoClass // "self" | "other"
		statusSpan.innerHTML = status;
		this.msgList.appendChild(statusSpan);

		let msgSpan = document.createElement("span");
		msgSpan.className = "msg " + whoClass // "self" | "other"
		let host = window.location.host.replace(".", "\\.");
		let pattern = `${host}(.*scene=.*|\\/\n|\\/$)`;
		let regex = new RegExp(pattern);
		if (msg.match(regex)) {
			// no new tab if we have a link to an arena scene
			msgSpan.innerHTML = msg.linkify({
				target: "_parent"
			});
		} else {
			msgSpan.innerHTML = msg.linkify({
				target: "_blank"
			});
		}
		this.msgList.appendChild(msgSpan);

		// scroll to bottom
		this.msgList.scrollTop = this.msgList.scrollHeight;
	}

  populateUserList() {
  	this.usersList.innerHTML = "";
  	let selVal = this.toSel.value;
  	this.toSel.innerHTML = "";
  	this.addToSelOptions();

  	this.nUserslabel.innerHTML = Object.keys(this.liveUsers).length;

  	let _this = this;
  	let userList = []
  	Object.keys(this.liveUsers).forEach(function (key) {
  		userList.push({
  			uid: key,
  			sort_key: (_this.liveUsers[key].scene == _this.settings.scene) ? "aaa" : "zzz",
  			scene: _this.liveUsers[key].scene,
  			un: _this.liveUsers[key].un,
  			cid: _this.liveUsers[key].cid
  		});
  	});

  	userList.sort((a, b) => ('' + a.sort_key + a.scene + a.un).localeCompare(b.sort_key + b.scene + b.un));

  	// user "line"
  	let uli = document.createElement("li");
  	uli.innerHTML = this.settings.scene + "/" + decodeURI(this.settings.username) + " (me)";

  	let uBtnCtnr = document.createElement("div");
  	uBtnCtnr.className = "users-list-btn-ctnr";
  	uli.appendChild(uBtnCtnr);
  	let maspan = document.createElement("span");
  	maspan.className = "users-list-btn ma";
  	maspan.title = "Silence (Mute Everyone)";
  	uBtnCtnr.appendChild(maspan);
  	this.usersList.appendChild(uli);

  	// span click event (send sound on/off msg to all)
  	maspan.onclick = function () {
			swal({
			  title: "Are you sure?",
			  text: "This will send a mute request to all users.",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((sendMute) => {
			  if (sendMute) {
					// send to scene topic
		  		_this.cmdMsg(_this.settings.ctopic, "sound:off");
			  }
			});
  	}

  	// other users
  	userList.forEach(user => {
  		let uli = document.createElement("li");

  		uli.innerHTML = user.scene + "/" + decodeURI(user.un) + ((user.uid == _this.settings.userid) ? " (me)" : "");

  		let uBtnCtnr = document.createElement("div");
  		//uBtnCtnr.innerHTML='bla';
  		uBtnCtnr.className = "users-list-btn-ctnr";
  		uli.appendChild(uBtnCtnr);

  		let fuspan = document.createElement("span");
  		fuspan.className = "users-list-btn fu";
  		fuspan.title = "Find User";
  		uBtnCtnr.appendChild(fuspan);

  		// span click event (move us to be in front of another clicked user)
  		let cid = user.cid;
  		let scene = user.scene;
  		fuspan.onclick = function () {
  			_this.moveToFrontOfCamera(cid, scene);
  		}

  		let sspan = document.createElement("span");
  		sspan.className = "users-list-btn s";
  		sspan.title = "Mute User";
  		uBtnCtnr.appendChild(sspan);

  		// span click event (send sound on/off msg to ussr)
  		sspan.onclick = function () {
  			// target user topic
  			let tutopic = _this.settings.realm + "/g/c/" + user.uid;
  			_this.cmdMsg(tutopic, "sound:off");
  		}

  		let op = document.createElement("option");
  		op.value = user.uid;
  		op.innerHTML = "to user: " + decodeURI(user.un);
  		_this.toSel.appendChild(op);
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
			object_id: uuidv4(),
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

	cmdMsg(toTopic, text, tryconnect = false) {
		// re-establish connection, in case client disconnected
		if (tryconnect) this.connect();

		let msg = {
			object_id: uuidv4(),
			type: "chat-cmd",
			from_uid: this.settings.userid,
			from_un: this.settings.username,
			from_scene: this.settings.scene,
			cameraid: this.settings.cameraid,
			text: text
		}
		console.log("cmd", msg, "to", toTopic);
		this.mqttc.send(toTopic, JSON.stringify(msg), 0, false);
	}

	userCleanup() {
		let now = new Date().getTime();
		let _this = this;
		Object.keys(_this.liveUsers).forEach(function (key) {
			if (now - _this.liveUsers[key].ts > _this.settings.keepalive_interval_ms) {
				delete _this.liveUsers[key];
			}
		});
	}

	displayAlert(msg, timeMs) {
	  let alert = document.getElementById("alert");

	  this.alertBox.innerHTML = msg;
	  this.alertBox.style.display = "block";
	  setTimeout(() => {
	      this.alertBox.style.display = "none";
	  }, timeMs); // clear message in timeMs milliseconds
	}

	moveToFrontOfCamera(cameraId, scene) {
		console.log("Move to near camera:", cameraId);

		if (scene !== this.settings.scene) {
			localStorage.setItem('moveToFrontOfCamera', cameraId);
			var href = new URL(document.location.href);
			href.searchParams.set('scene', scene);
			document.location.href = href.toString();
			return;
		}

		let sceneEl = document.querySelector('a-scene');
		if (!sceneEl) {
			console.error("Could not find aframe scene");
			return;
		}

		let toCam = sceneEl.querySelector('[id="' + cameraId + '"]');

		if (!toCam) {
			// TODO: find a better way to do this
			// when we jump to a scene, the "to" user needs to move for us to be able to find his camera
			console.error("Could not find destination user camera", cameraId);
			return;
		}

		let myCamera = document.getElementById('my-camera');

		if (!myCamera) {
			console.error("Could not find our camera");
			return;
		}

		var direction = new THREE.Vector3();
		toCam.object3D.getWorldDirection(direction);
		let distance = 1; // distance to put you
		myCamera.object3D.position.copy(toCam.object3D.position.clone()).add(direction.multiplyScalar(-distance));
		// rotate our camera to face the other user
		myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2((myCamera.object3D.position.x - toCam.object3D.position.x), (myCamera.object3D.position.z - toCam.object3D.position.z));
	}
}
