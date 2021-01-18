/* global AFRAME, ARENA */
import Swal from 'sweetalert2';
import {ARENAJitsi} from '../jitsi.js';
import {ARENAEventEmitter} from '../event-emitter.js';
import './style.css';

const ICON_BTN_CLASS = 'arena-icon-button';

/**
 * Creates a button that will be dispalyed as an icon on the left of the screen
 * @param {string} initialImage name of initial image to be displayed
 * @param {string} tooltip tip to be displayed on hover
 * @param {function} onClick function that will be run on click
 * @return {Object} div that is the parent of the button
 */
function createIconButton(initialImage, tooltip, onClick) {
    // Create elements.
    const wrapper = document.createElement('div');
    const iconButton = document.createElement('button');
    iconButton.style.backgroundImage = `url('src/icons/images/${initialImage}.png')`;
    iconButton.className = ICON_BTN_CLASS;
    iconButton.setAttribute('id', 'btn-' + initialImage);
    iconButton.setAttribute('title', tooltip);

    // Insert elements.
    wrapper.appendChild(iconButton);
    iconButton.addEventListener('click', function(evt) {
        onClick();
        evt.stopPropagation();
    });

    return wrapper;
}

/**
 * SideMenu class
 */
export class SideMenu {
    /**
     * Set up various icons for side menu
     */
    static setupIcons() {
        /**
         * Create audio button
         */
        const audioBtn = createIconButton('audio-off', 'Microphone on/off.', () => {
            if (!ARENA.Jitsi) return;
            if (!ARENA.Jitsi.hasAudio) { // toggled
                ARENA.Jitsi.unmuteAudio()
                    .then(() => {
                        audioBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/audio-on.png\')';
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            } else {
                ARENA.Jitsi.muteAudio()
                    .then(() => {
                        audioBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/audio-off.png\')';
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
        });

        /**
         * Create video button
         */
        const videoBtn = createIconButton('video-off', 'Camera on/off. You appear as a video box.', () => {
            if (!ARENA.Jitsi) return;
            if (!ARENA.Jitsi.hasVideo) { // toggled
                ARENA.Jitsi.startVideo()
                    .then(() => {
                        videoBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/video-on.png\')';
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar3-off.png\')';
                        ARENA.Jitsi.showVideo();
                        if (ARENA.FaceTracker.running()) {
                            ARENA.FaceTracker.stop();
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            } else {
                videoBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/video-off.png\')';
                ARENA.Jitsi.stopVideo()
                    .then(() => {
                        ARENA.Jitsi.hideVideo();
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
        });

        /**
         * Create face tracking button
         */
        const avatarBtn = createIconButton('avatar3-off', 'Face-recognition on/off. You appear as a 3d-animated face.',
            () => {
                if (!ARENA.FaceTracker) return;
                if (!ARENA.FaceTracker.running()) { // toggled
                    ARENA.FaceTracker.run().then(() => {
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar3-on.png\')';
                        if (ARENA.Jitsi && ARENA.Jitsi.ready) {
                            ARENA.Jitsi.stopVideo().then(() => {
                                videoBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/video-off.png\')';
                                ARENA.Jitsi.hideVideo();
                            });
                        }
                    });
                } else {
                    ARENA.FaceTracker.stop().then(() => {
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar3-off.png\')';
                    });
                }
            });


        const settingsButtons = [];

        /**
         * Create speed button
         */
        let speedState = 0;
        const speedBtn = createIconButton('speed-medium', 'Change your movement speed.', () => {
            speedState = (speedState + 1) % 3;
            if (speedState == 0) { // medium
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-medium.png\')';
                if (!AFRAME.utils.device.isMobile()) {
                    document.getElementById('my-camera').setAttribute('wasd-controls', {'acceleration': 30});
                } else {
                    document.getElementById('my-camera').setAttribute('press-and-move', {'speed': 5.0});
                }
            } else if (speedState == 1) { // fast
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-fast.png\')';
                if (!AFRAME.utils.device.isMobile()) {
                    document.getElementById('my-camera').setAttribute('wasd-controls', {'acceleration': 60});
                } else {
                    document.getElementById('my-camera').setAttribute('press-and-move', {'speed': 10.0});
                }
            } else if (speedState == 2) { // slow
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-slow.png\')';
                if (!AFRAME.utils.device.isMobile()) {
                    document.getElementById('my-camera').setAttribute('wasd-controls', {'acceleration': 15});
                } else {
                    document.getElementById('my-camera').setAttribute('press-and-move', {'speed': 2.5});
                }
            }
        });
        speedBtn.style.display = 'none';
        settingsButtons.push(speedBtn);

        /**
         * Create flying on/off button
         */
        ARENA.flying = false;
        const flyingBtn = createIconButton('flying-off', 'Flying on/off.', () => {
            ARENA.flying = !ARENA.flying;
            if (ARENA.flying) { // toggled
                flyingBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/flying-on.png\')';
            } else {
                const groundedPos = document.getElementById('my-camera').getAttribute('position');
                groundedPos.y = parseFloat(ARENA.startCoords.split(' ')[1]);
                document.getElementById('my-camera').setAttribute('position', groundedPos);
                flyingBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/flying-off.png\')';
            }
            document.getElementById('my-camera').setAttribute('wasd-controls', {'fly': ARENA.flying});
        });
        flyingBtn.style.display = 'none';
        settingsButtons.push(flyingBtn);

        /**
         * Create screen share button
         */
        const screenShareButton = createIconButton('screen-on', 'Share your screen in a new window.', () => {
            if (!ARENA.Jitsi) return;

            const defaultScreenObj = ARENA.screenshare ? ARENA.screenshare : 'screenshare';
            Swal.fire({
                title: 'You clicked on screen share! Are you sure you want to share your screen?',
                html: `In order to share your screen, ARENA will open a new tab.<br>
                    <i>Make sure you have screen share permissions enabled for this browser!</i>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes',
            })
                .then((result) => {
                    if (!result.isConfirmed) return;
                    Swal.fire({
                        title: 'You clicked on screen share!',
                        text: 'Enter the name(s) of the object(s) you want to screenshare on (use commas for multiple objects):',
                        input: 'text',
                        inputValue: defaultScreenObj,
                        inputAttributes: {
                            autocapitalize: 'off',
                        },
                        showCancelButton: true,
                    })
                        .then((result) => {
                            if (!result.value) return;
                            let objectIds = result.value;
                            objectIds = objectIds.split(',');
                            for (let i = 0; i < objectIds.length; i++) {
                                if (objectIds[i]) {
                                    objectIds[i] = objectIds[i].trim();
                                }
                            }
                            const camera = document.getElementById('my-camera');
                            const screenshareWindow = window.open('./screenshare', '_blank');
                            screenshareWindow.params = {
                                jitsiURL: ARENA.Jitsi.serverName,
                                screenSharePrefix: ARENAJitsi.SCREENSHARE_PREFIX,
                                conferenceName: ARENA.Jitsi.arenaConferenceName,
                                displayName: camera ? camera.getAttribute('arena-camera').displayName : 'No Name',
                                camName: ARENA.camName,
                                objectIds: objectIds.join(),
                            };
                        });
                });
        });
        screenShareButton.style.display = 'none';
        settingsButtons.push(screenShareButton);

        /**
         * Create logout button
         */
        const logoutBtn = createIconButton('logout-on', 'Sign out of the ARENA.', () => {
            Swal.fire({
                title: 'You are about to sign out of the ARENA!',
                text: 'Are you sure you want to sign out?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
            })
                .then((result) => {
                    if (result.isConfirmed) {
                        signOut();
                    }
                });
        });
        logoutBtn.style.display = 'none';
        settingsButtons.push(logoutBtn);

        /**
         * Create additional setting button
         */
        let expanded = false;
        const settingsBtn = createIconButton('more', 'Additional settings', () => {
            expanded = !expanded;
            if (expanded) { // toggled
                settingsBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/less.png\')';
                for (let i = 0; i < settingsButtons.length; i++) {
                    settingsButtons[i].style.display = 'block';
                }
                settingsPopup.style.display = 'block'; // open settings panel
                loadSettings();
            } else {
                settingsBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/more.png\')';
                for (let i = 0; i < settingsButtons.length; i++) {
                    settingsButtons[i].style.display = 'none';
                }
                settingsPopup.style.display = 'none'; // close settings panel
                saveSettings();
            }
        });


        const iconsDiv = document.createElement('div');
        iconsDiv.setAttribute('id', 'icons-div');
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


        /**
         * Add settings panel
         */
        const settingsPopup = document.createElement('div');
        settingsPopup.className = 'settings-popup';
        document.body.appendChild(settingsPopup);

        const closeSettingsBtn = document.createElement('span');
        closeSettingsBtn.className = 'close';
        closeSettingsBtn.innerHTML = '&times';
        settingsPopup.appendChild(closeSettingsBtn);

        const formDiv = document.createElement('div');
        formDiv.className = 'form-container';
        settingsPopup.appendChild(formDiv);

        let label = document.createElement('span');
        label.innerHTML = 'Settings</br></br>';
        label.style.fontSize = 'medium';
        formDiv.appendChild(label);

        const stats = document.createElement('a');
        stats.href = '#';
        stats.innerHTML = 'Toggle Stats</br></br>';
        stats.onclick = function() {
            //showPerms();
            let sceneEl = document.querySelector('a-scene');
            let statsEl = sceneEl.getAttribute('stats');
            sceneEl.setAttribute('stats', !statsEl);
        };
        formDiv.appendChild(stats);

        const perms = document.createElement('a');
        perms.href = '#';
        perms.innerHTML = 'MQTT Permissions';
        perms.onclick = function() {
            showPerms();
        };
        formDiv.appendChild(perms);
        formDiv.appendChild(document.createElement('br'));

        formDiv.append('Scene: ');
        const sceneName = document.createElement('span');
        formDiv.appendChild(sceneName);
        formDiv.appendChild(document.createElement('br'));

        formDiv.append('Authenticator: ');
        const authType = document.createElement('span');
        authType.style.textTransform = 'capitalize';
        formDiv.appendChild(authType);
        formDiv.appendChild(document.createElement('br'));

        formDiv.append('Username: ');
        const authUsername = document.createElement('span');
        formDiv.appendChild(authUsername);
        formDiv.appendChild(document.createElement('br'));

        formDiv.append('Email: ');
        const authEmail = document.createElement('span');
        formDiv.appendChild(authEmail);
        formDiv.appendChild(document.createElement('br'));

        formDiv.append('Name: ');
        const authFullname = document.createElement('span');
        formDiv.appendChild(authFullname);
        formDiv.appendChild(document.createElement('br'));

        formDiv.appendChild(document.createElement('br'));

        label = document.createElement('span');
        label.innerHTML = 'Display Name';
        formDiv.appendChild(label);

        const nameRegex = '^(?=[^A-Za-z]*[A-Za-z]{2,})[ -~]*$';
        const usernameInput = document.createElement('input');
        usernameInput.setAttribute('type', 'text');
        usernameInput.setAttribute('placeholder', 'Display Name');
        usernameInput.setAttribute('pattern', nameRegex);
        formDiv.appendChild(usernameInput);

        const saveSettingsBtn = document.createElement('button');
        saveSettingsBtn.innerHTML = 'Save';
        formDiv.appendChild(saveSettingsBtn);

        closeSettingsBtn.onclick = function() {
            settingsPopup.style.display = 'none'; // close settings panel
            saveSettings();
        };

        saveSettingsBtn.onclick = function() {
            saveSettings();
        };

        /**
         * Loads the settings popup
         */
        function loadSettings() {
            usernameInput.value = localStorage.getItem('display_name');
            const auth = getAuthStatus();
            sceneName.innerHTML = ARENA.sceneName;
            authType.innerHTML = auth.type;
            authUsername.innerHTML = auth.username;
            authFullname.innerHTML = auth.fullname;
            authEmail.innerHTML = auth.email;
        }

        /**
         * Saves the display name when changed
         */
        function saveSettings() {
            const re = new RegExp(nameRegex);
            // if name has at least one alpha char
            if (re.test(usernameInput.value)) {
                // remove extra spaces
                const displayName = usernameInput.value.replace(/\s+/g, ' ').trim();
                localStorage.setItem('display_name', displayName); // save for next use
                const camera = document.getElementById('my-camera');
                camera.setAttribute('arena-camera', 'displayName', displayName); // push to other users' views
                ARENA.events.emit(ARENAEventEmitter.events.NEW_SETTINGS, {userName: displayName});
            }
        }
    }
}
