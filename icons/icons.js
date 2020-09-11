const ICON_BTN_CLASS = 'arena-icon-button';

function createIconButton(img, tooltip, onClick) {
    var iconButton;
    var wrapper;

    // Create elements.
    wrapper = document.createElement('div');
    iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('images/icons/${img}.png')`;
    iconButton.className = ICON_BTN_CLASS;
    iconButton.setAttribute("id", "btn-" + img);
    iconButton.setAttribute("title", tooltip);

    // Insert elements.
    wrapper.appendChild(iconButton);
    iconButton.addEventListener('click', function (evt) {
        onClick();
        evt.stopPropagation();
    });

    return wrapper;
}

function publishAvatarMsg(avatarOn) {
    publish("realm/s/" + globals.scenenameParam + "/camera_" + globals.idTag + "/face/avatarStatus", {
        "object_id": "face_" + globals.idTag,
        "avatar": globals.hasAvatar
    });
}

function publishHeadText(displayName) {
    publish("realm/s/" + globals.scenenameParam + "/headtext_" + globals.camName, {
        "object_id": "headtext_" + globals.camName,
        "action": "update",
        "data": { "text": displayName },
    });
}

function setupIcons() {
    const audioBtn = createIconButton("slashroundedaudio", "Microphone on/off.", () => {
        if (jitsiAudioTrack) {
            globals.hasAudio = !globals.hasAudio;
            if (globals.hasAudio) {
                jitsiAudioTrack.unmute().then(_ => {
                    audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedaudio.png')";
                })
            } else {
                jitsiAudioTrack.mute().then(_ => {
                    audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedaudio.png')";
                })
            }
        }
    });

    const videoBtn = createIconButton("slashroundedvideo", "Camera on/off. You appear as a video box.", () => {
        if (jitsiVideoTrack) {
            globals.hasVideo = !globals.hasVideo;
            if (globals.hasVideo) { // toggled
                jitsiVideoTrack.unmute().then(_ => {
                    setupCornerVideo();
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedvideo.png')";
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedavatar.png')";
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "true");
                    window.trackFaceOff();
                    globals.hasAvatar = false;
                    publishAvatarMsg();
                })
            } else {
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedvideo.png')";
                jitsiVideoTrack.mute().then(_ => {
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                })
            }
        }
    });

    const avatarBtn = createIconButton("slashroundedavatar", "Face-recognition avatar on/off. You appear as a 3d-animated face.", () => {
        if (AFRAME.utils.device.isMobile()) return;
        if (jitsiVideoTrack) {
            globals.hasAvatar = !globals.hasAvatar;
            if (globals.hasAvatar) { // toggled
                jitsiVideoTrack.mute().then(_ => {
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedavatar.png')";
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedvideo.png')";
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                    globals.hasVideo = false;
                    window.trackFaceOn();
                    publishAvatarMsg();
                })
            } else {
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedavatar.png')";
                window.trackFaceOff();
                publishAvatarMsg();
            }
        }
    });

    const settingsBtn = createIconButton("roundedsettings", "Settings (WIP)", () => {
        console.log("clicked settings");
        settingsPopup.style.display = 'block'; // open settings panel
        // load settings
        usernameInput.value = globals.displayName;
    });

    const logoutBtn = createIconButton("roundedlogout", "Sign out of the ARENA", () => {
        signOut('.'); // --> ./auth.js
    });

    var iconsDiv = document.createElement('div');
    iconsDiv.setAttribute("id", "iconsDiv");
    iconsDiv.appendChild(audioBtn);
    iconsDiv.appendChild(videoBtn);
    iconsDiv.appendChild(avatarBtn);
    iconsDiv.appendChild(logoutBtn);
    iconsDiv.appendChild(settingsBtn);
    document.body.appendChild(iconsDiv);

    // Add settings panel
    let settingsPopup = document.createElement("div");
    settingsPopup.className = "chat-popup settings-popup"; // inherit some chat css
    document.body.appendChild(settingsPopup);

    let closeSettingsBtn = document.createElement("span");
    closeSettingsBtn.className = "close";
    closeSettingsBtn.innerHTML = "&times";
    settingsPopup.appendChild(closeSettingsBtn);

    let label = document.createElement("span");
    label.innerHTML = "<br/>Settings";
    settingsPopup.appendChild(label);

    let formDiv = document.createElement("div");
    formDiv.className = "form-container";
    settingsPopup.appendChild(formDiv);

    label = document.createElement("span");
    label.innerHTML = "Display Name";
    label.style.fontSize = "small";
    formDiv.appendChild(label);

    let usernameInput = document.createElement("textarea");
    usernameInput.setAttribute("rows", "1");
    usernameInput.setAttribute("placeholder", "Display Name");
    formDiv.appendChild(usernameInput);

    let saveSettingsBtn = document.createElement("button");
    saveSettingsBtn.innerHTML = "Save";
    formDiv.appendChild(saveSettingsBtn);

    closeSettingsBtn.onclick = function () {
        settingsPopup.style.display = 'none'; // close settings panel
        saveSettings();
    };

    saveSettingsBtn.onclick = function () {
        saveSettings();
    };
}

function saveSettings() {
    globals.displayName = usernameInput.value;
    // publish name for all
    publishHeadText(globals.displayName);
}

AFRAME.registerComponent('iconsinit', {
    init: function () {
        setupIcons();
    }
});
