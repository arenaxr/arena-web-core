/* global AFRAME */

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
