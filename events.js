// events.js
//
// Components and realtime event handlers
// and globals
'use strict';

window.globals = {
    timeID: new Date().getTime() % 10000,
    sceneObjects: new Map(),
    // TODO(mwfarb): push per scene themes/styles into json scene object
    updateMillis: getUrlParam('camUpdateRate', defaults.updateMillis),
    scenenameParam: getUrlParam('scene', defaults.scenenameParam), //scene
    userParam: getUrlParam('name', defaults.userParam),
    startCoords: getUrlParam('location', defaults.startCoords).replace(/,/g, ' '),
    weatherParam: getUrlParam('weather', defaults.weatherParam),
    mqttParamZ: getUrlParam('mqttServer', defaults.mqttParamZ),
    fixedCamera: getUrlParam('fixedCamera', defaults.fixedCamera),
    ATLASurl: getUrlParam('ATLASurl', defaults.ATLASurl),
    localVideoWidth: AFRAME.utils.device.isMobile() ? Number(window.innerWidth / 5) : 300,
    vioTopic: defaults.vioTopic,
    graphTopic: defaults.graphTopic,
    lastMouseTarget: undefined,
    inAR: false,
    isWebXRViewer: navigator.userAgent.includes('WebXRViewer'),
    onEnterXR: function(xrType) {
        //debug("ENTERING XR");

        if (xrType === 'ar') {
            //debug("xrType is ar");

            this.isAR = true;
            if (this.isWebXRViewer) {
                //debug("isWebXRViewer = true");

                let base64script = document.createElement("script");
                base64script.onload = async () => {
                    await importScript('/apriltag/script.js');
                };
                base64script.src = '/apriltag/base64_binary.js';
                document.head.appendChild(base64script);

                document.addEventListener("mousedown", function(e) {
                    //debug("MOUSEDOWN");

                    if (window.globals.lastMouseTarget) {
                        //debug("has target: "+window.globals.lastMouseTarget);

                        let el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        let elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        //debug("worldPosition is:");
                        //debug(elPos.x.toString()+","+elPos.x.toString()+","+elPos.x.toString());
                        let intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z
                        };
                        el.emit("mousedown", {
                            "clicker": window.globals.camName,
                            intersection: {
                                point: intersection
                            },
                            cursorEl: true
                        }, false);
                    } else {
                        //debug("no lastMouseTarget");
                    }
                });
                document.addEventListener("mouseup", function(e) {
                    if (window.globals.lastMouseTarget) {
                        let el = window.globals.sceneObjects[window.globals.lastMouseTarget];
                        let elPos = new THREE.Vector3();
                        el.object3D.getWorldPosition(elPos);
                        let intersection = {
                            x: elPos.x,
                            y: elPos.y,
                            z: elPos.z
                        };
                        //debug(elPos.x);
                        el.emit("mouseup", {
                            "clicker": window.globals.camName,
                            intersection: {
                                point: intersection
                            },
                            cursorEl: true
                        }, false);
                    }
                });
                let cursor = document.getElementById('mouseCursor');
                let cursorParent = cursor.parentNode;
                cursorParent.removeChild(cursor);
                cursor = document.createElement('a-cursor');
                cursor.setAttribute('fuse', false);
                // move reticle closer (side effect: bigger!)
                cursor.setAttribute('position', '0 0 -0.5');
                //cursor.setAttribute('animation', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                cursor.setAttribute('animation__22', "startEvents: click; property: rotation; dur: 500; easing: linear; from: 0 0 0; to: 30 30 360");
                //cursor.setAttribute('raycaster', 'showLine', 'true');

                cursor.setAttribute('max-distance', '1000');
                cursor.setAttribute('id', 'fuse-cursor');
                cursorParent.appendChild(cursor);
            }
            document.getElementById('env').setAttribute('visible', false);
        }
    }
};

let urlLat = getUrlParam('lat');
let urlLong = getUrlParam('long');
if (urlLat && urlLong) {
    globals.clientCoords = {
        latitude: urlLat,
        longitude: urlLong
    };
} else {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            globals.clientCoords = position.coords;
        });
    }
}

