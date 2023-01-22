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
        const urlParameter = AFRAME.utils.getUrlParameter(parameter)
        // console.info(`ARENA (URL) config param ${parameter}: ${urlParameter}`);
        if (urlParameter === '')
            return defaultValue;
        return urlParameter;
    };

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
            callback({
                latitude: urlLat,
                longitude: urlLong,
            }, undefined);
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
                        if (callback) callback({latitude: 40.4427, longitude: 79.9430}, err);
                    },
                    options);
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
    };

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
    };

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
        } else {
            console.info('WARN: empty coords data');
            return {
                x: 0,
                y: 0,
                z: 0,
            };
        }
    };

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
    };

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
    };

    /**
     * Turns position to string
     * @param {Object} c position
     * @return {string} position as string
     */
    static coordsToText(c) {
        return `${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}`;
    };

    /**
     * Turns quaternions to string
     * @param {Object} c rotation in quaternions
     * @return {string} rotation as string
     */
    static rotToText(c) {
        return `${c.x.toFixed(3)}, ${c.y.toFixed(3)}, ${c.z.toFixed(3)}, ${c.w.toFixed(3)}`;
    };

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
    };

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
    };

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
    };

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
    };

    /**
     * Utility to check if device is in landscape mode.
     * @return {boolean} True if device is in landscape mode.
     */
    static isLandscapeMode() {
        return (window.orientation == 90 || window.orientation == -90);
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
}
