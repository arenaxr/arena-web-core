// utils.js
//
// useful misc utility functions

/**
 * Dynamically import js script
 * usage:
 *   importScript('./path/to/script.js').then((allExports) => { .... }));
 * @param {string} path path of js script
 * @return {promise}
 */
function importScript(path) {
    let entry = window.importScript.__db[path];
    if (entry === undefined) {
        const escape = path.replace(`'`, `\\'`);
        const script = Object.assign(document.createElement('script'), {
            type: 'module',
            textContent: `import * as x from '${escape}'; importScript.__db['${escape}'].resolve(x);`,
        });
        entry = importScript.__db[path] = {};
        entry.promise = new Promise((resolve, reject) => {
            entry.resolve = resolve;
            script.onerror = reject;
        });
        document.head.appendChild(script);
        script.remove();
    }
    return entry.promise;
}
importScript.__db = {};
window['importScript'] = importScript; // needed if we ourselves are in a module

/**
 * Gets URL parameters as dictionary
 * @return {object} dictionary of URL parameters
 */
function getUrlVars() {
    const vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

/**
 * Extracts URL params
 * @param {string} parameter URL parameter
 * @param {string} defaultValue default value in case parameter doesnt exist
 * @return {string} value associated with parameter
 */
function getUrlParam(parameter, defaultValue) {
    let urlParameter = defaultValue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlParameter = getUrlVars()[parameter];
    }
    if (urlParameter === '') {
        return defaultValue;
    }
    return urlParameter;
}

/**
 * Extracts URL params
 * @param {string} parameter URL parameter
 * @param {string} defaultValue default value in case parameter doesnt exist
 * @return {[]} list of indicies
 */
function getUrlParams(parameter, defaultValue) {
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
}

/**
 * Publishes debug message to mqtt
 * @param {object} msg msg to debug
 */
function debug(msg) {
    publish(ARENA.outputTopic, '{"object_id":"debug","message":"' + msg + '"}');
}

/**
 * Returns the position of an event's target
 * @param {object} evt event object
 * @return {object} position of target
 */
function setCoordsData(evt) {
    return {
        x: parseFloat(evt.currentTarget.object3D.position.x).toFixed(3),
        y: parseFloat(evt.currentTarget.object3D.position.y).toFixed(3),
        z: parseFloat(evt.currentTarget.object3D.position.z).toFixed(3),
    };
}

/**
 * Returns where an evt's intersection happened
 * @param {object} evt event object
 * @return {object} event intersection as object
 */
function setClickData(evt) {
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
}

/**
 * Turns 3 elem vector to object
 * @param {object} c 3 elem vector
 * @return {object} 3 elem vector as object
 */
function vec3ToObject(vec) {
    return {
        x: parseFloat(vec.x.toFixed(3)),
        y: parseFloat(vec.y.toFixed(3)),
        z: parseFloat(vec.z.toFixed(3)),
    };
}

/**
 * Turns quaternion to object
 * @param {object} c quaternion
 * @return {object} quaternion as object
 */
function quatToObject(q) {
    return {
        x: parseFloat(q.x.toFixed(3)),
        y: parseFloat(q.y.toFixed(3)),
        z: parseFloat(q.z.toFixed(3)),
        w: parseFloat(q.w.toFixed(3)),
    };
}

/**
 * Turns position to string
 * @param {object} c position
 * @return {string} position as string
 */
function coordsToText(c) {
    return `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`;
}

/**
 * Turns quaternions to string
 * @param {object} c rotation in quaternions
 * @return {string} rotation as string
 */
function rotToText(c) {
    return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)} ${c.w.toFixed(3)}`;
}

/**
 * Utility function to check incoming messages
 * @param {string} str string with message to check
 * @return {boolean}
 */
function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(str);
        console.log(e.message);
        return false;
    }
    return true;
}
