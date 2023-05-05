/* global AFRAME, ARENA */

/**
 * @fileoverview Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 * @module build-watch-scene
 */
AFRAME.registerComponent('build-watch-scene', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    multiple: false,
    init: function() {
        const observer = new MutationObserver(this.callback);
        observer.observe(this.el, {
            childList: true,
            attributes: false,
            subtree: false,
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    callback: function(mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    // mutation.addedNodes
                    // mutation.removedNodes
                    if (mutation.addedNodes.length > 0){
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                    }
                    if (mutation.removedNodes.length > 0){
                        console.log(`${mutation.removedNodes.length} child nodes have been removed.`, mutation.removedNodes);
                        // if node has build-watch-object enabled, then we can send a delete message with id
                    }

                    // const attribute = mutation.target.getAttribute(mutation.attributeName);
                    // // use aframe-watcher updates to send only changes updated
                    // const changes = AFRAME.INSPECTOR.history.updates[mutation.target.id][mutation.attributeName];
                    // switch (mutation.attributeName) {
                    //     case 'geometry':
                    //         obj_type = attribute.primitive;
                    //         break;
                    //     case 'gltf-model':
                    //     case 'image':
                    //     case 'light':
                    //     case 'line':
                    //     case 'obj-model':
                    //     case 'ocean':
                    //     case 'pcd-model':
                    //     case 'text':
                    //     case 'thickline':
                    //     case 'threejs-scene':
                    //         obj_type = mutation.attributeName;
                    //         break;
                    //     default:
                    //         obj_type = 'entity';
                    //         break;
                    // }
                    break;
                case 'attributes':
                    // mutation.target
                    // mutation.attributeName
                    // mutation.oldValue
                    console.log(`The ${mutation.attributeName} attribute was modified.`, mutation.target.id);
                    // switch (mutation.attributeName) {
                    //     case 'id':
                    //         // TODO: handle id
                    //         pub = false;
                    //         break;
                    // }
                    break;
            }
        });
    },
    tick: function() {
        // this.el.flushToDOM(true);
    },
});
