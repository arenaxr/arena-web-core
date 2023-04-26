/* global AFRAME, ARENA */
import Swal from 'sweetalert2';
import {ARENAJitsi} from '../../jitsi';
import {ARENAEventEmitter} from '../../event-emitter';
import './remove-stats-exit-fullscreen';
import './style.css';

const ICON_BTN_CLASS = 'arena-icon-button';

/**
 * SideMenu component
 */
AFRAME.registerComponent('arena-side-menu', {
    schema: {
        enabled: {default: true},
        audioButtonEnabled: {default: true},
        videoButtonEnabled: {default: true},
        faceTrackingButtonEnabled: {default: true},
        speedButtonEnabled: {default: true},
        flyingButtonEnabled: {default: true},
        screenshareButtonEnabled: {default: true},
        avSettingsButtonEnabled: {default: true},
        logoutButtonEnabled: {default: true},
        additionalSettingsButtonEnabled: {default: true},
    },

    dependencies: ['remove-stats-exit-fullscreen'],

    init: function() {
        const data = this.data;
        const el = this.el;

        const sceneEl = el;
        const cameraEl = sceneEl.camera.el;

        if (this.data.enabled === false) return;

        // button names, to be used by other modules
        this.buttons = {
            AUDIO:          'audio',
            VIDEO:          'video',
            AVATAR:         'avatar',
            SPEED:          'speed',
            FLYING:         'fly',
            SCREENSHARE:    'screenshare',
            AVSETTINGS:     'av-settings',
            LOGOUT:         'logout',
        };

        // we will save a list of the buttons other modules can request to be clicked
        this._buttonList = [];

        /**
         * Create audio button
         */
        if (data.audioButtonEnabled) {
            this.audioButton = createIconButton('audio-off', 'Microphone on/off.', () => {
                if (!ARENA.Jitsi.hasAudio) { // toggled
                    ARENA.Jitsi.unmuteAudio()
                        .then(() => {
                            this.audioButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/audio-on.png\')';
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                } else {
                    ARENA.Jitsi.muteAudio()
                        .then(() => {
                            this.audioButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/audio-off.png\')';
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            });
            this._buttonList[this.buttons.AUDIO] = this.audioButton;
        }

        /**
         * Create video button
         */
        if (data.videoButtonEnabled) {
            this.videoButton = createIconButton('video-off', 'Camera on/off. You appear as a video box.', () => {
                if (!ARENA.Jitsi.hasVideo) { // toggled
                    if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

                    ARENA.Jitsi.startVideo()
                        .then(() => {
                            this.videoButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/video-on.png\')';
                            this.avatarButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/avatar-off.png\')';
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
                    this.videoButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/video-off.png\')';
                    ARENA.Jitsi.stopVideo()
                        .then(() => {
                            ARENA.Jitsi.hideVideo();
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            });
            this._buttonList[this.buttons.VIDEO] = this.videoButton;
        }

        /**
         * Create AV Settings button
         */
        if (data.avSettingsButtonEnabled) {
            const url = new URL(window.location.href);
            this.avSettingsButton = createIconButton('options', 'Change A/V options', () => {
                if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

                window.setupAV(ARENA.Jitsi.avConnect.bind(ARENA.Jitsi))
            });

            if (ARENA.isJitsiPermitted()) {
                this._buttonList[this.buttons.AVSETTINGS] = this.avSettingsButton;
            }
        }

        this.settingsButtons = [];

        /**
         * Create face tracking button
         */
        if (data.faceTrackingButtonEnabled) {
            this.avatarButton = createIconButton('avatar-off', 'Face-recognition on/off. You appear as a 3d-animated face.',
                async () => {
                    if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

                    let faceTracker = document.querySelector('a-scene').systems['face-tracking'];
                    if (faceTracker === undefined) {
                        await import('../../systems/face-tracking/index.js');
                        faceTracker = document.querySelector('a-scene').systems['face-tracking'];
                        if (!faceTracker) return;
                    }
                    if (!faceTracker.isRunning()) { // toggled
                        faceTracker.run().then(() => {
                            this.avatarButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/avatar-on.png\')';
                            if (ARENA.Jitsi && ARENA.Jitsi.ready) {
                                ARENA.Jitsi.stopVideo().then(() => {
                                    this.videoButton.childNodes[0].style.backgroundImage =
                                                                            'url(\'src/ui/icons/images/video-off.png\')';
                                    ARENA.Jitsi.hideVideo();
                                });
                            }
                        });
                    } else {
                        faceTracker.stop().then(() => {
                            this.avatarButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/avatar-off.png\')';
                        });
                    }
                });
            this.avatarButton.style.display = 'none';
            this.settingsButtons.push(this.avatarButton);
            this._buttonList[this.buttons.AVATAR] = this.avatarButton;
        }

        /**
         * Create speed button
         */
        if (data.speedButtonEnabled) {
            let speedState = 0;
            const speedMod = Number(ARENA.sceneOptions?.speedModifier) || 1;
            if (speedMod) { // Set new initial speed if applicable
                cameraEl.setAttribute('wasd-controls', {'acceleration': 30 * speedMod});
                cameraEl.setAttribute('press-and-move', {'acceleration': 30 * speedMod});
            }
            this.speedButton = createIconButton('speed-medium', 'Change your movement speed.', () => {
                if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

                speedState = (speedState + 1) % 3;
                if (speedState === 0) { // medium
                    this.speedButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/speed-medium.png\')';
                    cameraEl.setAttribute('wasd-controls', {'acceleration': 30 * speedMod});
                    cameraEl.setAttribute('press-and-move', {'acceleration': 30 * speedMod});
                } else if (speedState === 1) { // fast
                    this.speedButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/speed-fast.png\')';
                    cameraEl.setAttribute('wasd-controls', {'acceleration': 60 * speedMod});
                    cameraEl.setAttribute('press-and-move', {'acceleration': 60 * speedMod});
                } else if (speedState === 2) { // slow
                    this.speedButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/speed-slow.png\')';
                    cameraEl.setAttribute('wasd-controls', {'acceleration': 15 * speedMod});
                    cameraEl.setAttribute('press-and-move', {'acceleration': 15 * speedMod});
                }
            });
            this.speedButton.style.display = 'none';
            this.settingsButtons.push(this.speedButton);
            this._buttonList[this.buttons.SPEED] = this.speedButton;
        }

        /**
         * Create flying on/off button
         */
        if (data.flyingButtonEnabled) {
            let flying = false;
            this.flyingButton = createIconButton('flying-off', 'Flying on/off.', () => {
                if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

                flying = !flying;
                if (flying) { // toggled on
                    this.flyingButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/flying-on.png\')';
                } else { // toggled off
                    cameraEl.components['wasd-controls'].resetNav();
                    cameraEl.components['press-and-move'].resetNav();
                    cameraEl.object3D.position.y = ARENA.startCoords.y + ARENA.defaults.camHeight;
                    this.flyingButton.childNodes[0].style.backgroundImage = 'url(\'src/ui/icons/images/flying-off.png\')';
                }
                cameraEl.setAttribute('wasd-controls', {'fly': flying});
                cameraEl.setAttribute('press-and-move', {'fly': flying});
            });
            this.flyingButton.style.display = 'none';
            this.settingsButtons.push(this.flyingButton);
            this._buttonList[this.buttons.FLYING] = this.flyingButton;
        }

        /**
         * Create screen share button
         */
        if (data.screenshareButtonEnabled) {
            this.screenshareButton = createIconButton('screen-on', 'Share your screen in a new window.', () => {
                if (sceneEl.is('vr-mode') || sceneEl.is('ar-mode')) return;

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
                                    displayName: camera ? cameraEl.getAttribute('arena-camera').displayName : 'No Name',
                                    camName: ARENA.camName,
                                    objectIds: objectIds.join(),
                                };
                            });
                    });
            });
            this.screenshareButton.style.display = 'none';
            this.settingsButtons.push(this.screenshareButton);
            this._buttonList[this.buttons.SCREENSHARE] = this.screenshareButton;
        }

        /**
         * Create logout button
         */
        if (data.logoutButtonEnabled) {
            this.logoutButton = createIconButton('logout', 'Sign out of the ARENA.', () => {
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
            this.logoutButton.style.display = 'none';
            this.settingsButtons.push(this.logoutButton);
            this._buttonList[this.buttons.LOGOUT] = this.logoutButton;
        }

        /**
         * Create additional setting button
         */
        if (data.additionalSettingsButtonEnabled) {
            let expanded = false;
            this.settingsButton = document.getElementById('icons-div-expand-button');
            document.getElementById('icons-div-expand').addEventListener('click', () => {
                expanded = !expanded;
                if (expanded) { // toggled
                    this.settingsButton.classList.replace('fa-angle-down', 'fa-angle-up');
                    for (let i = 0; i < this.settingsButtons.length; i++) {
                        this.settingsButtons[i].style.display = 'block';
                    }
                    settingsPopup.style.display = 'block'; // open settings panel
                    loadSettings();
                } else {
                    this.settingsButton.classList.replace('fa-angle-up', 'fa-angle-down');
                    for (let i = 0; i < this.settingsButtons.length; i++) {
                        this.settingsButtons[i].style.display = 'none';
                    }
                    settingsPopup.style.display = 'none'; // close settings panel
                    saveSettings();
                }
            });

            const iconsDiv = document.getElementById('icons-div');
            const isJitsi = ARENA.isJitsiPermitted();
            const isUsers = ARENA.isUsersPermitted();
            if (isJitsi) {
                iconsDiv.appendChild(this.audioButton);
                iconsDiv.appendChild(this.videoButton);
                iconsDiv.appendChild(this.avSettingsButton);
            }
            if (isUsers && !AFRAME.utils.device.isMobile()) {
                iconsDiv.appendChild(this.avatarButton); // no avatar on mobile - face model is too large
            }
            iconsDiv.appendChild(this.speedButton);
            iconsDiv.appendChild(this.flyingButton);
            if (isJitsi && !AFRAME.utils.device.isMobile()) {
                iconsDiv.appendChild(this.screenshareButton); // no screenshare on mobile - doesn't work
            }
            iconsDiv.appendChild(this.logoutButton);
            iconsDiv.parentElement.classList.remove('d-none');

            /**
             * Add settings panel
             */
            const settingsPopup = document.createElement('div');
            settingsPopup.className = 'settings-popup px-3 py-1'; // remove bg-white to inherit transparency
            document.body.appendChild(settingsPopup);

            const closeSettingsButton = document.createElement('span');
            closeSettingsButton.className = 'close pe-2';
            closeSettingsButton.innerHTML = '&times';
            settingsPopup.appendChild(closeSettingsButton);

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

            if (ARENA.isUserSceneWriter()) { // add permissions link
                pagesDiv.append('Edit (');

                const edit = document.createElement('a');
                edit.href = `/build/?scene=${ARENA.namespacedScene}`;
                edit.target = '_blank';
                edit.rel = 'noopener noreferrer';
                edit.innerHTML = 'JSON';
                edit.title = 'Open the Scene Editor for this scene in a new page';
                pagesDiv.appendChild(edit);

                pagesDiv.append(', ');

                const edit3d = document.createElement('a');
                edit3d.href = `/${ARENA.namespacedScene}?build3d=1`;
                edit3d.target = '_blank';
                edit3d.rel = 'noopener noreferrer';
                edit3d.innerHTML = '3D';
                pagesDiv.appendChild(edit3d);

                pagesDiv.append(') | ');
            }
            const profile = document.createElement('a');
            profile.href = '#';
            profile.innerHTML = 'Profile';
            profile.title = 'Open your user account Profile in a new page';
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

            const saveSettingsButton = document.createElement('button');
            saveSettingsButton.innerHTML = 'Save';
            saveSettingsButton.className = 'btn btn-info btn-sm';
            formDiv.appendChild(saveSettingsButton);

            const iconCredits = document.createElement('p');
            iconCredits.innerHTML = 'Icons made by <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a>, <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>';
            formDiv.appendChild(iconCredits);

            closeSettingsButton.onclick = function() {
                settingsPopup.style.display = 'none'; // close settings panel
                saveSettings();
            };

            saveSettingsButton.onclick = function() {
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
                    cameraEl.setAttribute('arena-camera', 'displayName', displayName); // push to other users' views
                    ARENA.events.emit(ARENAEventEmitter.events.NEW_SETTINGS, {userName: displayName});
                }
            }
        }
    },

    clickButton: function(button) {
        this._buttonList[button].onClick();
    },

    update: function(oldData) {
    },
});

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
    iconButton.style.backgroundImage = `url('src/ui/icons/images/${initialImage}.png')`;
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
