/* global AFRAME */

/**
 * @fileoverview Component to remove entity after a specified number of seconds.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Time To Live (TTL) component.
 *
 * When applied to an entity, the entity will remove itself from DOM after the specified number of seconds.
 * Update *is* allowed, which will reset the timer to start from that moment.
 *
 * @property {number} seconds - Seconds until entity is removed
 * @property {object} expireAt - Expiration time [Date object]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date}
 * @module ttl
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
        }
    },
});
