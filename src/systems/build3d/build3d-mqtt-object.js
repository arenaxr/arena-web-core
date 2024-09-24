/**
 * @fileoverview Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { TOPICS } from '../../constants';

const symbols = { create: 'create', update: 'update', delete: 'delete' };

function LogToUser(msg, attributeName, changes) {
    const inspectorMqttLog = document.getElementById('inspectorMqttLog');
    if (inspectorMqttLog) {
        inspectorMqttLog.appendChild(document.createElement('br'));
        const line = document.createElement('span');
        line.innerHTML += `${symbols[msg.action]}: ${msg.object_id} ${attributeName || ''} ${JSON.stringify(
            changes || (msg.data ? msg.data : '')
        )}`;
        inspectorMqttLog.appendChild(line);
        line.scrollIntoView();
    }
}

function extractDataFullDOM(mutation) {
    let data = { object_type: 'entity' };
    mutation.target.attributes.forEach((attr) => {
        const attribute = mutation.target.getAttribute(attr.name);
        switch (attr.name) {
            case 'gaussian_splatting':
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
            case 'urdf-model':
                data.object_type = attr.name;
                break;
            default:
            // skip
        }
        switch (attr.name) {
            case 'id':
            case 'build3d-mqtt-object':
                // skip
                break;
            case 'position':
                data.position = attribute;
                break;
            case 'rotation':
                // eslint-disable-next-line no-case-declarations
                const { quaternion } = mutation.target.object3D;
                data.rotation = {
                    // always send quaternions over the wire
                    x: quaternion._x,
                    y: quaternion._y,
                    z: quaternion._z,
                    w: quaternion._w,
                };
                break;
            case 'scale':
                data.scale = attribute;
                break;
            case 'geometry':
                // we apply primitive data directory to root data
                data = { ...data, ...attribute };
                delete data.primitive;
                if (mutation.target.nodeName.toLowerCase() === 'a-videosphere') {
                    // sphere shouldn't overwrite videosphere
                    data.object_type = 'videosphere';
                } else if (attribute.primitive === 'plane') {
                    // plane shouldn't overwrite image
                    data.object_type = mutation.target.hasAttribute('src') ? 'image' : attribute.primitive;
                } else {
                    data.object_type = attribute.primitive;
                }
                break;
            case 'environment':
                data['env-presets'] = attribute;
                delete data.object_type;
                break;
            default:
                data[attr.name] = attribute;
                break;
        }
    });
    return data;
}

function extractDataUpdates(mutation, attribute, changes) {
    let data = {};
    switch (mutation.attributeName) {
        case 'gaussian_splatting':
        case 'gltf-model':
        case 'image': // TODO (mwfarb): add url update to material.src
        case 'light':
        case 'line':
        case 'obj-model':
        case 'ocean':
        case 'pcd-model':
        case 'text':
        case 'thickline':
        case 'threejs-scene':
        case 'urdf-model':
            data.object_type = mutation.attributeName;
            break;
        default:
        // skip
    }
    switch (mutation.attributeName) {
        case 'id':
        case 'build3d-mqtt-object':
            // skip
            break;
        case 'position':
            data.position = attribute;
            break;
        case 'rotation':
            // eslint-disable-next-line no-case-declarations
            const { quaternion } = mutation.target.object3D;
            data.rotation = {
                // always send quaternions over the wire
                x: quaternion._x,
                y: quaternion._y,
                z: quaternion._z,
                w: quaternion._w,
            };
            break;
        case 'scale':
            data.scale = attribute;
            break;
        case 'geometry':
            // we apply primitive data directory to root data
            if (changes) {
                data = changes;
                delete data.primitive;
            }
            if (mutation.target.nodeName.toLowerCase() === 'a-videosphere') {
                // sphere shouldn't overwrite videosphere
                data.object_type = 'videosphere';
            } else if (attribute.primitive === 'plane') {
                // plane shouldn't overwrite image
                data.object_type = mutation.target.hasAttribute('src') ? 'image' : attribute.primitive;
            } else {
                data.object_type = attribute.primitive;
            }
            break;
        case 'environment':
            data['env-presets'] = changes || {};
            break;
        default:
            // handle special cases of boolean as string first
            if (changes === 'true' || changes === 'false') data[mutation.attributeName] = JSON.parse(changes);
            else data[mutation.attributeName] = changes || {};
            break;
    }
    // if (!data.object_type) {
    //     // always try and get the object_type, complicated
    //     let dataFull = extractDataFullDOM(mutation);
    //     if (dataFull.object_type) data.object_type = dataFull.object_type;
    // }

    return data;
}

/**
 * Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 * @module build3d-mqtt-object
 */
