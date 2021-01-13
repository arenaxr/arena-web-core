/* global AFRAME */

/**
 * TTL component.
 *
 * When applied to an entity, the entity will remove itself from DOM after the specified number of seconds.
 * Update *is* allowed, which will reset the timer to start from that moment.
 *
 * @member {object} expireAt - Expiration time Date object
 */
AFRAME.registerComponent('ttl', {
    schema: {
        seconds: {type: 'number'},
    },
    init: function() {
        const now = new Date();
        now.setSeconds(now.getSeconds() + this.data.seconds);
        this.expireAt = now;
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    update: function(oldData) {
        if (oldData.seconds !== this.data.expireAt) {
            const now = new Date();
            now.setSeconds(now.getSeconds() + this.data.seconds);
            this.expireAt = now;
        }
    },
    tick: function() {
        const now = new Date();
        if (now > this.expireAt) {
            this.el.parentNode.removeChild(this.el);
            delete ARENA.sceneObjects[this.el.id];
        }
    },
});
