/* global AFRAME, ARENA */
import Swal from 'sweetalert2';
import {ARENAJitsi} from '../jitsi.js';
import {ARENAEventEmitter} from '../event-emitter.js';
import './style.css';

const ICON_BTN_CLASS = 'arena-icon-button';

// fullscreen exit handlers
if (document.addEventListener) {
    document.addEventListener('fullscreenchange', fullScreenExitHandler, false);
    document.addEventListener('mozfullscreenchange', fullScreenExitHandler, false);
    document.addEventListener('MSFullscreenChange', fullScreenExitHandler, false);
    document.addEventListener('webkitfullscreenchange', fullScreenExitHandler, false);
}

/**
 * Handle exit from full screen scenarios
 */
function fullScreenExitHandler() {
    if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null) {
        // manually disable a-frame stats
        const sceneEl = document.querySelector('a-scene');
        sceneEl.removeAttribute('stats');
    }
}

/**
 * Creates a button that will be displayed as an icon on the left of the screen
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

        // Button focus is different per browser, so set manual focus. In general, we need to check
        // UI elements on our overlay that can keep input focus, since the natural implementation
        // on most browsers is that input elements capture tab/arrow/+chars for DOM navigation and
        // input.

        // Chrome appears to leave focus on the button, but we need it back to body for 3D navigation.
        document.activeElement.blur();
        document.body.focus();
    });

    wrapper.onClick = onClick;
    return wrapper;
}

/**
 * SideMenu class
 */
export class SideMenu {
    // we will save a list of the buttons other modules can request to be clicked
    static _buttonList = [];

    // button names, to be used by other modules
    static buttons = {
        AUDIO: 'audio',
        VIDEO: 'video',
        AVATAR: 'avatar',
        SPEED: 'speed',
        FLYING: 'fly',
        SCREENSHARE: 'screenshare',
        AVSETTINGS: 'av-settings',
        LOGOUT: 'logout',
    };

