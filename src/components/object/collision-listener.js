/**
 * @fileoverview Listen for collisions, callback on event.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Listen for collisions, callback on event.
 * Requires [Physics for A-Frame VR]{@link https://github.com/c-frame/aframe-physics-system}
 * @module collision-listener
 * @requires 'aframe-physics-system'
 */
AFRAME.registerComponent('collision-listener', {
    // listen for collisions, call defined function on event evt
    init() {
        // console.log("collision-listener Component init");
        this.el.addEventListener('collide', function onCollide(evt) {
            // colliding object, only act if is clients' own
            const collider = evt.detail.body.el.id;
            if (collider !== 'my-camera') {
                return;
            }

            // const coordsData = ARENAUtils.setClickData(evt);
            const coordsData = {
                x: 0,
                y: 0,
                z: 0,
            };

            // original click event; simply publish to MQTT
            const thisMsg = {
                object_id: this.id,
                action: 'clientEvent',
                type: 'collision',
                data: {
                    position: coordsData,
                    source: collider,
                },
            };
            // publishing events attached to user id objects allows sculpting security
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
        });
    },
});