globals.persistenceUrl = '//' + globals.mqttParamZ + defaults.persistPath + globals.scenenameParam;
globals.mqttParam = 'wss://' + globals.mqttParamZ + defaults.mqttPath[Math.floor(Math.random() *  defaults.mqttPath.length)];
globals.outputTopic = "realm/s/" + globals.scenenameParam + "/";
globals.renderTopic = globals.outputTopic + "#";
globals.camName = "";
globals.activeSpeaker = "";
globals.previousSpeakerId = "";
globals.previousSpeakerEl = "";
globals.displayName = decodeURI(globals.userParam); // set initial name
globals.idTag = globals.timeID + "_" + globals.userParam; // e.g. 1234_eric

if (globals.fixedCamera !== '') {
    globals.camName = "camera_" + globals.fixedCamera + "_" + globals.fixedCamera;
} else {
    globals.camName = "camera_" + globals.idTag; // e.g. camera_1234_eric
}

globals.viveLName = "viveLeft_" + globals.idTag; // e.g. viveLeft_9240_X
globals.viveRName = "viveRight_" + globals.idTag; // e.g. viveRight_9240_X

globals.newRotation = new THREE.Quaternion();
globals.newPosition = new THREE.Vector3();
globals.vioRotation = new THREE.Quaternion();
globals.vioPosition = new THREE.Vector3();
globals.vioMatrix = new THREE.Matrix4();
var camParent = new THREE.Matrix4();
var cam = new THREE.Matrix4();
var cpi = new THREE.Matrix4();

globals.newViveLRotation = new THREE.Quaternion();
globals.newViveLPosition = new THREE.Vector3();
globals.vioViveLRotation = new THREE.Quaternion();
globals.vioViveLPosition = new THREE.Vector3();
var ViveLcamParent = new THREE.Matrix4();
var ViveLcam = new THREE.Matrix4();
var ViveLcpi = new THREE.Matrix4();

globals.newViveRRotation = new THREE.Quaternion();
globals.newViveRPosition = new THREE.Vector3();
globals.vioViveRRotation = new THREE.Quaternion();
globals.vioViveRPosition = new THREE.Vector3();
var ViveRcamParent = new THREE.Matrix4();
var ViveRcam = new THREE.Matrix4();
var ViveRcpi = new THREE.Matrix4();

AFRAME.registerComponent('pose-listener', {
    // if we want to make throttling settable at init time over mqtt,
    // create a Component variable here & use instead of globals.updateMillis
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
        this.heartBeatCounter = 1;
    },

    tick: (function(t, dt) {
        globals.newRotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
        globals.newPosition.setFromMatrixPosition(this.el.object3D.matrixWorld);

        camParent = this.el.object3D.parent.matrixWorld;
        cam = this.el.object3D.matrixWorld;
        cpi.getInverse(camParent);
        cpi.multiply(cam);
        globals.vioMatrix.copy(cpi);
        globals.vioRotation.setFromRotationMatrix(cpi);
        globals.vioPosition.setFromMatrixPosition(cpi);
        //console.log(cpi);

        const rotationCoords = rotToText(globals.newRotation);
        const positionCoords = coordsToText(globals.newPosition);

        const newPose = rotationCoords + " " + positionCoords;

        // update position every 1 sec
        if (this.lastPose !== newPose || this.heartBeatCounter % (1000 / globals.updateMillis) == 0) {
            this.el.emit('poseChanged', Object.assign(globals.newPosition, globals.newRotation));
            this.el.emit('vioChanged', Object.assign(globals.vioPosition, globals.vioRotation));
            this.lastPose = newPose;

            // DEBUG
            //debugConixText(newPosition);
            //debugRaw(this.el.object3D.matrixAutoUpdate + '\n' + this.el.object3D.matrixWorldNeedsUpdate +
            //      '\n' + THREE.Object3D.DefaultMatrixAutoUpdate);
        }
        this.heartBeatCounter++;
    })
});


AFRAME.registerComponent('vive-pose-listener', {
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function(t, dt) {
        const newRotation = this.el.object3D.quaternion;
        const newPosition = this.el.object3D.position;

        const rotationCoords = AFRAME.utils.coordinates.stringify(newRotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(newPosition);

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;
        }
    })
});