    /**
     * Set up various icons for side menu
     */
    static setupIcons() {
        /**
         * Create audio button
         */
        const myCam = document.getElementById('my-camera');
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
        this._buttonList[this.buttons.AUDIO] = audioBtn;

        /**
         * Create video button
         */
        const videoBtn = createIconButton('video-off', 'Camera on/off. You appear as a video box.', () => {
            if (!ARENA.Jitsi) return;
            if (!ARENA.Jitsi.hasVideo) { // toggled
                ARENA.Jitsi.startVideo()
                    .then(() => {
                        videoBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/video-on.png\')';
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar-off.png\')';
                        ARENA.Jitsi.showVideo();
                        const faceTracker = document.querySelector('a-scene').systems['face-tracking'];
                        if (faceTracker !== undefined && faceTracker.isRunning()) {
                            faceTracker.stop();
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
        this._buttonList[this.buttons.VIDEO] = videoBtn;

        /**
         * Create AV Settings button
         */
        const url = new URL(window.location.href);
        const avSettingsBtn = createIconButton('options', 'Change A/V options',
            () => window.setupAV(ARENA.Jitsi.avConnect.bind(ARENA.Jitsi)));
        if (ARENA.isJitsiPermitted()) {
            this._buttonList[this.buttons.AVSETTINGS] = avSettingsBtn;
        }


        const settingsButtons = [];

        /**
         * Create face tracking button
         */
        const avatarBtn = createIconButton('avatar-off', 'Face-recognition on/off. You appear as a 3d-animated face.',
            async () => {
                let faceTracker = document.querySelector('a-scene').systems['face-tracking'];
                if (faceTracker === undefined) {
                    await import('../systems/face-tracking');
                    faceTracker = document.querySelector('a-scene').systems['face-tracking'];
                    if (!faceTracker) return;
                }
                if (!faceTracker.isRunning()) { // toggled
                    faceTracker.run().then(() => {
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar-on.png\')';
                        if (ARENA.Jitsi && ARENA.Jitsi.ready) {
                            ARENA.Jitsi.stopVideo().then(() => {
                                videoBtn.childNodes[0].style.backgroundImage =
                                                                        'url(\'src/icons/images/video-off.png\')';
                                ARENA.Jitsi.hideVideo();
                            });
                        }
                    });
                } else {
                    faceTracker.stop().then(() => {
                        avatarBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/avatar-off.png\')';
                    });
                }
            });
        avatarBtn.style.display = 'none';
        settingsButtons.push(avatarBtn);
        this._buttonList[this.buttons.AVATAR] = avatarBtn;

        /**
         * Create speed button
         */
        let speedState = 0;
        const speedMod = Number(ARENA.sceneOptions?.speedModifier) || 1;
        if (speedMod) { // Set new initial speed if applicable
            myCam.setAttribute('wasd-controls', {'acceleration': 30 * speedMod});
            myCam.setAttribute('press-and-move', {'acceleration': 30 * speedMod});
        }
        const speedBtn = createIconButton('speed-medium', 'Change your movement speed.', () => {
            speedState = (speedState + 1) % 3;
            if (speedState === 0) { // medium
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-medium.png\')';
                myCam.setAttribute('wasd-controls', {'acceleration': 30 * speedMod});
                myCam.setAttribute('press-and-move', {'acceleration': 30 * speedMod});
            } else if (speedState === 1) { // fast
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-fast.png\')';
                myCam.setAttribute('wasd-controls', {'acceleration': 60 * speedMod});
                myCam.setAttribute('press-and-move', {'acceleration': 60 * speedMod});
            } else if (speedState === 2) { // slow
                speedBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/speed-slow.png\')';
                myCam.setAttribute('wasd-controls', {'acceleration': 15 * speedMod});
                myCam.setAttribute('press-and-move', {'acceleration': 15 * speedMod});
            }
        });
        speedBtn.style.display = 'none';
        settingsButtons.push(speedBtn);
        this._buttonList[this.buttons.SPEED] = speedBtn;

        /**
         * Create flying on/off button
         */
        let flying = false;
        const flyingBtn = createIconButton('flying-off', 'Flying on/off.', () => {
            flying = !flying;
            if (flying) { // toggled on
                flyingBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/flying-on.png\')';
            } else { // toggled off
                myCam.components['wasd-controls'].resetNav();
                myCam.components['press-and-move'].resetNav();
                myCam.object3D.position.y = ARENA.startCoords.y + ARENA.defaults.camHeight;
                flyingBtn.childNodes[0].style.backgroundImage = 'url(\'src/icons/images/flying-off.png\')';
            }
            myCam.setAttribute('wasd-controls', {'fly': flying});
            myCam.setAttribute('press-and-move', {'fly': flying});
        });
        flyingBtn.style.display = 'none';
        settingsButtons.push(flyingBtn);
        this._buttonList[this.buttons.FLYING] = flyingBtn;

        /**
         * Create screen share button
         */
        const screenShareButton = createIconButton('screen-on', 'Share your screen in a new window.', () => {
            if (!ARENA.Jitsi) return;

            Swal.fire({
                title: 'You clicked on screen share! Are you sure you want to share your screen?',
                html: `In order to share your screen, ARENA will open a new tab.<br>
                    <i>Make sure you have screen share permissions enabled for this browser!</i>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                reverseButtons: true,
            })
                .then((result) => {
                    if (!result.isConfirmed) return;
                    Swal.fire({
                        title: 'Select the object(s) you want to screenshare on:',
                        html: document.querySelector('a-scene').systems['screenshareable'].asHTMLSelect(),
                        focusConfirm: false,
                        preConfirm: () => {
                            return Array.from(document.getElementById('screenshareables').
                                querySelectorAll('option:checked'), (e) => e.value);
                        },
                        showCancelButton: true,
                        reverseButtons: true,
                    })
                        .then((result) => {
                            if (!result.isConfirmed || result.value.length == 0) return;
                            const objectIds = result.value;

                            const screenshareWindow = window.open('./screenshare', '_blank');
                            screenshareWindow.params = {
                                connectOptions: ARENA.Jitsi.connectOptions,
                                appID: ARENAJitsi.ARENA_APP_ID,
                                token: ARENA.mqttToken,
                                screenSharePrefix: ARENAJitsi.SCREENSHARE_PREFIX,
                                conferenceName: ARENA.Jitsi.arenaConferenceName,
                                displayName: myCam ? myCam.getAttribute('arena-camera').displayName : 'No Name',
                                camName: ARENA.camName,
                                objectIds: objectIds.join(),
                            };
                        });
                });
        });
        screenShareButton.style.display = 'none';
        settingsButtons.push(screenShareButton);
        this._buttonList[this.buttons.SCREENSHARE] = screenShareButton;

        /**
         * Create logout button
         */
        const logoutBtn = createIconButton('logout', 'Sign out of the ARENA.', () => {
            Swal.fire({
                title: 'You are about to sign out of the ARENA!',
                text: 'Are you sure you want to sign out?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                reverseButtons: true,
            })
                .then((result) => {
                    if (result.isConfirmed) {
                        signOut();
                    }
                });
        });
        logoutBtn.style.display = 'none';
        settingsButtons.push(logoutBtn);
        this._buttonList[this.buttons.LOGOUT] = logoutBtn;

        /**
         * Create additional setting button
         */
        let expanded = false;
        const settingsBtn = document.getElementById('icons-div-expand-button');
        document.getElementById('icons-div-expand').addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) { // toggled
                settingsBtn.classList.replace('fa-angle-down', 'fa-angle-up');
                for (let i = 0; i < settingsButtons.length; i++) {
                    settingsButtons[i].style.display = 'block';
                }
                settingsPopup.style.display = 'block'; // open settings panel
                loadSettings();
            } else {
                settingsBtn.classList.replace('fa-angle-up', 'fa-angle-down');
                for (let i = 0; i < settingsButtons.length; i++) {
                    settingsButtons[i].style.display = 'none';
                }
                settingsPopup.style.display = 'none'; // close settings panel
                saveSettings();
            }
        });


        const iconsDiv = document.getElementById('icons-div');
        const isJitsi = ARENA.isJitsiPermitted();
        const isUsers = ARENA.isUsersPermitted();
        if (isJitsi) {
            iconsDiv.appendChild(audioBtn);
            iconsDiv.appendChild(videoBtn);
            iconsDiv.appendChild(avSettingsBtn);
        }
        if (isUsers && !AFRAME.utils.device.isMobile()) {
            iconsDiv.appendChild(avatarBtn); // no avatar on mobile - face model is too large
        }
        iconsDiv.appendChild(speedBtn);
        iconsDiv.appendChild(flyingBtn);
        if (isJitsi && !AFRAME.utils.device.isMobile()) {
            iconsDiv.appendChild(screenShareButton); // no screenshare on mobile - doesn't work
        }
        iconsDiv.appendChild(logoutBtn);
        iconsDiv.parentElement.classList.remove('d-none');

        /**
         * Add settings panel
         */
        const settingsPopup = document.createElement('div');
        settingsPopup.className = 'settings-popup px-3 py-1'; // remove bg-white to inherit transparency
        document.body.appendChild(settingsPopup);

        const closeSettingsBtn = document.createElement('span');
        closeSettingsBtn.className = 'close pe-2';
        closeSettingsBtn.innerHTML = '&times';
        settingsPopup.appendChild(closeSettingsBtn);

        const formDiv = document.createElement('div');
        formDiv.className = 'pb-3';
        settingsPopup.appendChild(formDiv);

        let label = document.createElement('span');
        label.innerHTML = 'Settings';
        label.style.fontSize = 'medium';
        label.style.fontStyle = 'bold';
        formDiv.appendChild(label);

        // Scene status dialogs
        const statusDiv = document.createElement('div');
        appendBold(statusDiv, 'Status: ');
        formDiv.appendChild(statusDiv);

        const credits = document.createElement('a');
        credits.href = '#';
        credits.innerHTML = 'Credits';
        credits.title = 'Show the credits for models in the scene';
        credits.onclick = showCredits;
        statusDiv.appendChild(credits);

        statusDiv.append(' | ');

        const stats = document.createElement('a');
        stats.href = '#';
        stats.innerHTML = 'Stats';
        stats.title = 'Show the A-Frame performance stats and user pose data for you';
        stats.onclick = showStats;
        statusDiv.append(stats);

        statusDiv.append(' | ');

        const perms = document.createElement('a');
        perms.href = '#';
        perms.innerHTML = 'Permissions';
        perms.title = 'Show the security permissions for you in the scene';
        perms.onclick = showPerms;
        statusDiv.appendChild(perms);

        // Page links
        const pagesDiv = document.createElement('div');
        appendBold(pagesDiv, 'Pages: ');
        formDiv.appendChild(pagesDiv);

        const edit = document.createElement('a');
        edit.href = `/build/?scene=${ARENA.namespacedScene}`;
        edit.target = '_blank';
        edit.rel = 'noopener noreferrer';
        edit.innerHTML = 'Editor';
        edit.title = 'Open the Scene Editor for this scene in a new page';
        pagesDiv.appendChild(edit);

        pagesDiv.append(' | ');

        const profile = document.createElement('a');
        profile.href = '#';
        profile.innerHTML = 'Profile';
        profile.onclick = showProfile;
        pagesDiv.append(profile);

        pagesDiv.append(' | ');

        const docs = document.createElement('a');
        docs.href = 'https://docs.arenaxr.org';
        docs.target = '_blank';
        docs.rel = 'noopener noreferrer';
        docs.innerHTML = 'Docs';
        docs.title = 'Open the ARENA documentation in another page';
        pagesDiv.appendChild(docs);

        pagesDiv.append(' | ');

        const version = document.createElement('a');
        version.href = '/conf/versions.html';
        version.target = '_blank';
        version.rel = 'noopener noreferrer';
        version.innerHTML = 'Version';
        version.title = 'Show the ARENA versions listed on a new page';
        pagesDiv.appendChild(version);

        // Auth status
        appendBold(formDiv, 'Scene: ');
        const sceneName = document.createElement('span');
        formDiv.appendChild(sceneName);
        if (ARENA.isUserSceneWriter()) { // add permissions link
            formDiv.append(" (");
            const aSec = document.createElement("a");
            aSec.href = `/user/profile/scenes/${ARENA.namespacedScene}`;
            aSec.target = "_blank";
            aSec.rel = "noopener noreferrer";
            aSec.innerHTML = "Security";
            aSec.title = 'Open the security controls for the scene (editors only)';
            formDiv.appendChild(aSec);
            formDiv.append(")");
        }
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Authenticator: ');
        const authType = document.createElement('span');
        authType.style.textTransform = 'capitalize';
        formDiv.appendChild(authType);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'ARENA Username: ');
        const authUsername = document.createElement('span');
        formDiv.appendChild(authUsername);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Email: ');
        const authEmail = document.createElement('span');
        formDiv.appendChild(authEmail);
        formDiv.appendChild(document.createElement('br'));

        appendBold(formDiv, 'Name: ');
        const authFullname = document.createElement('span');
        formDiv.appendChild(authFullname);

        const usernameInputDiv = document.createElement('div');
        usernameInputDiv.className = 'my-2';

        label = document.createElement('label');
        label.className= 'form-label mb-0';
        label.setAttribute('for', 'settingsUsernameInput');
        label.innerHTML = 'Display Name';
        usernameInputDiv.appendChild(label);

        const nameRegex = '^(?=[^A-Za-z]*[A-Za-z]{2,})[ -~]*$';
        const usernameInput = document.createElement('input');
        usernameInput.setAttribute('type', 'text');
        usernameInput.setAttribute('pattern', nameRegex);
        usernameInput.setAttribute('name', 'settingsUsernameInput');
        usernameInput.className='form-control';
        usernameInputDiv.appendChild(usernameInput);

        formDiv.appendChild(usernameInputDiv);

        const saveSettingsBtn = document.createElement('button');
        saveSettingsBtn.innerHTML = 'Save';
        saveSettingsBtn.className = 'btn btn-info btn-sm';
        formDiv.appendChild(saveSettingsBtn);

        const iconCredits = document.createElement('p');
        iconCredits.innerHTML = 'Icons made by <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a>, <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>';
        formDiv.appendChild(iconCredits);

        closeSettingsBtn.onclick = function() {
            settingsPopup.style.display = 'none'; // close settings panel
            saveSettings();
        };

        saveSettingsBtn.onclick = function() {
            saveSettings();
        };

        /**
         * Embolden text.
         * @param {*} el Element object
         * @param {*} text Text to bold
         */
        function appendBold(el, text) {
            const b = document.createElement('b');
            b.innerText = text;
            el.append(b);
        }

        /**
         * Show the Aframe stats and camera pose.
         */
        function showStats(e) {
            e.preventDefault();
            const sceneEl = document.querySelector('a-scene');
            const statsEl = sceneEl.getAttribute('stats');
            sceneEl.setAttribute('stats', !statsEl);
            const cam = document.getElementById('my-camera');
            const showStats = cam.getAttribute('arena-camera').showStats;
            cam.setAttribute('arena-camera', {
                showStats: !showStats,
            });
        }

        /**
         * Show the modeling credits.
         */
        function showCredits(e) {
            e.preventDefault();
            settingsPopup.style.display = 'none'; // close settings panel
            const attrSystem = document.querySelector('a-scene').systems['attribution'];
            let attrTable = undefined;
            if (attrSystem) {
                attrTable = attrSystem.getAttributionTable();
            }
            if (attrTable === undefined) {
                Swal.fire({
                    title: 'Scene Credits',
                    text: 'Could not find any attributions (did you add an attribution component to models?).',
                    icon: 'error',
                }).then(() => {
                    settingsPopup.style.display = 'block'; // show settings panel
                });
                return;
            }
            Swal.fire({
                title: 'Scene Credits',
                html: attrTable,
                width: 800,
                focusConfirm: false,
                showCancelButton: false,
                cancelButtonText: 'Cancel',
            }).then(() => {
                settingsPopup.style.display = 'block';
            });
        }

        /**
         * Loads the settings popup
         */
        function loadSettings() {
            usernameInput.value = localStorage.getItem('display_name');
            const auth = getAuthStatus();
            sceneName.textContent = ARENA.namespacedScene;
            authType.textContent = auth.type;
            authUsername.textContent = auth.username;
            authFullname.textContent = auth.fullname;
            authEmail.textContent = auth.email;
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
                myCam.setAttribute('arena-camera', 'displayName', displayName); // push to other users' views
                ARENA.events.emit(ARENAEventEmitter.events.NEW_SETTINGS, {userName: displayName});
            }
        }
    }

    /**
     * Other modules can call this to request a click on a button
     * @param {string} button the button name. Use SideMenu.buttons constants
     */
    static clickButton(button) {
        this._buttonList[button].onClick();
    }
}
