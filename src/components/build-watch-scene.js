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
    init: function () {
        const observer = new MutationObserver(this.sceneNodesUpdate);
        observer.observe(this.el, {
            childList: true,
            attributes: false,
            subtree: true,
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    sceneNodesUpdate: function (mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    // mutation.addedNodes
                    if (mutation.addedNodes.length > 0) {
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                        mutation.addedNodes.forEach((node) => {
                            console.log('add node:', node.nodeName, node.components);
                            // new blank entities are added by the user in the inspector
                            if (node.nodeName == 'A-ENTITY' && Object.keys(node.components).length == 0) {
                                console.log('add build-watch-object:');
                                node.setAttribute('build-watch-object', 'enabled', true);
                            }
                        });
                    }
                    // mutation.removedNodes
                    if (mutation.removedNodes.length > 0) {
                        console.log(
                            `${mutation.removedNodes.length} child nodes have been removed.`,
                            mutation.removedNodes
                        );
                        mutation.removedNodes.forEach((node) => {
                            console.log('delete node:', node.nodeName, node.components);
                        });
                    }
                    break;
            }
        });
    },
    tick: function () {
        // this.el.flushToDOM(true);
    },
});
