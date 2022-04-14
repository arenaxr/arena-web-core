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
        const sceneRoot = document.getElementById('sceneRoot');
        const observerOptions = {
            childList: true,
            attributes: true,
            subtree: true,
        }

        const observer = new MutationObserver(this.callback);
        observer.observe(sceneRoot, observerOptions);

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    callback: function(mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    if (mutation.addedNodes.length > 0)
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                    if (mutation.removedNodes.length > 0)
                        console.log(`${mutation.removedNodes.length} child nodes has=ve been removed.`, mutation.removedNodes);
                    // mutation.addedNodes
                    // mutation.removedNodes
                    break;
                case 'attributes':
                    console.log(`The ${mutation.attributeName} attribute was modified.`, mutation.target);
                    // mutation.target
                    // mutation.attributeName
                    // mutation.oldValue
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
