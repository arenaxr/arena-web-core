/**
 * @fileoverview Useful misc utility functions
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import MQTTPattern from 'mqtt-pattern';

/**
 * Wrapper class for various utility functions
 */
export class ARENAUtils {
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
     * @callback onLocationCallback
     * @param coords {object} a {GeolocationCoordinates} object defining the current location, if successful; "default" location if error
     * @param err {object} a {GeolocationPositionError} object if an error was returned; undefined if no error
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
                undefined,
            );
        } else {
            if (navigator.geolocation) {
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
                        if (callback) callback({latitude: 40.4427, longitude: 79.943}, err);
                    },
                    options,
                );
            }
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
        } else if (evt.detail.position && evt.detail.orientation) {
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
        } else {
            console.info('WARN: empty coords data');
            return {
                x: 0,
                y: 0,
                z: 0,
            };
        }
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
     * Utility to match MQTT topic within permissions.
     * @param {string} topic The MQTT topic to test.
     * @param {string[]} rights The list of topic wild card permissions.
     * @return {boolean} True if the topic matches the list of topic wildcards.
     */
    static matchJWT(topic, rights) {
        const len = rights.length;
        let valid = false;
        for (let i = 0; i < len; i++) {
            if (MQTTPattern.matches(rights[i], topic)) {
                valid = true;
                break;
            }
        }
        return valid;
    }

    /**
     * Generate a UUID.
     * @return {string} The generated UUID string.
     */
    static uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
        );
    }

    /**
     * Utility to check if device is in landscape mode.
     * @return {boolean} True if device is in landscape mode.
     */
    static isLandscapeMode() {
        return window.orientation == 90 || window.orientation == -90;
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
        const {position, rotation} = data;
        if (rotation) {
            // has 'w' coordinate: a quaternion
            if (rotation.hasOwnProperty('w')) {
                targetObject3D.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
            } else {
                targetObject3D.rotation.set(
                    THREE.MathUtils.degToRad(rotation.x),
                    THREE.MathUtils.degToRad(rotation.y),
                    THREE.MathUtils.degToRad(rotation.z),
                ); // otherwise its a rotation given in degrees
            }
        }
        if (position) {
            targetObject3D.position.set(position.x, position.y, position.z);
        }
    }

   /**
    * Try to detect AR headset (currently: magic leap and hololens only;  other devices to be added later)
    * Hololens reliable detection is tbd
    *
    * ARHeadeset camera capture uses returned value as a key to projection matrix array
    *
    * @return {string} "ml", "hl", "unknown".
    * @alias module:armarker-system
    */
    static detectARHeadset() {
        if (window.mlWorld) return 'ml';
        if (navigator.xr && navigator.userAgent.includes('Edg')) return 'hl';
        return 'unknown';
    }

    /**
     * Returns device type.
     * @return {string} device type (desktop, mobile, headset)
     */
    static getDeviceType() {
        let deviceType = 'desktop';
        if (AFRAME.utils.device.isMobile()) deviceType = 'mobile';
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
            if (data.hasOwnProperty(child.name)) {
                ARENAUtils.updatePose(child, data[child.name]);
            }
        });
    }
}
