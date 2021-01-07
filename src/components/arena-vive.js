/* global AFRAME, ARENA */

/**
 * Generates a vive event
 * @param {Object} evt event
 * @param {string} eventName name of event, i.e. 'triggerup'
 * @param {Object} myThis reference to object that generated the event
 */
function eventAction(evt, eventName, myThis) {
    const newPosition = myThis.object3D.position;

    const coordsData = {
        x: newPosition.x.toFixed(3),
        y: newPosition.y.toFixed(3),
        z: newPosition.z.toFixed(3),
    };

    // publish to MQTT
    const objName = myThis.id + '_' + ARENA.idTag;
    publish(ARENA.outputTopic + objName, {
        object_id: objName,
        action: 'clientEvent',
        type: eventName,
        data: {
            position: coordsData,
            source: ARENA.camName,
        },
    });
}

/**
 * Tracking Vive controller movement in real time.
 *
 */
AFRAME.registerComponent('arena-vive', {
    schema: {
        enabled: {type: 'boolean', default: false},
        name: {type: 'string', default: ''},
        hand: {type: 'string', default: 'left'},
        color: {type: 'string', default: '#' + Math.floor(Math.random() * 16777215).toString(16)},
    },

    init: function() {
        const el = this.el;

        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();

        this.lastPose = '';

        el.addEventListener('triggerup', function(evt) {
            eventAction(evt, 'triggerup', this);
        });
        el.addEventListener('triggerdown', function(evt) {
            eventAction(evt, 'triggerdown', this);
        });
        el.addEventListener('gripup', function(evt) {
            eventAction(evt, 'gripup', this);
        });
        el.addEventListener('gripdown', function(evt) {
            eventAction(evt, 'gripdown', this);
        });
        el.addEventListener('menuup', function(evt) {
            eventAction(evt, 'menuup', this);
        });
        el.addEventListener('menudown', function(evt) {
            eventAction(evt, 'menudown', this);
        });
        el.addEventListener('systemup', function(evt) {
            eventAction(evt, 'systemup', this);
        });
        el.addEventListener('systemdown', function(evt) {
            eventAction(evt, 'systemdown', this);
        });
        el.addEventListener('trackpadup', function(evt) {
            eventAction(evt, 'trackpadup', this);
        });
        el.addEventListener('trackpaddown', function(evt) {
            eventAction(evt, 'trackpaddown', this);
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, ARENA.updateMillis, this);
    },

    publishPose() {
        const data = this.data;
        if (!data.enabled || !data.hand) return;
        const hand = data.hand.charAt(0).toUpperCase() + data.hand.slice(1);

        const msg = {
            object_id: data.name,
            action: 'update',
            type: 'object',
            data: {
                object_type: 'vive'+hand,
                position: {
                    x: parseFloat(this.position.x.toFixed(3)),
                    y: parseFloat(this.position.y.toFixed(3)),
                    z: parseFloat(this.position.z.toFixed(3)),
                },
                rotation: {
                    x: parseFloat(this.rotation._x.toFixed(3)),
                    y: parseFloat(this.rotation._y.toFixed(3)),
                    z: parseFloat(this.rotation._z.toFixed(3)),
                    w: parseFloat(this.rotation._w.toFixed(3)),
                },
                color: data.color,
            },
        };
        publish(ARENA.outputTopic + data.name, msg);
    },

    tick: (function(t, dt) {
        this.rotation = this.el.object3D.quaternion;
        this.position = this.el.object3D.position;

        const rotationCoords = AFRAME.utils.coordinates.stringify(this.rotation);
        const positionCoords = AFRAME.utils.coordinates.stringify(this.position);

        const newPose = rotationCoords + ' ' + positionCoords;
        if (this.lastPose !== newPose) {
            this.publishPose();
            this.lastPose = newPose;
        }
    }),
});
