/**
 * @fileoverview Useful misc utility functions
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

const { isIOS, isTablet, isR7, isMobileVR } = AFRAME.utils.device;

/**
 * Wrapper class for various utility functions
 */
export default class ARENAUtils {
    /**
     * Extracts URL params
     * @param {string} parameter URL parameter
     * @param {string} defaultValue default value in case parameter doesn't exist
     * @return {string} value associated with parameter
     */
    static getUrlParam(parameter, defaultValue) {
        const urlParameter = AFRAME.utils.getUrlParameter(parameter);
        // console.info(`ARENA (URL) config param ${parameter}: ${urlParameter}`);
        if (urlParameter === '') {
            return defaultValue;
        }
        return urlParameter;
    }

    /**
     * Register a callback for the geolocation of user's device
     *
     * The callback should take the following arguments
     * @param callback onLocationCallback
     */
    static getLocation(callback) {
        const urlLat = ARENAUtils.getUrlParam('lat', undefined);
        const urlLong = ARENAUtils.getUrlParam('long', undefined);
        if (urlLat && urlLong && callback) {
            callback(
                {
                    latitude: urlLat,
                    longitude: urlLong,
                },
                undefined
            );
        } else if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            };
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (callback) callback(position.coords, undefined);
                },
                (err) => {
                    console.warn(`Error getting device location: ${err.message}`);
                    console.warn('Defaulting to campus location');
                    if (callback) callback({ latitude: 40.4427, longitude: 79.943 }, err);
                },
                options
            );
        }
    }

    /**
     * Publishes debug message to mqtt
     * @param {Object} msg msg to debug
     */
    static debug(msg) {
        const message = {
            object_id: 'debug',
            type: 'debug',
            action: 'update',
            data: msg,
        };
        ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}/debug`, message);
    }

    /**
     * Returns the position of an event's target
     * @param {Object} evt event object
     * @return {Object} position of target
     */
    static setCoordsData(evt) {
        return {
            x: parseFloat(evt.currentTarget.object3D.position.x.toFixed(3)),
            y: parseFloat(evt.currentTarget.object3D.position.y.toFixed(3)),
            z: parseFloat(evt.currentTarget.object3D.position.z.toFixed(3)),
        };
    }

    /**
     * Returns where an evt's intersection happened
     * @param {Object} evt event object
     * @return {Object} event intersection as object
     */
    static setClickData(evt) {
        if (evt.detail.intersection) {
            return {
                x: parseFloat(evt.detail.intersection.point.x.toFixed(3)),
                y: parseFloat(evt.detail.intersection.point.y.toFixed(3)),
                z: parseFloat(evt.detail.intersection.point.z.toFixed(3)),
            };
        }
        if (evt.detail.position && evt.detail.orientation) {
            return {
                position: {
                    x: parseFloat(evt.detail.position.x.toFixed(3)),
                    y: parseFloat(evt.detail.position.y.toFixed(3)),
                    z: parseFloat(evt.detail.position.z.toFixed(3)),
                },
                rotation: {
                    x: parseFloat(evt.detail.orientation.x.toFixed(3)),
                    y: parseFloat(evt.detail.orientation.y.toFixed(3)),
                    z: parseFloat(evt.detail.orientation.z.toFixed(3)),
                    w: parseFloat(evt.detail.orientation.w.toFixed(3)),
                },
            };
        }
        console.info('WARN: empty coords data');
        return {
            x: 0,
            y: 0,
            z: 0,
        };
    }

    /**
     * Turns 3 elem vector to object
     * @param {Object} vec 3 elem vector
     * @return {Object} 3 elem vector as object
     */
    static vec3ToObject(vec) {
        return {
            x: parseFloat(vec.x.toFixed(3)),
            y: parseFloat(vec.y.toFixed(3)),
            z: parseFloat(vec.z.toFixed(3)),
        };
    }

    /**
     * Turns quaternion to object
     * @param {Object} q quaternion
     * @return {Object} quaternion as object
     */
    static quatToObject(q) {
        return {
            x: parseFloat(q.x.toFixed(3)),
            y: parseFloat(q.y.toFixed(3)),
            z: parseFloat(q.z.toFixed(3)),
            w: parseFloat(q.w.toFixed(3)),
        };
    }

    /**
     * Turns position to string
     * @param {Object} c position
     * @return {string} position as string
     */
    static coordsToText(c) {
        return `${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}`;
    }

    /**
     * Turns quaternions to string
     * @param {Object} c rotation in quaternions
     * @return {string} rotation as string
     */
    static rotToText(c) {
        return `${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}, ${c.w.toFixed(3)}`;
    }

    /**
     * Turns quaternions to euler string
     * @param {Object} c rotation in quaternions
     * @return {string} rotation as euler string
     */
    static rotToEulerText(c) {
        function rad2deg(radians) {
            return radians * (180 / Math.PI);
        }

        const e = new THREE.Euler().setFromQuaternion(c);
        return `${rad2deg(e.x).toFixed(3)}, ${rad2deg(e.y).toFixed(3)}, ${rad2deg(e.z).toFixed(3)}`;
    }

    /**
     * Utility static to check incoming messages
     * @param {string} str string with message to check
     * @return {boolean}
     */
    static isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            console.error(str);
            console.error(e.message);
            return false;
        }
        return true;
    }

    /**
     * Replace dropbox link to dl.dropboxusercontent, which
     * supports cross origin content
     * @param {string} dropboxShareUrl link to be parsed; a dropbox public share link
     * @return {string} new dropbox link
     */
    static crossOriginDropboxSrc(dropboxShareUrl) {
        if (!dropboxShareUrl) return undefined;
        // eslint-disable-next-line max-len
        return dropboxShareUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com'); // replace dropbox links to direct links
    }

    /**
     * Generate a UUID.
     * @return {string} The generated UUID string.
     */
    static uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
    }

    /**
     * Utility to check if device is in landscape mode.
     * @return {boolean} True if device is in landscape mode.
     */
    static isLandscapeMode() {
        return (
            window.screen.orientation.type === 'landscape-primary' ||
            window.screen.orientation.type === 'landscape-secondary'
        );
    }

    /**
     * Convert integer to hex string with leading '0's.
     * @param {integer} num integer to convert
     * @param {integer} len length of padded output hex string
     * @return {string} hex string of num to len characters with leading '0'
     */
    static numToPaddedHex(num, len) {
        const str = num.toString(16);
        return '0'.repeat(len - str.length) + str;
    }

    /**
     * General purpose function to update the pose of an object3D from a data object which can contain pos and/or rot
     * @param {THREE.Object3D} targetObject3D object3D to update
     * @param {object} data  object containing position and/or rotation keys
     * @param {THREE.Vector3} data.position position to set
     * @param {THREE.Quaternion|THREE.Euler} data.rotation rotation to set
     */
    static updatePose(targetObject3D, data) {
        const { position, rotation, scale } = data;
        if (rotation) {
            // has 'w' coordinate: a quaternion
            if (Object.hasOwn(rotation, 'w')) {
                targetObject3D.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
            } else {
                targetObject3D.rotation.set(
                    THREE.MathUtils.degToRad(rotation.x),
                    THREE.MathUtils.degToRad(rotation.y),
                    THREE.MathUtils.degToRad(rotation.z)
                ); // otherwise its a rotation given in degrees
            }
        }
        if (position) {
            targetObject3D.position.set(position.x, position.y, position.z);
        }
        if (scale) {
            targetObject3D.scale.set(scale.x, scale.y, scale.z);
        }
    }

    /**
     * Checks if current arena session is running on WebXRViewer on iOS.
     *
     * @return {boolean} true if device is WebXRViewer, false if not
     */
    static isWebXRViewer() {
        return navigator.userAgent.includes('WebXRViewer') || navigator.userAgent.includes('WebARViewer');
    }

    /**
     * Try to detect AR headset (currently: magic leap and hololens only;  other devices to be added later)
     * Hololens reliable detection is tbd
     *
     * ARHeadeset camera capture uses returned value as a key to projection matrix array
     *
     * @return {string} "ml", "hl", "unknown".
     */

    static isMagicLeap() {
        return window.mlWorld;
    }

    static isHololens() {
        return navigator.xr && navigator.userAgent.includes('Edg');
    }

    static detectARHeadset() {
        if (this.isMagicLeap()) return 'ml';
        if (this.isHololens()) return 'hl';
        return 'unknown';
    }

    static isTouch() {
        return 'ontouchstart' in window;
        // navigator.maxTouchPoints unreliable, up to 10 for touchscreen laptops (which oddly don't have ontouchstart)
    }

    static isMobile() {
        let _isMobile = false;
        const a = window.navigator.userAgent || window.navigator.vendor || window.opera;
        /* eslint-disable no-useless-escape, max-len */
        // This useragent matching is directly from AFRAME utils.device.isMobile
        if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
                a
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
                a.substring(0, 4)
            )
        ) {
            _isMobile = true;
        }
        /* eslint-disable no-useless-escape, max-len */
        if (this.isTouch() || isIOS() || isTablet() || isR7()) {
            _isMobile = true;
        }
        if (isMobileVR() || this.detectARHeadset() !== 'unknown') {
            _isMobile = false;
        }
        return _isMobile;
    }

    /**
     * Checks if this device supports OffscreenCanvas with WebGL (Safari must be >= 17)
     */
    static isWebGLOffscreenCanvasSupported(canvas) {
        if (canvas.transferControlToOffscreen === undefined) {
            return false;
        }
        // Check safari
        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
            const versionMatch = navigator.userAgent.match(/version\/(\d+)/i);
            const safariVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
            if (safariVersion < 17) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns device type.
     * @return {string} device type (desktop, mobile, headset)
     */
    static getDeviceType() {
        let deviceType = 'desktop';
        if (this.isMobile()) deviceType = 'mobile';
        else if (ARENAUtils.detectARHeadset() !== undefined) deviceType = 'headset';
        return deviceType;
    }

    /**
     * Get the world position of an element, saves having to instantiate a new vec3
     * @param {Element} el element to get world position of
     * @return {THREE.Vector3} world position of element
     */
    static getWorldPos(el) {
        if (!el?.object3D) {
            return null;
        }
        const worldVec3 = new THREE.Vector3();
        el.object3D.getWorldPosition(worldVec3);
        return worldVec3;
    }

    /**
     * Applies GLTF model sub component pose updates
     * @param {THREE.Object3D} o3d - target object3D
     * @param {object} data  - data object containing keys of named sub components, with values of
     *                        position and/or rotation keys
     */
    static updateModelComponents(o3d, data) {
        // Traverse once, instead of doing a lookup for each modelUpdate key
        o3d.traverse((child) => {
            if (Object.hasOwn(data, child.name)) {
                ARENAUtils.updatePose(child, data[child.name]);
            }
        });
    }

    static camMatrixInverse = new THREE.Matrix4();

    static rigMatrix = new THREE.Matrix4();

    static overrideQuat = new THREE.Quaternion();

    static overrideEuler = new THREE.Euler();

    /**
     * Camera relocation, handles both desktop and XR session (requires rig and spinner offset)
     * @param {{x, y, z}} [position] - new  position
     * @param {THREE.Euler|{x,y,z,w}} [rotation] - new rotation. Euler if copied from Object3D, quat if from pubsub
     * @param {THREE.Matrix4} [poseMatrix] - new pose matrix (optional, overrides position and rotation)
     */
    static relocateUserCamera(position, rotation, poseMatrix) {
        const userCamera = document.getElementById('my-camera');
        if (!userCamera) return;
        if (AFRAME.scenes[0].xrSession) {
            const rig = document.getElementById('cameraRig');
            const spinner = document.getElementById('cameraSpinner');
            if (poseMatrix) {
                // target pose matrix given, calculate rig and spinner
                this.camMatrixInverse.copy(userCamera.object3D.matrix).invert();
                this.rigMatrix.multiplyMatrices(poseMatrix, this.camMatrixInverse);
                rig.object3D.position.setFromMatrixPosition(this.rigMatrix);
                spinner.object3D.rotation.setFromRotationMatrix(this.rigMatrix);
            } else {
                // position and/or rotation given, use them
                if (position) rig.object3D.position.copy(position);
                if (rotation) {
                    if (Object.hasOwn(rotation, 'w')) {
                        this.overrideQuat.set(rotation.x, rotation.y, rotation.z, rotation.w);
                        spinner.object3D.rotation.setFromQuaternion(this.overrideQuat);
                    } else {
                        // This is an euler from another object3d
                        spinner.object3D.rotation.copy(rotation);
                    }
                }
            }
        } else {
            if (position) userCamera.object3D.position.set(position.x, position.y, position.z);
            if (rotation) {
                const lookComponent = userCamera.components['look-controls'];
                const userCamRotationObj = userCamera.object3D.rotation;
                if (Object.hasOwn(rotation, 'w')) {
                    this.overrideQuat.set(rotation.x, rotation.y, rotation.z, rotation.w);
                    this.overrideEuler.setFromQuaternion(this.overrideQuat);
                    if (lookComponent) {
                        // Modify look component axes separately
                        lookComponent.yawObject.rotation.y = this.overrideEuler.y;
                        lookComponent.pitchObject.rotation.x = this.overrideEuler.x;
                    } else {
                        // Directly mod camera rotation
                        userCamRotationObj.setFromQuaternion(this.overrideQuat);
                    }
                } else if (lookComponent) {
                    lookComponent.yawObject.rotation.y = rotation.y;
                    lookComponent.pitchObject.rotation.x = rotation.x;
                } else {
                    userCamRotationObj.copy(rotation);
                }
            }
        }
    }
}
