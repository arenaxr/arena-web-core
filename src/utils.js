// utils.js
//
// useful misc utility export functions

export class ARENAUtils {
    /**
     * Handles hostname.com/?scene=foo, hostname.com/foo, and hostname.com/namespace/foo
     * @return {string} scene name - includes namespace prefix (e.g. `namespace/foo`)
     */
    static getSceneName() {
        let path = window.location.pathname.substring(1);
        let {namespaceParam: namespace, scenenameParam: scenename} = defaults;
        if (defaults.supportDevFolders && path.length > 0) {
            const devPrefix = path.match(/(?:x|dev)\/([^\/]+)\/?/g);
            if (devPrefix){
                path = path.replace(devPrefix[0], '');
            }
        }
        if (path === '' || path === 'index.html') {
            scenename = this.getUrlParam('scene', scenename);
            return `${namespace}/${scenename}`;
        }
        try {
            const r = new RegExp(/^(?<namespace>[^\/]+)(\/(?<scenename>[^\/]+))?/g);
            const matches = r.exec(path).groups;
            // Only first group is given, namespace is actually the scene name
            if (matches.scenename === undefined) {
                scenename = matches.namespace;
                return `${namespace}/${scenename}`;
            }
            // Both scene and namespace are defined, return regex as-is
            return `${matches.namespace}/${matches.scenename}`;
        } catch (e) {
            scenename = this.getUrlParam('scene', scenename);
            return `${namespace}/${scenename}`;
        }
    };

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
            return defaultValue;
        }
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
     * Publishes debug message to mqtt
     * @param {Object} msg msg to debug
     */
    static debug(msg) {
        ARENA.mqtt.publish(ARENA.outputTopic, '{"object_id":"debug","message":"' + msg + '"}');
    };

    /**
     * Gets display name either from local storage or from userParam
     * @return {string} display name
     */
    static getDisplayName() {
        let displayName = localStorage.getItem('display_name');
        if (!displayName) displayName = decodeURI(ARENA.userParam);
        return displayName;
    };

    /**
     * Returns the position of an event's target
     * @param {Object} evt event object
     * @return {Object} position of target
     */
    static setCoordsData(evt) {
        return {
            x: parseFloat(evt.currentTarget.object3D.position.x).toFixed(3),
            y: parseFloat(evt.currentTarget.object3D.position.y).toFixed(3),
            z: parseFloat(evt.currentTarget.object3D.position.z).toFixed(3),
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
            console.log('WARN: empty coords data');
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
            console.log(str);
            console.log(e.message);
            return false;
        }
        return true;
    };
}
