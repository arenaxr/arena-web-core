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
 * @module build-watch-object
 */
AFRAME.registerComponent('build-watch-object', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    schema: {
        enabled: {
            type: 'boolean',
            default: true
        },
        openJsonEditor: {
            type: 'boolean',
            default: false
        },
    },
    init: function() {
        this.observer = new MutationObserver(this.callback);
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    callback: function(mutationList, observer) {
        const inspectorMqttLog = document.getElementById('inspectorMqttLog');
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
                    if (mutation.attributeName === 'build-watch-object') {
                        return; // no need to handle on/off mutations to our own component
                    }
                    if (mutation.target.id) {
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
                            case 'position':
                                msg.data.position = mutation.target.getAttribute('position');
                                break;
                            case 'rotation':
                                const quaternion = mutation.target.object3D.quaternion;
                                msg.data.rotation = { // always send quaternions over the wire
                                    x: quaternion._x,
                                    y: quaternion._y,
                                    z: quaternion._z,
                                    w: quaternion._w,
                                };
                                break;
                            case 'scale':
                                msg.data.scale = mutation.target.getAttribute('scale');
                                break;
                            case 'geometry':
                                // TODO: create system of checking which geometry item was changed, all is too much
                                msg.data = mutation.target.getAttribute('geometry')
                                break;
                            case 'material':
                                // TODO: create system of checking which material item was changed, all is too much
                                msg.data.material = {
                                    color: mutation.target.getAttribute('material').color
                                };
                                break;
                            default:
                                pub = false;
                                break;
                        }
                        console.log('pub:', msg);
                        if (inspectorMqttLog) {
                            const line = document.createElement('pre');
                            line.innerHTML += `${msg.object_id} ${msg.action} ${mutation.attributeName}`;
                            inspectorMqttLog.appendChild(line);
                            line.scrollIntoView();                      }
                        if (pub) ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);
                    }
                    break;
            }
        });
    },
    update: function() {
        if (this.data.enabled) {
            this.observer.observe(this.el, {
                childList: true,
                attributes: true,
                subtree: true,
            });
        } else {
            this.observer.disconnect();
        }
        // quick setting for user to edit in the build page
        if (this.data.openJsonEditor) {
            window.open(`/build/?scene=${ARENA.namespacedScene}&objectId=${this.el.id}`, 'ArenaJsonEditor');
            this.data.openJsonEditor = false; // restore
        }
    },
    tick: function() {
        // this.el.flushToDOM(true);
    },
});
