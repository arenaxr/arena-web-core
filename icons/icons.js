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
        "avatar": globals.hasAvatar
    });
}

function setupIcons() {
    const audioBtn = createIconButton("slashroundedaudio", () => {
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

    const videoBtn = createIconButton("slashroundedvideo", () => {
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

    const avatarBtn = createIconButton("slashroundedavatar", () => {
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

    const settingsBtn = createIconButton("roundedsettings", () => {
        // TODO(mwfarb) add settings dialog
    });

    const logoutBtn = createIconButton("roundedlogout", () => {
        signOut('.');
    });

    var iconsDiv = document.getElementById('iconsDiv');
    iconsDiv.appendChild(audioBtn);
    iconsDiv.appendChild(videoBtn);
    iconsDiv.appendChild(avatarBtn);
    iconsDiv.appendChild(logoutBtn);
    iconsDiv.appendChild(settingsBtn);
}

AFRAME.registerComponent('iconsinit', {
    init: function() {
        setupIcons();
    }
});
