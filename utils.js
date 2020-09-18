// utils.js
//
// useful misc utility functions

// usage:
//   importScript('./path/to/script.js').then((allExports) => { .... }));
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

function getUrlVars() {
    const vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function getUrlParam(parameter, defaultValue) {
    let urlParameter = defaultValue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlParameter = getUrlVars()[parameter];
    }
    if (urlParameter === "") {
        return defaultValue;
    }
    return urlParameter;
}

function getQueryParams(name, defaultValue) {
    var qs = location.search;

    var params = [];
    var tokens;
    var re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        if (decodeURIComponent(tokens[1]) == name)
            params.push(decodeURIComponent(tokens[2]));
    }

    if (params === []) return defaultValue
    else return params;
}

function getUrlParams(parameter, defaultValue) {
    let urlParameter = defaultValue;
    var indexes = [];
    parameter = parameter + '=';
    if (window.location.href.indexOf(parameter) > -1) {
        var vars = getUrlVars();
        for (var i = 0; i < vars.length; i++) {
            if (vars[parameter] == parameter)
                indexes.push(vars[i]);
        }
    } else
        indexes.push(defaultValue);

    return indexes;
}

function debug(msg) {
    publish(globals.outputTopic, '{"object_id":"debug","message":"' + msg + '"}');
}

function updateConixBox(eventName, coordsData, myThis) {
    const sceney = myThis.sceneEl;
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', myThis.id + " " + eventName + " " + '\n' + coordsToText(coordsData));
    console.log(myThis.id + ' was clicked at: ', coordsToText(coordsData), ' by', globals.camName);
}

function debugConixText(coordsData) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', 'pose: ' + coordsToText(coordsData));
    console.log('pose: ', coordsToText(coordsData));
}

function debugRaw(debugMsg) {
    const textEl = document.getElementById('conix-text');
    textEl.setAttribute('value', debugMsg);
    //console.log('debug: ', debugMsg);
}

function eventAction(evt, eventName, myThis) {
    const newPosition = myThis.object3D.position;

    let coordsData = {
        x: newPosition.x.toFixed(3),
        y: newPosition.y.toFixed(3),
        z: newPosition.z.toFixed(3)
    };

    // publish to MQTT
    const objName = myThis.id + "_" + globals.idTag;
    publish(globals.outputTopic + objName, {
        object_id: objName,
        action: "clientEvent",
        type: eventName,
        data: {
            position: coordsData,
            source: globals.camName
        }
    });
}

function setCoordsData(evt) {
    return {
        x: parseFloat(evt.currentTarget.object3D.position.x).toFixed(3),
        y: parseFloat(evt.currentTarget.object3D.position.y).toFixed(3),
        z: parseFloat(evt.currentTarget.object3D.position.z).toFixed(3)
    };
}

function setClickData(evt) {
    if (evt.detail.intersection)
        return {
            x: parseFloat(evt.detail.intersection.point.x.toFixed(3)),
            y: parseFloat(evt.detail.intersection.point.y.toFixed(3)),
            z: parseFloat(evt.detail.intersection.point.z.toFixed(3))
        }
    else {
        console.log("WARN: empty coords data");
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }
}

function vec3ToObject(vec) {
    return {
        x: parseFloat(vec.x.toFixed(3)),
        y: parseFloat(vec.y.toFixed(3)),
        z: parseFloat(vec.z.toFixed(3))
    };
}

function quatToObject(q) {
    return {
        x: parseFloat(q.x.toFixed(3)),
        y: parseFloat(q.y.toFixed(3)),
        z: parseFloat(q.z.toFixed(3)),
        w: parseFloat(q.w.toFixed(3))
    };
}

function coordsToText(c) {
    return `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`;
}

function rotToText(c) {
    return `${c.x.toFixed(3)} ${c.y.toFixed(3)} ${c.z.toFixed(3)} ${c.w.toFixed(3)}`;
}