AFRAME.registerComponent('pose-publisher', {
    init: function() {
        // Set up the tick throttling.
        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);
    },

    tick: (function(t, dt) {
        const newRotation = this.el.object3D.quaternion;
        const newPosition = this.el.object3D.position;

        const rotationCoords = rotToText(newRotation);
        const positionCoords = coordsToText(newPosition);

        const newPose = rotationCoords + " " + positionCoords;
        if (this.lastPose !== newPose) {
            // this.el.emit('viveChanged', Object.assign(newPosition, newRotation));
            this.lastPose = newPose;

            const objName = this.el.id;
            publish(globals.outputTopic + objName, {
                object_id: objName,
                action: "update",
                persist: false,
                type: 'object',
                data: {
                    source: globals.camName,
                    position: vec3ToObject(newPosition),
                    rotation: quatToObject(newRotation),
                }
            });

        }
    })
});

AFRAME.registerComponent('impulse', {
    schema: {
        on: {
            default: ''
        }, // event to listen 'on'
        force: {
            type: 'vec3',
            default: {
                x: 1,
                y: 1,
                z: 1
            }
        },
        position: {
            type: 'vec3',
            default: {
                x: 1,
                y: 1,
                z: 1
            }
        }
    },

    multiple: true,

    init: function() {
        var self = this;
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function(args) {

                if (args.detail.clicker) { // our synthetic event from MQTT
                    if (el.body) { // has physics = dynamic-body Component
                        // e.g. <a-entity impulse="on: mouseup; force: 1 50 1; position: 1 1 1" ...>
                        const force = new THREE.Vector3(data.force.x, data.force.y, data.force.z);
                        const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
                        el.body.applyImpulse(force, pos);
                    }
                }

            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        //this.removeEventListeners()
    },
    play: function() {
        //this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        var data = this.data;
        var el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    }
})

// load new URL if clicked
AFRAME.registerComponent('goto-url', {
    schema: {
        on: {
            default: ''
        }, // event to listen 'on'
        url: {
            default: ''
        }, // http:// style url
        dest: {
            default: 'sametab'
        } // newtab
    },

    multiple: true,

    init: function() {
        var self = this;
    },

    update: function() {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el; // Reference to the component's entity.
        let fired = false;
        if (data.on && data.url) { // we have an event?
            el.addEventListener(data.on, function(evt) {
                // console.log("goto-url url=" + data.url);
                if (!fired) {
                    fired = true;
                    swal({
                        title: "You clicked on a URL!",
                        text: "Are you sure you want to open \n["+data.url+"]?",
                        buttons: ["Cancel", "Yes"]
                    })
                    .then((confirmed) => {
                        if (confirmed) {
                            switch (data.dest) {
                                case 'popup':
                                    window.open(data.url, 'popup', 'width=500,height=500');
                                    break;
                                case 'newtab':
                                    window.open(data.url, '_blank');
                                    break;
                                case 'sametab':
                                default:
                                    window.location.href = data.url;
                                    break;
                            }
                        }
                    });
                    window.setTimeout(() => { // prevents event from firing twice after one event
                        fired = false;
                    }, 100);
                }
            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        //this.removeEventListeners()
    },
    play: function() {
        //this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        var data = this.data;
        var el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    }
})

// load new URL if clicked
AFRAME.registerComponent('prompt-box', {
    schema: {
        on: {
            default: ''
        }, // event to listen 'on'
        prompt: {
            default: ''
        } // http:// style url
    },

    multiple: true,

    init: function() {
        var self = this;
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            console.log("adding prompt event listener");
            el.addEventListener(data.on, function(evt) {
                if (!evt.detail.clicker) { // local event, not from MQTT
                    console.log("called prompt listener");
                    var person = prompt(data.prompt, "");
                    var txt = "";
                    if (person == null || person == "") {
                        txt = "";
                    } else {
                        txt = person;
                    }
                    const coordsData = setCoordsData(evt);
                    const thisMsg = {
                        object_id: this.id,
                        action: "clientEvent",
                        type: "prompt-data",
                        data: {
                            text: txt,
                            source: this.id,
                            position: coordsData
                        }
                    };
                    publish(globals.outputTopic + this.id, thisMsg);

                    console.log("prompt-box data: " + txt);
                }
            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        //this.removeEventListeners()
    },
    play: function() {
        //this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        var data = this.data;
        var el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    }
})

// load scene from persistence db
AFRAME.registerComponent('load-scene', {
    schema: {
        on: {
            default: ''
        }, // event to listen 'on'
        url: {
            default: ''
        }, // http:// style url
        position: {
            type: 'vec3',
            default: {
                x: 0,
                y: 0,
                z: 0
            }
        },
        rotation: {
            type: 'vec4',
            default: {
                x: 0,
                y: 0,
                z: 0,
                w: 1
            }
        }
    },

    multiple: true,

    init: function() {
        var self = this;
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        var data = this.data; // Component property values.
        var el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            el.addEventListener(data.on, function(evt) {
                if ('cursorEl' in evt.detail) {
                    // internal click event, our scene only
                } else {
                    // MQTT click event that everyone gets
                    console.log("load-scene url=" + data.url);
                    if (!this.loaded) {
                        loadArena(data.url, data.position, data.rotation);
                        this.loaded = true;
                    } else {
                        unloadArena(data.url);
                        this.loaded = false;
                    }
                }
            })
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        //this.removeEventListeners()
    },
    play: function() {
        //this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        var data = this.data;
        var el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    }
})

// Component: listen for collisions, call defined function on event evt

AFRAME.registerComponent('collision-listener', {
    init: function() {
        //console.log("collision-listener Component init");
        this.el.addEventListener('collide', function(evt) {

            //const coordsData = setClickData(evt);
            const coordsData = {
                x: 0,
                y: 0,
                z: 0
            };

            // colliding object
            const collider = evt.detail.body.el.id;

            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.id,
                action: "clientEvent",
                type: "collision",
                data: {
                    position: coordsData,
                    source: collider
                }
            };
            publish(globals.outputTopic + this.id, thisMsg);
        });
    }
});


// Component: listen for clicks, call defined function on event evt

AFRAME.registerComponent('click-listener', {
    init: function() {
        let self = this;

        this.el.addEventListener('mousedown', function(evt) {

            const clickPos = vec3ToObject(globals.newPosition);
            const coordsData = setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mousedown",
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: globals.camName
                    }
                };
                if (!self.el.getAttribute("goto-url"))
                    publish(globals.outputTopic + this.id, thisMsg);
                // console.log(this.id + ' mousedown at: ', coordsToText(coordsData), 'by', globals.camName);
            }
        });

        //console.log("mouseup init");
        this.el.addEventListener('mouseup', function(evt) {

            const clickPos = vec3ToObject(globals.newPosition);
            const coordsData = setClickData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseup",
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: globals.camName
                    }
                };
                if (!self.el.getAttribute("goto-url"))
                    publish(globals.outputTopic + this.id, thisMsg);
                // console.log(this.id + ' mouseup at: ', coordsToText(coordsData), 'by', globals.camName);
            }
        });

        this.el.addEventListener('mouseenter', function(evt) {

            const clickPos = vec3ToObject(globals.newPosition);
            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseenter",
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: globals.camName
                    }
                };
                if (!self.el.getAttribute("goto-url"))
                    publish(globals.outputTopic + this.id, thisMsg);
            }
        });

        this.el.addEventListener('mouseleave', function(evt) {

            const clickPos = vec3ToObject(globals.newPosition);
            const coordsData = setCoordsData(evt);

            if ('cursorEl' in evt.detail) {
                // original click event; simply publish to MQTT
                let thisMsg = {
                    object_id: this.id,
                    action: "clientEvent",
                    type: "mouseleave",
                    data: {
                        clickPos: clickPos,
                        position: coordsData,
                        source: globals.camName
                    }
                };
                if (!self.el.getAttribute("goto-url"))
                    publish(globals.outputTopic + this.id, thisMsg);
            }
        });
    }
});

