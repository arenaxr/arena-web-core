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

function publishAvatarMsg() {
    publish(globals.outputTopic + globals.camName + "/face/avatarStatus", {
        "object_id": "face_" + globals.idTag,
        "avatar": globals.hasAvatar
    });
}

function setupIcons() {
    const audioBtn = createIconButton("audio-off", "Microphone on/off.", () => {
        if (jitsiAudioTrack) {
            globals.hasAudio = !globals.hasAudio;
            if (globals.hasAudio) { // toggled
                jitsiAudioTrack.unmute().then(_ => {
                    audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/audio-on.png')";
                })
            }
             else {
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
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-on.png')";
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
                    if (globals.localJitsiVideo)
                        globals.localJitsiVideo.style.display = "block"
                    // globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "true");
                    window.trackFaceOff();
                    globals.hasAvatar = false;
                    publishAvatarMsg();
                })
            }
             else {
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-off.png')";
                jitsiVideoTrack.mute().then(_ => {
                    if (globals.localJitsiVideo)
                        globals.localJitsiVideo.style.display = "none"
                    // globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
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
                    if (globals.localJitsiVideo)
                        globals.localJitsiVideo.style.display = "none"
                    // globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                    globals.hasVideo = false;
                    window.trackFaceOn();
                    publishAvatarMsg();
                })
            }
             else {
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
                window.trackFaceOff();
                publishAvatarMsg();
            }
        }
    });

    let settingsButtons = []

    let speedState = 0;
    const speedBtn = createIconButton("speed-medium", "Sign out of the ARENA", () => {
        speedState = (speedState + 1) % 3;
        if (speedState == 0) { // medium
            speedBtn.childNodes[0].style.backgroundImage = "url('images/icons/speed-medium.png')";
            if (!AFRAME.utils.device.isMobile())
                globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"acceleration": 30});
            else
                globals.sceneObjects.myCamera.setAttribute("press-and-move", {"speed": 5.0});
        }
        else if (speedState == 1) { // fast
            speedBtn.childNodes[0].style.backgroundImage = "url('images/icons/speed-fast.png')";
            if (!AFRAME.utils.device.isMobile())
                globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"acceleration": 60});
            else
                globals.sceneObjects.myCamera.setAttribute("press-and-move", {"speed": 10.0});
        }
        else if (speedState == 2) { // slow
            speedBtn.childNodes[0].style.backgroundImage = "url('images/icons/speed-slow.png')";
            if (!AFRAME.utils.device.isMobile())
                globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"acceleration": 15});
            else
                globals.sceneObjects.myCamera.setAttribute("press-and-move", {"speed": 2.5});
        }
    });
    speedBtn.style.display = "none";
    settingsButtons.push(speedBtn);

    globals.flying = false;
    const flyingBtn = createIconButton("flying-off", "Flying on/off", () => {
        globals.flying = !globals.flying;
        if (globals.flying) { // toggled
            flyingBtn.childNodes[0].style.backgroundImage = "url('images/icons/flying-on.png')";
        }
        else {
            let groundedPos = globals.sceneObjects.myCamera.getAttribute("position");
            groundedPos.y = parseFloat(defaults.startCoords.split(",")[1]);
            globals.sceneObjects.myCamera.setAttribute("position", groundedPos);
            flyingBtn.childNodes[0].style.backgroundImage = "url('images/icons/flying-off.png')";
        }
        globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"fly": globals.flying});
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
    iconsDiv.appendChild(speedBtn);
    iconsDiv.appendChild(flyingBtn);
    if (!AFRAME.utils.device.isMobile()) {
        iconsDiv.appendChild(screenShareButton); // no screenshare on mobile - doesnt work
    }
    iconsDiv.appendChild(logoutBtn);
    iconsDiv.appendChild(settingsBtn);
    document.body.appendChild(iconsDiv);
}

window.addEventListener('onauth', setupIcons);
