const ICON_BTN_CLASS = 'arena-icon-button';

function createIconButton(initialImage, tooltip, onClick) {
    var iconButton;
    var wrapper;

    // Create elements.
    wrapper = document.createElement('div');
    iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('images/icons/${initialImage}.png')`;
    iconButton.className = ICON_BTN_CLASS;
    iconButton.setAttribute("id", "btn-" + initialImage);
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

// set up local corner video window
function startCornerVideo() {
    const localvidbox = document.getElementById("localvidbox");
    localvidbox.setAttribute("width", globals.localvidboxWidth);
    localvidbox.setAttribute("height", globals.localvidboxHeight);
    if (localvidbox.srcObject) {
        localvidbox.play();
    }
}

function setupIcons() {
    const audioBtn = createIconButton("audio-off", "Microphone on/off.", () => {
        if (jitsiAudioTrack) {
            globals.hasAudio = !globals.hasAudio;
            if (globals.hasAudio) { // toggled
                jitsiAudioTrack.unmute().then(_ => {
                    audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/audio-on.png')";
                })
            } else {
                jitsiAudioTrack.mute().then(_ => {
                    audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/audio-off.png')";
                })
            }
        }
    });

    const videoBtn = createIconButton("video-off", "Camera on/off. You appear as a video box.", () => {
        if (jitsiVideoTrack) {
            globals.hasVideo = !globals.hasVideo;
            if (globals.hasVideo) { // toggled
                jitsiVideoTrack.unmute().then(_ => {
                    startCornerVideo();
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-on.png')";
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "true");
                    window.trackFaceOff();
                    globals.hasAvatar = false;
                    publishAvatarMsg();
                })
            } else {
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-off.png')";
                jitsiVideoTrack.mute().then(_ => {
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                })
            }
        }
    });

    const avatarBtn = createIconButton("avatar3-off", "Face-recognition avatar on/off. You appear as a 3d-animated face.", () => {
        if (jitsiVideoTrack) {
            globals.hasAvatar = !globals.hasAvatar;
            if (globals.hasAvatar) { // toggled
                jitsiVideoTrack.mute().then(_ => {
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-on.png')";
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-off.png')";
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                    globals.hasVideo = false;
                    window.trackFaceOn();
                    publishAvatarMsg();
                })
            } else {
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
                window.trackFaceOff();
                publishAvatarMsg();
            }
        }
    });

    let settingsButtons = []

    let flying = false;
    const flyingBtn = createIconButton("flying-off", "Flying on/off", () => {
        flying = !flying;
        if (flying) { // toggled
            flyingBtn.childNodes[0].style.backgroundImage = "url('images/icons/flying-on.png')";
        }
        else {
            let groundedPos = globals.sceneObjects.myCamera.getAttribute("position");
            groundedPos.y = parseFloat(defaults.startCoords.split(",")[1]);
            globals.sceneObjects.myCamera.setAttribute("position", groundedPos);
            flyingBtn.childNodes[0].style.backgroundImage = "url('images/icons/flying-off.png')";
        }
        globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"fly": flying});
    });
    flyingBtn.style.display = "none";
    settingsButtons.push(flyingBtn);

    const screenShareButton = createIconButton("screen-on", "Share your screen in a new window", () => {
        window.open(`${defaults.screenSharePath}?scene=${globals.scenenameParam}&cameraName=${globals.camName}`, '_blank');
    });
    screenShareButton.style.display = "none";
    settingsButtons.push(screenShareButton);

    const logoutBtn = createIconButton("logout-on", "Sign out of the ARENA", () => {
        signOut('.'); // --> ./auth.js
    });
    logoutBtn.style.display = "none";
    settingsButtons.push(logoutBtn);

    let expanded = false;
    const settingsBtn = createIconButton("more", "Additional settings", () => {
        expanded = !expanded;
        if (expanded) { // toggled
            settingsBtn.childNodes[0].style.backgroundImage = "url('images/icons/less.png')";
            for (let i = 0; i < settingsButtons.length; i++) {
                settingsButtons[i].style.display = "block";
            }
        }
        else {
            settingsBtn.childNodes[0].style.backgroundImage = "url('images/icons/more.png')";
            for (let i = 0; i < settingsButtons.length; i++) {
                settingsButtons[i].style.display = "none";
            }
        }
    });

    var iconsDiv = document.createElement('div');
    iconsDiv.setAttribute("id", "iconsDiv");
    iconsDiv.appendChild(audioBtn);
    iconsDiv.appendChild(videoBtn);
    if (!AFRAME.utils.device.isMobile()) {
        iconsDiv.appendChild(avatarBtn); // no avatar on mobile - face model is too large
    }
    iconsDiv.appendChild(flyingBtn);
    if (!AFRAME.utils.device.isMobile()) {
        iconsDiv.appendChild(screenShareButton);
    }
    iconsDiv.appendChild(logoutBtn);
    iconsDiv.appendChild(settingsBtn);
    document.body.appendChild(iconsDiv);
}

window.addEventListener('onauth', setupIcons);