AFRAME.registerComponent('vive-listener', {
    init: function() {

        this.el.addEventListener('triggerup', function(evt) {
            eventAction(evt, 'triggerup', this);
        });
        this.el.addEventListener('triggerdown', function(evt) {
            eventAction(evt, 'triggerdown', this);
        });
        this.el.addEventListener('gripup', function(evt) {
            eventAction(evt, 'gripup', this);
        });
        this.el.addEventListener('gripdown', function(evt) {
            eventAction(evt, 'gripdown', this);
        });
        this.el.addEventListener('menuup', function(evt) {
            eventAction(evt, 'menuup', this);
        });
        this.el.addEventListener('menudown', function(evt) {
            eventAction(evt, 'menudown', this);
        });
        this.el.addEventListener('systemup', function(evt) {
            eventAction(evt, 'systemup', this);
        });
        this.el.addEventListener('systemdown', function(evt) {
            eventAction(evt, 'systemdown', this);
        });
        this.el.addEventListener('trackpadup', function(evt) {
            eventAction(evt, 'trackpadup', this);
        });
        this.el.addEventListener('trackpaddown', function(evt) {
            eventAction(evt, 'trackpaddown', this);
        });
    }
});

AFRAME.registerComponent('click-toggle', {
    schema: {
        toggled: {
            type: 'boolean',
            default: false
        }
    },
    init: function() {
        var self = this;
        var el = this.el;
        var data = this.data;

        el.addEventListener('mousedown', function(evt) {
            var dummy = 1
            el.setAttribute('click-toggle', {
                'toggled': !data.toggled
            });
        });
    },
});

