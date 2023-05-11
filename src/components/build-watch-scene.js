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
    schema: {
        sceneOptionsObject: {
            type: 'string',
            default: 'scene-options',
        },
    },
    // TODO: reduce logging to a reasonable level, similar to build page
    multiple: false,
    init: function () {
        const observer = new MutationObserver(this.sceneNodesUpdate);
        console.log('build3d watching scene children...');
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
                    console.log(
                        `The ${mutation.attributeName} attribute was modified.`,
                        mutation.target.id,
                        mutation.oldValue
                    );
                    // TODO: we are writing to DOM to frequently, try diffing a change graph...
                    if (mutation.attributeName === 'class') {
                        if (mutation.target.className.includes('a-mouse-cursor-hover')) {
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
                    console.log(
                        `The ${mutation.attributeName} attribute was modified.`,
                        mutation.target.id,
                        mutation.oldValue
                    );
                    if (mutation.attributeName === 'class') {
                        if (mutation.target.classList.contains('active')) {
                            toolbarName = mutation.target.title;
                            console.log('toolbarName', toolbarName);
                        }
                    }
                    break;
            }
        });
    },
    tick: function () {
        // TODO: move these detectors out to a more reliable timing condition
        if (!this.scenegraphDiv) {
            this.scenegraphDiv = document.getElementById('scenegraph');
            if (this.scenegraphDiv) {
                console.log('scenegraphTest ok');
                const inspectorMqttLog = document.createElement('div');
                inspectorMqttLog.id = 'inspectorMqttLog';
                inspectorMqttLog.className = 'outliner';
                inspectorMqttLog.tabIndex = 1;
                inspectorMqttLog.style.height = '50%';
                inspectorMqttLog.style.overflow = 'overflow';
                this.scenegraphDiv.appendChild(inspectorMqttLog);

                const line = document.createElement('span');
                line.innerHTML += `Pub MQTT: watching local changes...`;
                inspectorMqttLog.appendChild(document.createElement('br'));
                inspectorMqttLog.appendChild(line);
                    }
        }
        if (!this.cursor) {
            if (document.getElementsByClassName('a-grab-cursor').length > 0) {
                console.log('cursorTest ok');
                this.cursor = document.getElementsByClassName('a-grab-cursor')[0];
                if (this.cursor) {
                    // watch for mouse down use of grab tools
                    const observer = new MutationObserver(this.cursorAttributesUpdate);
                    console.log('build3d watching cursor class attributes...');
                    observer.observe(this.cursor, {
                        attributeFilter: ['class'],
                        attributes: true,
                        attributeOldValue: true,
                    });
                }
            }
        }
        // TODO: fix transformToolbar, is usually late and gets clipped from the global pause()
        if (!this.transformToolbar) {
            if (document.getElementsByClassName('toolbarButtons').length > 0) {
                console.log('transformTest ok');
                this.transformToolbar = document.getElementsByClassName('toolbarButtons')[0];
                if (this.transformToolbar) {
                    // watch for active toolbar grab tool change
                    const observer = new MutationObserver(this.transformToolbarUpdate);
                    console.log('build3d watching toolbar class attributes...');
                    observer.observe(this.transformToolbar, {
                        attributeFilter: ['class'],
                        attributes: true,
                        subtree: true,
                    });
                }
            }
        }
        if (!this.env) {
            this.env = document.getElementById('env');
            if (this.env) {
                console.log('envTest ok');
                this.env.setAttribute('build-watch-object', 'enabled', true);
            }
        }
    },
});
