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
 * Update *is* allowed, which will reset the timer to start from that moment. Note that this is a top-level property
 * in MQTT messages, with the seconds value simply as a scalar rather than a nested object property.
 *
 * @property {int} expireAt - Epoch until entity is removed
 * @module ttl
 */
AFRAME.registerComponent('ttl', {
    schema: {
        expireAt: { type: 'int' },
    },
    init() {
        console.log('ttl', 'init', this.data.expireAt, this.el.id);
        if (this.data.expireAt > 0) {
            this.expireAt = Date.now() + this.data.seconds * 1000;
            this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
        }
    },
    tick() {
        const now = Date.now();
        if (this.data.expireAt > 0 && now > this.data.expireAt) {
            console.log('ttl', 'delete', this.data.expireAt, this.el.id);
            Delete.handle({ id: this.el.id });
        }
    },
});