AFRAME.registerComponent('env', {
    schema: {
        theEnv: {
            type: 'int',
            default: 0
        },
        theTune: {
            type: 'int',
            default: 0
        }
    },
    init: function() {
        var self = this;
        var el = this.el;
        var data = this.data;
        var envs = ["none", "osiris", "default", "contact", "egypt", "checkerboard", "forest", "goaland", "yavapai", "goldmine", "threetowers", "poison", "arches", "tron", "japan", "dream", "volcano", "starry"]
        var tunes = ["358232_j_s_song.mp3", "376737_Skullbeatz___Bad_Cat_Maste.mp3", "Bliss.ogg", "Celestial.ogg", "Counterpoint.ogg", "Harmonics.ogg", "Latin.ogg", "Marimbach.ogg", "Miami_Slice_Solid_Gold.mp3", "Project_Utopia.ogg", "Soul.ogg", "Sparkle.ogg", "Supreme.ogg", "Tours-Enthusiast.mp3", "Ubuntu.ogg", "avatar2.ogg", "avatar4.ogg", "earth.mp3", "save_and_checkout.mp3", "wendy.mp3"]

        el.addEventListener('mousedown', function(evt) {
            //console.log(evt.detail.clicker)
            if (!evt.detail.clicker) { // locally browser-generated
                var envIndex = data.theEnv + 1;
                if (envIndex == envs.length)
                    envIndex = 0;
                console.log("envIndex: ", envIndex, envs[envIndex]);

                var tuneIndex = data.theTune + 1;
                if (tuneIndex == tunes.length)
                    tuneIndex = 0;
                console.log("tuneIndex: ", tuneIndex, tunes[tuneIndex]);
                el.setAttribute('env', {
                    'theEnv': envIndex
                });
                el.setAttribute('env', {
                    'theTune': tuneIndex
                });

                globals.sceneObjects.env.setAttribute('environment', 'preset', envs[envIndex]);
                el.setAttribute('sound', {
                    "src": 'url(audio/' + tunes[tuneIndex] + ')',
                    "autoplay": true,
                    "positional": false
                });
            }
        });
    },
});

AFRAME.registerComponent('attr-wireframe', {
    dependencies: ['material'],
    schema: {
        toggled: {
            type: 'boolean',
            default: true
        }
    },
    init: function() {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        el.addEventListener('mousedown', function(evt) {

            if (!evt.detail.clicker) { // local browser generated
                if (object) {
                    object.traverse(function(node) {
                        if (node.isMesh)
                            node.material.wireframe = data.toggled;
                    });
                }

                el.setAttribute('attr-wireframe', {
                    'toggled': !data.toggled
                });
            }
        });
    },
});

