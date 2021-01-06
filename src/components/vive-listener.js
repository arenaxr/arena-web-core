/* global AFRAME */


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
    const objName = myThis.id + '_' + globals.idTag;
    publish(globals.outputTopic + objName, {
        object_id: objName,
        action: 'clientEvent',
        type: eventName,
        data: {
            position: coordsData,
            source: globals.camName,
        },
    });
}

/**
 * Vive events.
 *
 */
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
    },
});
