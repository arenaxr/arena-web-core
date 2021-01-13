/**
 * @fileoverview Useful misc utility functions
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Wrapper class for various utility functions
 */
export class ARENAUtils {

    /**
     * Gets URL parameters as dictionary
     * @return {Object} dictionary of URL parameters
     */
    static getUrlVars() {
        const vars = {};
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
            vars[key] = value;
        });
        return vars;
    };

    /**
     * Extracts URL params
     * @param {string} parameter URL parameter
     * @param {string} defaultValue default value in case parameter doesnt exist
     * @return {string} value associated with parameter
     */
    static getUrlParam(parameter, defaultValue) {
        let urlParameter = defaultValue;
        if (window.location.href.indexOf(parameter) > -1) {
            urlParameter = this.getUrlVars()[parameter];
        }
        if (urlParameter === '') {
            urlParameter = defaultValue;
        }
        //console.info(`ARENA (URL) config param ${parameter}: ${urlParameter}`);
        return urlParameter;
    };

    /**
     * Extracts URL params
     * @param {string} parameter URL parameter
     * @param {string} defaultValue default value in case parameter doesnt exist
     * @return {[]} list of indicies
     */
    static getUrlParams(parameter, defaultValue) {
        const indexes = [];
        parameter = parameter + '=';
        if (window.location.href.indexOf(parameter) > -1) {
            const vars = getUrlVars();
            for (let i = 0; i < vars.length; i++) {
                if (vars[parameter] == parameter) {
                    indexes.push(vars[i]);
                }
            }
        } else {
            indexes.push(defaultValue);
        }

        return indexes;
    };

    /**
     * Gets geolocation of user's device
     * @return {object} geolocation of user's device
     */
    static getLocation() {
        const urlLat = ARENAUtils.getUrlParam('lat');
        const urlLong = ARENAUtils.getUrlParam('long');
        let clientCoords;
        if (urlLat && urlLong) {
            clientCoords = {
                latitude: urlLat,
                longitude: urlLong,
            };
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    clientCoords = position.coords;
                });
            }
        }
        return clientCoords;
    }

    /**
     * Publishes debug message to mqtt
     * @param {Object} msg msg to debug
     */
    static debug(msg) {
        ARENA.Mqtt.publish(ARENA.outputTopic, '{"object_id":"debug","message":"' + msg + '"}');
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
        return `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`;
    };

    /**
     * Turns quaternions to string
     * @param {Object} c rotation in quaternions
     * @return {string} rotation as string
     */
    static rotToText(c) {
        return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)} ${c.w.toFixed(3)}`;
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
}