// TODO: reduce logging to a reasonable level, similar to build page
AFRAME.registerComponent('build3d-mqtt-object', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    schema: {
        enabled: {
            type: 'boolean',
            default: true,
        },
    },
    init() {
        this.observer = new MutationObserver(this.objectAttributesUpdate);
    },
    objectAttributesUpdate(mutationList, observer) {
        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
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
                    if (mutation.attributeName === 'build3d-mqtt-object') {
                        return; // no need to handle on/off mutations to our own component
                    }
                    if (mutation.target.id) {
                        // TODO (mwfarb): make name change occur only on focus loss, otherwise is too frequent
                        const attribute = mutation.target.getAttribute(mutation.attributeName);
                        // when 'id' changes, we have a new object, maybe a name change
                        const msg = {
                            object_id: mutation.target.id === 'env' ? 'scene-options' : mutation.target.id,
                            action: mutation.attributeName === 'id' ? 'create' : 'update',
                            type: mutation.target.id === 'env' ? 'scene-options' : 'object',
                            persist: true,
                            data: {},
                        };
                        // use aframe-watcher updates to send only changes updated
                        let changes;
                        if (
                            AFRAME.INSPECTOR &&
                            AFRAME.INSPECTOR.history &&
                            AFRAME.INSPECTOR.history.updates[mutation.target.id]
                        ) {
                            changes = AFRAME.INSPECTOR.history.updates[mutation.target.id][mutation.attributeName];
                        }
                        if (msg.action === 'update') {
                            msg.data = extractDataUpdates(mutation, attribute, changes);
                        } else if (msg.action === 'create') {
                            msg.data = extractDataFullDOM(mutation); // TODO(mwfarb): careful here, this still may pull too much data
                        }
                        LogToUser(msg, mutation.attributeName, changes);
                        console.log('publishing:', msg.action, msg);
                        ARENA.Mqtt.publish(
                            topicBase.formatStr({
                                objectId: msg.object_id,
                            }),
                            msg
                        );

                        // check rename case
                        if (
                            mutation.attributeName === 'id' &&
                            mutation.oldValue &&
                            mutation.target.id !== mutation.oldValue
                        ) {
                            const outMsg = {
                                object_id: mutation.oldValue,
                                action: 'delete',
                                persist: true,
                            };
                            LogToUser(outMsg);
                            console.log('publishing:', outMsg.action, outMsg);
                            ARENA.Mqtt.publish(
                                topicBase.formatStr({
                                    objectId: outMsg.object_id,
                                }),
                                outMsg
                            );
                        }
                    }
                    break;
                default:
                // ignore
            }
        });
    },
    update() {
        if (this.data.enabled) {
            console.log(`build3d watching entity ${this.el.id} attributes...`);
            this.observer.observe(this.el, {
                attributes: true,
                attributeOldValue: true,
            });
        } else {
            this.observer.disconnect();
            console.log(`build3d watching entity ${this.el.id} attributes stopped`);
        }
    },
    remove() {
        const el = document.getElementById(this.el.id);
        // don't delete if only the component is removed, the node must be removed
        if (!el) {
            const msg = {
                object_id: this.el.id,
                action: 'delete',
                persist: true,
            };
            LogToUser(msg);
            console.log('publishing:', msg.action, msg);
            ARENA.Mqtt.publish(
                TOPICS.PUBLISH.SCENE_OBJECTS.formatStr({
                    nameSpace: ARENA.nameSpace,
                    sceneName: ARENA.sceneName,
                    object_id: msg.object_id,
                }),
                msg
            );
        }
    },
});
