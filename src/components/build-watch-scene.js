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
let toolbarName = 'translate';
AFRAME.registerComponent('build-watch-scene', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    multiple: false,
    init: function () {
        const observer = new MutationObserver(this.sceneNodesUpdate);
        observer.observe(this.el, {
            childList: true,
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
    cursorAttributesUpdate: function (mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'attributes':
                    // mutation.target
                    // mutation.attributeName
                    // mutation.oldValue
                    console.log(
                        `The ${mutation.attributeName} attribute was modified.`,
                        mutation.target.id,
                        mutation.oldValue
                    );
                    if (mutation.attributeName === 'class') {
                        if (mutation.oldValue && mutation.oldValue.includes('a-mouse-cursor-hover')) {
                            // flush selected attr to dom from grab cursor update
                            el = AFRAME.INSPECTOR.selectedEntity;
                            if (el) {
                                console.log('toolbar flush', el.id, toolbarName);
                                switch (toolbarName) {
                                    case 'translate':
                                        values = el.getAttribute('position');
                                        el.setAttribute('position', values);
                                        AFRAME.INSPECTOR.selectedEntity.components.position.flushToDOM();
                                        break;
                                    case 'rotate':
                                        values = el.getAttribute('rotation');
                                        el.setAttribute('rotation', values);
                                        AFRAME.INSPECTOR.selectedEntity.components.rotation.flushToDOM();
                                        break;
                                    case 'scale':
                                        values = el.getAttribute('scale');
                                        el.setAttribute('scale', values);
                                        AFRAME.INSPECTOR.selectedEntity.components.scale.flushToDOM();
                                        break;
                                }
                            }
                        }
                    }
                    break;
            }
        });
    },
    transformToolbarUpdate: function (mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'attributes':
                    // mutation.target
                    // mutation.attributeName
                    // mutation.oldValue
                    console.log(
                        `The ${mutation.attributeName} attribute was modified.`,
                        mutation.target.id,
                        mutation.oldValue
                    );
                    if (mutation.attributeName === 'class') {
                        if (mutation.target.classList.contains('active')) {
                            toolbarName=mutation.target.title;
                            console.log('toolbarName', toolbarName);
                        }
                    }
                    break;
            }
        });
    },
    tick: function () {
        if (!this.cursor) {
            if (document.getElementsByClassName('a-grab-cursor').length > 0) {
                this.cursor = document.getElementsByClassName('a-grab-cursor')[0];
                if (this.cursor) {
                    // watch for mouse down use of grab tools
                    const observer = new MutationObserver(this.cursorAttributesUpdate);
                    observer.observe(this.cursor, {
                        attributeFilter: ['class'],
                        attributes: true,
                        attributeOldValue: true,
                    });
                }
            }
        }
        if (!this.transformToolbar) {
            this.transformToolbar = document.getElementById('transformToolbar');
            if (this.transformToolbar) {
                // watch for active toolbar grab tool change
                const observer = new MutationObserver(this.transformToolbarUpdate);
                observer.observe(this.transformToolbar, {
                    attributeFilter: ['class'],
                    attributes: true,
                    subtree: true,
                });
            }
        }
    },
});
