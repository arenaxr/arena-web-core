/* global AFRAME, ARENA */

/**
 * @fileoverview Tracking Hand controller movement in real time.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

// path to controler models
const handControllerPath = {
    Left: 'static/models/hands/valve_index_left.gltf',
    Right: 'static/models/hands/valve_index_right.gltf',
};

/**
 * Generates a hand event
 * @param {Object} evt event
 * @param {string} eventName name of event, i.e. 'triggerup'
 * @param {Object} myThis reference to object that generated the event
 * @private
 */
function eventAction(evt, eventName, myThis) {

    const newPosition = new THREE.Vector3();

    const coordsData = {
        x: myThis.position.x.toFixed(3),
        y: myThis.position.y.toFixed(3),
        z: myThis.position.z.toFixed(3),
    };

     const objName = myThis.name;
    if (objName) {
        const payload = {
            object_id: objName,
            action: 'clientEvent',
            type: eventName,
            data: {
                position: coordsData,
                source: objName,
                hand: myThis.attrValue.hand
            },
        };
        // console.log(payload)
        // publishing events attached to user id objects allows sculpting security
        ARENA.Mqtt.publish(`${ARENA.outputTopic}${objName}`, payload);
    }


    //console.log(eventName);

}

/**
 *  Tracking Hand controller movement in real time.
 * @module arena-hand
 * @property {boolean} enabled - Controller enabled.
 * @property {string} hand - Controller hand.
 *
 */
AFRAME.registerComponent('arena-hand', {
    dependencies: ['laser-controls'],
    schema: {
        enabled: {type: 'boolean', default: false},
        hand: {type: 'string', default: 'left'},
        remoteRender: {type: 'boolean', default: false},
    },

    init: function() {
        const _this = this;
        const el = this.el;
        const data = this.data;

        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();

        this.lastPose = '';

        // capitalize hand type
        data.hand = data.hand.charAt(0).toUpperCase() + data.hand.slice(1);

        this.name = data.hand === 'Left' ? ARENA.handLName : ARENA.handRName;

        el.addEventListener('controllerconnected', () => {
            el.setAttribute('visible', true);
            el.setAttribute('collision-publisher', 'enabled', true);
            const msg = {
                object_id: this.name,
                action: 'create',
                type: 'object',
                data: {
                    object_type: `hand${data.hand}`,
                    position: {x: 0, y: -1, z: 0},
                    url: this.getControllerURL(),
                    dep: ARENA.camName,
                },
            };
            msg.data['remote-render'] = {'enabled': data.remoteRender};
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${this.name}`, msg);
            data.enabled = true;
        });

        el.addEventListener('controllerdisconnected', () => {
            el.setAttribute('visible', false);
            el.setAttribute('collision-publisher', 'enabled', false);
            // when disconnected, try to cleanup hands
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${this.name}`, {
                object_id: this.name,
                action: 'delete',
            });
        });

        el.addEventListener('triggerup', function(evt) {
            eventAction(evt, 'triggerup', _this);
        });
        el.addEventListener('triggerdown', function(evt) {
            eventAction(evt, 'triggerdown', _this);
        });
        el.addEventListener('gripup', function(evt) {
            eventAction(evt, 'gripup', _this);
        });
        el.addEventListener('gripdown', function(evt) {
            eventAction(evt, 'gripdown', _this);
        });
        el.addEventListener('menuup', function(evt) {
            eventAction(evt, 'menuup', _this);
        });
        el.addEventListener('menudown', function(evt) {
            eventAction(evt, 'menudown', _this);
        });
        el.addEventListener('systemup', function(evt) {
            eventAction(evt, 'systemup', _this);
        });
        el.addEventListener('systemdown', function(evt) {
            eventAction(evt, 'systemdown', _this);
        });
        el.addEventListener('trackpadup', function(evt) {
            eventAction(evt, 'trackpadup', _this);
        });
        el.addEventListener('trackpaddown', function(evt) {
            eventAction(evt, 'trackpaddown', _this);
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.camUpdateIntervalMs, this);
    },

    getControllerURL() {
        const el = this.el;
        const data = this.data;

        let url = el.getAttribute('gltf-model');
        if (!url) url = handControllerPath[data.hand];

        if (url.includes('magicleap')) {
            el.setAttribute('laser-controls', 'model', false);
            url = `${window.location.origin}/store/models/controllers/magicleap/magicleap-two-controller.glb`;
            el.setAttribute('gltf-model', '');
        }

        return url;
    },

    publishPose() {
        const data = this.data;
        if (!data.enabled || !data.hand) return;
        // const hand = data.hand.charAt(0).toUpperCase() + data.hand.slice(1);

        const msg = {
            object_id: this.name,
            action: 'update',
            type: 'object',
            data: {
                object_type: `hand${this.data.hand}`,
                position: {
                    x: parseFloat(this.position.x.toFixed(3)),
                    y: parseFloat(this.position.y.toFixed(3)),
                    z: parseFloat(this.position.z.toFixed(3)),
                },
                rotation: { // always send quaternions over the wire
                    x: parseFloat(this.rotation._x.toFixed(3)),
                    y: parseFloat(this.rotation._y.toFixed(3)),
                    z: parseFloat(this.rotation._z.toFixed(3)),
                    w: parseFloat(this.rotation._w.toFixed(3)),
                },
                url: this.getControllerURL(),
                dep: ARENA.camName,
            },
        };
        msg.data['remote-render'] = {'enabled': data.remoteRender};
        ARENA.Mqtt.publish(`${ARENA.outputTopic}${this.name}`, msg);
    },

    update: function(oldData) {
        const el = this.el;
        const data = this.data;

        if (oldData.remoteRender !== data.remoteRender) {
            this.publishPose();
        }
    },

    tick: (function(t, dt) {
        const el = this.el;
        const data = this.data;

        if (!this.name) {
            this.name = this.data.hand === 'Left' ? ARENA.handLName : ARENA.handRName;
        }
        el.setAttribute('raycaster', 'showLine', !data.remoteRender);
        el.setAttribute('visible', !data.remoteRender);

        // remove orientationOffset per model to publish matching rendered pose
        if (this.orientationOffset === undefined) {
            const controls = this.el.components["tracked-controls"];
            if (controls !== undefined) {
                this.orientationOffset = controls.data.orientationOffset;
                console.log(`Applying ${controls.data.id} ${controls.data.hand} orientationOffset=${JSON.stringify(this.orientationOffset)}`);
            }
        } else {
            // TODO (mwfarb): this method is close, but orientation is a little off
            this.rotation.setFromRotationMatrix(this.el.object3D.matrixWorld);
            const offset = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    THREE.MathUtils.degToRad(-this.orientationOffset.x),
                    THREE.MathUtils.degToRad(-this.orientationOffset.y),
                    THREE.MathUtils.degToRad(-this.orientationOffset.z)
                )
            );
            this.rotation.multiply(offset);
        }
        this.position.setFromMatrixPosition(this.el.object3D.matrixWorld);

        const rotationCoords = AFRAME.utils.coordinates.stringify(this.rotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(this.position);

        const newPose = rotationCoords + ' ' + positionCoords;
        if (this.lastPose !== newPose) {
            this.publishPose();
            this.lastPose = newPose;
        }
    }),
});
