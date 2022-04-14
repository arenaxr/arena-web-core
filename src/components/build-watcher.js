/* global AFRAME, ARENA */

/**
 * @fileoverview Create an observer to listen for changes mde locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Create an observer to listen for changes mde locally in the A-Frame Inspector and publish them to MQTT.
 * @module build-watcher
 */
AFRAME.registerComponent('build-watcher', {
    // create an observer to listen for changes mde locally in the a-frame inspector and publish them to mqtt.
    multiple: false,
    init: function() {
        const sceneEl = document.querySelector('a-scene');
        const observerOptions = {
            childList: true,
            attributes: true,
            subtree: true,
        }

        const observer = new MutationObserver(this.callback);
        observer.observe(sceneEl, observerOptions);

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    callback: function(mutationList, observer) {
        const staticIds = ['groundPlane', 'env', 'stars', 'ambient-light', 'point-light', 'aframeInspectorMouseCursor'];
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    // mutation.addedNodes
                    // mutation.removedNodes
                    if (mutation.addedNodes.length > 0)
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                    if (mutation.removedNodes.length > 0)
                        console.log(`${mutation.removedNodes.length} child nodes have been removed.`, mutation.removedNodes);
                    break;
                case 'attributes':
                    // mutation.target
                    // mutation.attributeName
                    // mutation.oldValue
                    if (mutation.target.getAttribute('arena-user'))
                        return;
                    if (mutation.target.id && !staticIds.includes(mutation.target.id)) {
                        console.log(`The ${mutation.attributeName} attribute was modified.`, mutation.target.id);
                        if (mutation.target.getAttribute('gltf-model')) {
                            obj_type = 'gltf-model';
                        } else if (mutation.target.getAttribute('geometry')) {
                            obj_type = mutation.target.getAttribute('geometry').primitive;
                        } else {
                            return;
                        }
                        const msg = {
                            object_id: mutation.target.id,
                            action: 'update',
                            type: 'object',
                            persist: true,
                            data: {
                                object_type: obj_type,
                            },
                        };
                        let pub = true;
                        switch (mutation.attributeName) {
                            // case 'id':
                            //     // TODO: handle id
                            //     pub = false;
                            //     break;
                            // case 'geometry':
                            //     // geometry updated above
                            //     break;
                            case 'position':
                                msg.data.position = mutation.target.getAttribute('position');
                                break;
                            case 'rotation':
                                msg.data.rotation = mutation.target.getAttribute('rotation');
                                break;
                            case 'scale':
                                msg.data.scale = mutation.target.getAttribute('scale');
                                break;
                            // case 'material':
                            //     msg.data.material = {
                            //         color: mutation.target.getAttribute('material').color
                            //     };
                            //     break;
                            default:
                                pub = false;
                                break;
                        }
                        console.log(msg)
                        if (pub) ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);
                    }
                    break;
            }
        });
    },
    remove: function() {
        this.system.unregisterComponent(this.el);
    },
    tick: function() {
        const sceneRoot = document.getElementById('sceneRoot');
        sceneRoot.flushToDOM(true);
    },
});
