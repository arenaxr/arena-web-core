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
            default: true,
        },
        openJsonEditor: {
            type: 'boolean',
            default: false,
        },
    },
    init: function () {
        this.observer = new MutationObserver(this.callback);
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    callback: function (mutationList, observer) {
        const inspectorMqttLog = document.getElementById('inspectorMqttLog');
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    // mutation.addedNodes
                    // mutation.removedNodes
                    if (mutation.addedNodes.length > 0)
                        console.log(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                    if (mutation.removedNodes.length > 0)
                        console.log(
                            `${mutation.removedNodes.length} child nodes have been removed.`,
                            mutation.removedNodes
                        );
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
                        const attribute = mutation.target.getAttribute(mutation.attributeName);
                        // use aframe-watcher updates to send only changes updated

                        const changes = AFRAME.INSPECTOR.history.updates[mutation.target.id][mutation.attributeName];
                        switch (mutation.attributeName) {
                            case 'geometry':
                                obj_type = attribute.primitive;
                                break;
                            case 'gltf-model':
                            case 'image':
                            case 'light':
                            case 'line':
                            case 'obj-model':
                            case 'ocean':
                            case 'pcd-model':
                            case 'text':
                            case 'thickline':
                            case 'threejs-scene':
                                obj_type = mutation.attributeName;
                                break;
                            default:
                                obj_type = 'entity';
                                break;
                        }
                        const msg = {
                            object_id: mutation.target.id,
                            action: 'update',
                            type: 'object',
                            persist: true,
                            data: {},
                        };
                        if (obj_type) msg.data.object_type = obj_type;
                        switch (mutation.attributeName) {
                            case 'position':
                                msg.data.position = attribute;
                                break;
                            case 'rotation':
                                const quaternion = mutation.target.object3D.quaternion;
                                msg.data.rotation = {
                                    // always send quaternions over the wire
                                    x: quaternion._x,
                                    y: quaternion._y,
                                    z: quaternion._z,
                                    w: quaternion._w,
                                };
                                break;
                            case 'scale':
                                msg.data.scale = attribute;
                                break;
                            case 'geometry':
                                // we apply primitive data directory to root data
                                if (changes){
                                    msg.data = changes;
                                    delete msg.data.primitive;
                                    msg.data.object_type = changes.primitive;
                                } else {
                                    msg.data.object_type = attribute.primitive;
                                }
                                break;
                            default:
                                if (changes){
                                    msg.data[mutation.attributeName] = changes;
                                } else {
                                    msg.data[mutation.attributeName] = {};
                                }
                                break;
                        }
                        console.log('pub:', msg);
                        if (inspectorMqttLog) {
                            const line = document.createElement('span');
                            line.innerHTML += `Pub: ${mutation.attributeName} ${msg.object_id} ${JSON.stringify(
                                changes
                            )}`;
                            inspectorMqttLog.appendChild(document.createElement('br'));
                            inspectorMqttLog.appendChild(line);
                            line.scrollIntoView();
                        }
                        ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);
                    }
                    break;
            }
        });
    },
    update: function () {
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
    tick: function () {
        // this.el.flushToDOM(true);
    },
});
