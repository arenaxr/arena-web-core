/**
 * @fileoverview Component to remove entity after a specified number of seconds.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { Delete } from '../../systems/core/message-actions';

/**
 * Time To Live (TTL) component.
 *
 * When applied to an entity, the entity will remove itself from DOM after the specified number of seconds.
 * Update *is* allowed, which will reset the timer to start from that moment.
 *
 * @property {number} seconds - Seconds until entity is removed
 * @module ttl
 */
AFRAME.registerComponent('ttl', {
    schema: {
        seconds: { type: 'number' },
    },
    init() {
        if (this.data > 0) {
            const now = new Date();
            now.setSeconds(now.getSeconds() + this.data.seconds);
            this.expireAt = now;
            this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
        }
    },
    update() {
        if (this.data >= 0) {
            // Allow -1 to bypass TTL update, retains previous timeout
            const now = new Date();
            now.setSeconds(now.getSeconds() + this.data.seconds);
            this.expireAt = now;
        }
    },
    tick() {
        const now = new Date();
        if (now > this.expireAt) {
            Delete.handle({ id: this.el.id });
        }
    },
});
