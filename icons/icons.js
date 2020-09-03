const ICON_BTN_CLASS = 'arena-icon-button';

function createIconButton(img, onClick) {
    var iconButton;
    var wrapper;

    // Create elements.
    wrapper = document.createElement('div');
    iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('images/icons/${img}.png')`;
    iconButton.className = ICON_BTN_CLASS;
    iconButton.setAttribute("id", "btn-"+img);

    // Insert elements.
    wrapper.appendChild(iconButton);
    iconButton.addEventListener('click', function(evt) {
        onClick();
        evt.stopPropagation();
    });

    return wrapper;
}

function publishAvatarMsg(avatarOn) {
    publish("realm/s/" + globals.scenenameParam + "/camera_" + globals.idTag + "/face/avatarStatus", {
        "object_id": "face_" + globals.idTag,
        "avatar": avatarOn
    });
}

function setupIcons() {
    const audioBtn = createIconButton("roundedaudio", () => {
        audioBtn.not_toggled = !audioBtn.not_toggled;
        if (jitsiAudioTrack) {
            if (!audioBtn.not_toggled) {
                audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedaudio.png')";
                jitsiAudioTrack.unmute();
            } else {
                audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedaudio.png')";
                jitsiAudioTrack.mute();
            }
        }
    });

    const videoBtn = createIconButton("roundedvideo", () => {
        videoBtn.not_toggled = !videoBtn.not_toggled;
        if (jitsiVideoTrack) {
            if (!videoBtn.not_toggled) { // toggled
                jitsiVideoTrack.unmute().then(_ => {
                    setupCornerVideo();
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedvideo.png')";
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedavatar.png')";
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "true");
                    window.trackFaceOff();
                    publishAvatarMsg(false);
                    globals.hasVideo = true;
                    avatarBtn.toggled = false;
                })
            } else {
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedvideo.png')";
                jitsiVideoTrack.mute().then(_ => {
                    globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                    globals.hasVideo = false;
                })
            }
        }
    });

    const avatarBtn = createIconButton("slashroundedavatar", () => {
        if (AFRAME.utils.device.isMobile()) return;
        avatarBtn.toggled = !avatarBtn.toggled;
        if (avatarBtn.toggled) { // toggled
            jitsiVideoTrack.mute().then(_ => {
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedavatar.png')";
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedvideo.png')";
                globals.sceneObjects["arena-vid-plane"].setAttribute("visible", "false");
                videoBtn.not_toggled = true;
                globals.hasVideo = false;
                window.trackFaceOn();
                publishAvatarMsg(true);
            })
        } else {
            avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedavatar.png')";
            window.trackFaceOff().then(_ => {
                publishAvatarMsg(false);
            })
        }
    });

    const settingsBtn = createIconButton("roundedsettings", () => {
        settingsBtn.not_toggled = !settingsBtn.not_toggled;
        if (!settingsBtn.not_toggled) {
            settingsBtn.childNodes[0].style.backgroundImage = "url('images/icons/roundedsettings.png')";
            signIn();
        } else {
            settingsBtn.childNodes[0].style.backgroundImage = "url('images/icons/slashroundedsettings.png')";
            signOut('.');
        }
    });

    var iconsDiv = document.getElementById('iconsDiv');
    iconsDiv.appendChild(audioBtn);
    iconsDiv.appendChild(videoBtn);
    iconsDiv.appendChild(avatarBtn);
    iconsDiv.appendChild(settingsBtn);
}

AFRAME.registerComponent('iconsinit', {
    init: function() {
        setupIcons();
    }
});
