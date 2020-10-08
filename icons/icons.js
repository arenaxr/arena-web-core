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

function publishHeadText(displayName) {
    publish("realm/s/" + globals.scenenameParam + "/head-text_" + globals.camName, {
        "object_id": globals.camName,
        "action": "create",
        "type": "object",
        "displayName": displayName,
        "data": { "object_type": "headtext", }
    });
}

function setupIcons() {
    const audioBtn = createIconButton("audio-off", "Microphone on/off.", () => {
        if (!ARENA.JitsiAPI.ready()) return;
        if (!ARENA.JitsiAPI.hasAudio()) { // toggled
            ARENA.JitsiAPI.unmuteAudio().then(_ => {
                audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/audio-on.png')";
            })
        }
        else {
            ARENA.JitsiAPI.muteAudio().then(_ => {
                audioBtn.childNodes[0].style.backgroundImage = "url('images/icons/audio-off.png')";
            })
        }
    });

    const videoBtn = createIconButton("video-off", "Camera on/off. You appear as a video box.", () => {
        if (!ARENA.JitsiAPI.ready()) return;
        if (!ARENA.JitsiAPI.hasVideo()) { // toggled
            ARENA.JitsiAPI.startVideo().then(_ => {
                videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-on.png')";
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
                ARENA.JitsiAPI.showVideo();
                ARENA.FaceTracker.trackFaceOff();
            })
        }
        else {
            videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-off.png')";
            ARENA.JitsiAPI.stopVideo().then(_ => {
                ARENA.JitsiAPI.hideVideo();
            })
        }
    });

    const avatarBtn = createIconButton("avatar3-off", "Face-recognition avatar on/off. You appear as a 3d-animated face.", () => {
        if (!ARENA.FaceTracker.hasAvatar()) { // toggled
            ARENA.FaceTracker.trackFaceOn().then(_ => {
                if (!ARENA.JitsiAPI.ready()) return;
                ARENA.JitsiAPI.stopVideo().then(_ => {
                    avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-on.png')";
                    videoBtn.childNodes[0].style.backgroundImage = "url('images/icons/video-off.png')";
                    ARENA.JitsiAPI.hideVideo();
                });
            })
        }
        else {
            ARENA.FaceTracker.trackFaceOff().then(_ => {
                avatarBtn.childNodes[0].style.backgroundImage = "url('images/icons/avatar3-off.png')";
            });
        }
    });

    let settingsButtons = []

    let speedState = 0;
    const speedBtn = createIconButton("speed-medium", "Change your movement speed.", () => {
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
            groundedPos.y = parseFloat(globals.startCoords.split(" ")[1]);
            globals.sceneObjects.myCamera.setAttribute("position", groundedPos);
            flyingBtn.childNodes[0].style.backgroundImage = "url('images/icons/flying-off.png')";
        }
        globals.sceneObjects.myCamera.setAttribute("wasd-controls", {"fly": globals.flying});
    });
    flyingBtn.style.display = "none";
    settingsButtons.push(flyingBtn);

    const screenShareButton = createIconButton("screen-on", "Share your screen in a new window", () => {
        if (!ARENA.JitsiAPI) return;

        const screenSharePrefix = ARENA.JitsiAPI.screenSharePrefix;
        swal({
            title: "You clicked on screen share!",
            text: `In order to share your screen, ARENA will open a new tab.\nAre you sure you want to share your screen?\nIf so, make sure you have screen share permissions enabled for this browser!`,
            icon: "warning",
            buttons: ["Cancel", "Yes"]
        })
        .then((confirmed) => {
            if (confirmed) {
                swal({
                    title: "You clicked on screen share!",
                    text: "Enter the name of an object you want to screenshare on:",
                    content: {
                        element: "input",
                        attributes: {
                            defaultValue: "screenshare",
                        }
                    }
                })
                .then((value) => {
                    const serverName = ARENA.JitsiAPI.serverName;
                    const id = value ? screenSharePrefix+value : screenSharePrefix;
                    window.open(`${defaults.screenSharePath}?scene=${globals.scenenameParam}&jitsiURL=${serverName}&id=${id}`, "_blank");
                })
            }
        });
    });
    screenShareButton.style.display = "none";
    settingsButtons.push(screenShareButton);

    const logoutBtn = createIconButton("logout-on", "Sign out of the ARENA", () => {
        swal({
            title: "You are about to sign out of the ARENA!",
            text: "Are you sure you want to sign out?",
            icon: "warning",
            dangerMode: true,
            buttons: ["Cancel", "Yes"]
        })
        .then((confirmed) => {
            if (confirmed) {
                signOut(); // --> ./auth.js
            }
        });
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
            settingsPopup.style.display = 'block'; // open settings panel
            loadSettings();
        }
        else {
            settingsBtn.childNodes[0].style.backgroundImage = "url('images/icons/more.png')";
            for (let i = 0; i < settingsButtons.length; i++) {
                settingsButtons[i].style.display = "none";
            }
            settingsPopup.style.display = 'none'; // close settings panel
            saveSettings();
        }
    });

    var iconsDiv = document.createElement('div');
    iconsDiv.setAttribute("id", "icons-div");
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

    // Add settings panel
    let settingsPopup = document.createElement("div");
    settingsPopup.className = "settings-popup";
    document.body.appendChild(settingsPopup);

    let closeSettingsBtn = document.createElement("span");
    closeSettingsBtn.className = "close";
    closeSettingsBtn.innerHTML = "&times";
    settingsPopup.appendChild(closeSettingsBtn);

    let formDiv = document.createElement("div");
    formDiv.className = "form-container";
    settingsPopup.appendChild(formDiv);

    let label = document.createElement("span");
    label.innerHTML = "Settings</br></br>";
    label.style.fontSize = "medium";
    formDiv.appendChild(label);

    formDiv.append("Authenticator: ");
    let authType = document.createElement("span");
    formDiv.appendChild(authType);
    formDiv.appendChild(document.createElement("br"));

    formDiv.append("Email: ");
    let authEmail = document.createElement("span");
    formDiv.appendChild(authEmail);
    formDiv.appendChild(document.createElement("br"));

    formDiv.append("Name: ");
    let authName = document.createElement("span");
    formDiv.appendChild(authName);
    formDiv.appendChild(document.createElement("br"));

    formDiv.appendChild(document.createElement("br"));

    label = document.createElement("span");
    label.innerHTML = "Display Name";
    formDiv.appendChild(label);

    const nameRegex = "^(?=[^A-Za-z]*[A-Za-z]{2,})[ -~]*$";
    let usernameInput = document.createElement("input");
    usernameInput.setAttribute("type", "text");
    usernameInput.setAttribute("placeholder", "Display Name");
    usernameInput.setAttribute("pattern", nameRegex);
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

    function loadSettings() {
        usernameInput.value = localStorage.getItem("display_name");
        var auth = getAuthStatus();
        authType.innerHTML = auth.type;
        authName.innerHTML = auth.name;
        authEmail.innerHTML = auth.email;
    }

    function saveSettings() {
        var re = new RegExp(nameRegex);
        // if name has at least one alpha char
        if (re.test(usernameInput.value)) {
            // remove extra spaces
            globals.displayName = usernameInput.value.replace(/\s+/g, " ").trim();
            localStorage.setItem("display_name", globals.displayName);  // save for next use
            publishHeadText(globals.displayName);  // push to other users' views
            const newSettingsEvent = new CustomEvent('newsettings', {  // push to local listeners
                detail: { name: globals.displayName }
            });
            window.dispatchEvent(newSettingsEvent);
        }
    }
}

window.addEventListener('onauth', setupIcons);