AFRAME.registerComponent('points', {
    dependencies: ['material'],
    schema: {
        toggled: {
            type: 'boolean',
            default: true
        }
    },
    init: function() {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        el.addEventListener('mousedown', function(evt) {

            if (!evt.detail.clicker) { // local browser generated
                if (object) {

                    let geometry = object.geometry.clone()
                    let material = new THREE.PointsMaterial({
                        color: 0xFFFFFF,
                        size: 0.01
                    })
                    let mesh = new THREE.Points(geometry, material)
                    el.setObject3D('points', mesh);
                    el.removeObject3D('mesh');

                    //          object.traverse(function (node) {
                    //          if (node.isMesh)
                    //              node.material.wireframe = data.toggled;
                    //          });
                }

                el.setAttribute('points', {
                    'toggled': !data.toggled
                });
            }
        });
    },
});

AFRAME.registerComponent('pointed', {
    dependencies: ['material'],
    init: function() {
        var self = this;
        var el = this.el;
        var data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        if (object) {
            let geometry = object.geometry.clone()
            let material = new THREE.PointsMaterial({
                color: 0xFFFFFF,
                size: 0.01
            })
            let mesh = new THREE.Points(geometry, material)
            el.setObject3D('pointed', mesh);
            el.removeObject3D('mesh');
        }
    }
});

AFRAME.registerComponent('modify-materials', {
    dependencies: ['material'],
    schema: {
        url: {
            default: ''
        } // http:// style url
    },
    init: function() {
        const object = this.el.getObject3D('mesh');

        var texture = THREE.ImageUtils.loadTexture(this.data.url);

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        texture.offset.set(4, 4);

        //texture.repeat.x = 1;
        //texture.repeat.y = 1;

        // Wait for model to load.
        this.el.addEventListener('model-loaded', () => {
            // Grab the mesh / scene.
            const obj = this.el.getObject3D('mesh');
            // Go over the submeshes and modify materials we want.
            obj.traverse(node => {
                node.material = new THREE.MeshLambertMaterial({
                    map: texture,
                    //          needsUpdate: true
                });;
            })
        })
    },
})

// publish with qos of 2 for network graph to update latency
AFRAME.registerComponent("network-latency", {
    init: function() {
        this.tick = AFRAME.utils.throttleTick(this.tick, 10000, this); // updates every 10s
        this.message = new Paho.Message("");
        this.message.destinationName = globals.graphTopic;
        this.message.qos = 2;
    },
    tick: (function(t, dt) {
        if (ARENA.mqttClient.isConnected()) {
            ARENA.mqttClient.send(this.message);
        }
    })
})

AFRAME.registerComponent("press-and-move", {
    schema: {
        speed: {type: 'number', default: 5.0},
    },
    init: function() {
        this.timer = null;
        this.drag = false;
        this.longTouch = false;

        this.tick = AFRAME.utils.throttleTick(this.tick, globals.updateMillis, this);

        let self = this;
        window.addEventListener("touchstart", function(evt) {
            evt.preventDefault();
            if (!self.timer) {
                self.timer = window.setTimeout(() => {
                    self.longTouch = true;
                }, 700); // press for 700ms counts as long press
            }
        });
        window.addEventListener("touchend", function(evt) {
            if (self.timer) {
                clearTimeout(self.timer);
                self.timer = null;
            }
            self.longTouch = false;
            self.drag = false;
        });
        window.addEventListener("touchmove", function(evt) {
            // self.drag = true; // might be better without drag detection
        });
    },
    tick: (function(t, dt) {
        if (this.longTouch) {
            this.timer = null;
            if (!this.drag) {
                let eulerRot = globals.sceneObjects.myCamera.getAttribute("rotation");
                let dx = this.data.speed * (dt/1000) * Math.cos(eulerRot.y * Math.PI / 180);
                let dy = this.data.speed * (dt/1000) * Math.sin(eulerRot.y * Math.PI / 180);
                let dz = this.data.speed * (dt/1000) * Math.sin(eulerRot.x * Math.PI / 180);
                let newPosition = globals.sceneObjects.myCamera.getAttribute("position");
                newPosition.x -= dy; // subtract b/c negative is forward
                newPosition.z -= dx;
                newPosition.y += globals.flying ? dz : 0;
                globals.sceneObjects.myCamera.setAttribute("position", newPosition);
            }
        }
    })
})
