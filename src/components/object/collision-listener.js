/**
 * @fileoverview Listen for collisions, callback on event.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { ARENAUtils } from '../../utils';
import { TOPICS } from '../../constants';

/**
 * Listen for collisions, callback on event.
 * Requires [A-Frame PhysX]{@link https://github.com/c-frame/physx}
 * @module collision-listener
 * @requires 'aframe-physx'
 */
AFRAME.registerComponent('collision-listener', {
    init() {
        const { topicParams } = ARENA;
        const topicBase = TOPICS.PUBLISH.SCENE_USER.formatStr(topicParams);
        const topicBasePrivate = TOPICS.PUBLISH.SCENE_USER_PRIVATE.formatStr(topicParams);
        const topicBasePrivateProg = TOPICS.PUBLISH.SCENE_PROGRAM_PRIVATE.formatStr(topicParams);

        const publishCollision = (evt, type) => {
            // physics contact events
            const colliderEl = evt.detail.otherComponent?.el;
            if (!colliderEl) return;
            const colliderId = colliderEl.id;

            // only act if we are colliding with the client's own camera or hands
            let sourceName;
            if (colliderId === 'my-camera') {
                sourceName = ARENA.idTag;
            } else if (colliderId === 'leftHand' || colliderId === 'rightHand') {
                sourceName = colliderEl.components['arena-hand']?.name || `${colliderId}_${ARENA.idTag}`;
            } else {
                return;
            }

            const thisMsg = {
                object_id: sourceName,
                action: 'clientEvent',
                type: type,
                data: {
                    target: this.el.id,
                    targetPosition: ARENAUtils.getWorldPos(this.el),
                    originPosition: ARENAUtils.getWorldPos(colliderEl),
                },
            };

            ARENAUtils.publishClientEvent(this.el, thisMsg, topicBase, topicBasePrivate, topicBasePrivateProg);
        };

        this.onContactBegin = (evt) => publishCollision(evt, 'collision');

        this.el.addEventListener('contactbegin', this.onContactBegin);
        // contactend is also possible, just keeping state old with Ammo.js system for now
    },

    remove() {
        this.el.removeEventListener('contactbegin', this.onContactBegin);
    }
});
