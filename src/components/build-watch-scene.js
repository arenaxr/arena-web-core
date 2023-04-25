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
                    if (mutation.addedNodes.length > 0)
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                    if (mutation.removedNodes.length > 0)
                        console.log(`${mutation.removedNodes.length} child nodes have been removed.`, mutation.removedNodes);
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
