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
    Array.from(mutation.target.attributes).forEach((attr) => {
        // Skip transforms in iteration; we explicitly fetch live object3D matrix below
        if (['position', 'rotation', 'scale'].includes(attr.name)) return;

        let attribute = mutation.target.getDOMAttribute(attr.name);
        
        if (typeof attribute === 'string' && attribute.includes(':')) {
            attribute = AFRAME.utils.styleParser.parse(attribute);
        }

        switch (attr.name) {
            case 'arenaui-button-panel':
            case 'arenaui-card':
            case 'arenaui-prompt':
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
            case 'visible':
                if (typeof attribute === 'object' && Object.keys(attribute).length === 0) data.visible = true;
                else if (attribute === 'false' || attribute === false) data.visible = false;
                else data.visible = true;
                break;
            case 'geometry':
                // we apply primitive data directory to root data
                if (attribute) {
                    data = { ...data, ...attribute };
                    delete data.primitive;
                    if (mutation.target.nodeName.toLowerCase() === 'a-videosphere') {
                        data.object_type = 'videosphere';
                    } else if (attribute.primitive === 'plane') {
                        data.object_type = mutation.target.hasAttribute('src') ? 'image' : attribute.primitive;
                    } else {
                        data.object_type = attribute.primitive || 'entity';
                    }
                }
                break;
            case 'environment':
                data['env-presets'] = attribute;
                delete data.object_type;
                break;
            case 'material':
                if (attribute && attribute.src) {
                    const geom = mutation.target.getAttribute('geometry');
                    if (geom && geom.primitive === 'plane') {
                        data.url = attribute.src;
                    }
                }
                data.material = attribute;
                break;
            default:
                if (attribute === 'true' || attribute === 'false') data[attr.name] = JSON.parse(attribute);
                else data[attr.name] = attribute;
                break;
        }
    });

    // Ensure accurate, live transforms are always included via local matrix regardless of DOM staleness
    if (mutation.target.object3D) {
        data.position = {
            x: mutation.target.object3D.position.x,
            y: mutation.target.object3D.position.y,
            z: mutation.target.object3D.position.z,
        };
        const { quaternion } = mutation.target.object3D;
        data.rotation = { x: quaternion._x, y: quaternion._y, z: quaternion._z, w: quaternion._w };
        data.scale = {
            x: mutation.target.object3D.scale.x,
            y: mutation.target.object3D.scale.y,
            z: mutation.target.object3D.scale.z,
        };
    }

    return data;
}

function extractDataUpdates(mutation, attribute, changes) {
    let data = {};

    switch (mutation.attributeName) {
        case 'arenaui-button-panel':
        case 'arenaui-card':
        case 'arenaui-prompt':
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
        case 'visible':
            if (typeof changes === 'object' && Object.keys(changes).length === 0) data.visible = true;
            else if (changes === 'false' || changes === false) data.visible = false;
            else data.visible = true;
            break;
        case 'material':
            if (changes && changes.src) {
                // If this is a plane/image, ARENA uses the root 'url' property instead of material.src
                const geom = mutation.target.getAttribute('geometry');
                if (geom && geom.primitive === 'plane') {
                    data.url = changes.src;
                }
            }
            data.material = changes || {};
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
AFRAME.registerComponent('build3d-mqtt-object', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    schema: {
        enabled: {
            type: 'boolean',
            default: true,
        },
    },
    init() {
        this.changedData = {};
        this.publishTimeout = null;

        this.lastTransform = {
            position: new THREE.Vector3(),
            rotation: new THREE.Quaternion(),
            scale: new THREE.Vector3(),
        };

        this.onComponentChanged = this.onComponentChanged.bind(this);
        this.objectAttributesUpdate = this.objectAttributesUpdate.bind(this);

        this.renameOldId = null;
        this.renameTimeout = null;

        // Track ID changes only
        this.observer = new MutationObserver(this.objectAttributesUpdate);

        this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);
    },
    debouncePublish() {
        if (this.publishTimeout) clearTimeout(this.publishTimeout);
        this.publishTimeout = setTimeout(() => {
            this.publishChanges();
        }, 150);
    },
    publishChanges() {
        if (!this.data.enabled || Object.keys(this.changedData).length === 0) return;
        const msg = {
            object_id: this.el.id === 'env' ? 'scene-options' : this.el.id,
            action: 'update',
            type: this.el.id === 'env' ? 'scene-options' : 'object',
            persist: true,
            data: { ...this.changedData },
        };
        this.changedData = {};
        LogToUser(msg, 'components');
        console.debug('publishing:', msg.action, JSON.stringify(msg));
        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
        ARENA.Mqtt.publish(
            topicBase.formatStr({
                objectId: msg.object_id,
            }),
            msg
        );
    },
    objectAttributesUpdate(mutationList, observer) {
        mutationList.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'id') {
                // console.debug(`The id attribute was modified.`, mutation.target.id, mutation.oldValue);
                if (mutation.oldValue && mutation.target.id !== mutation.oldValue) {
                    
                    // Capture the original ID only at the beginning of the typing sequence
                    if (!this.renameOldId) {
                        this.renameOldId = mutation.oldValue;
                    }

                    if (this.renameTimeout) {
                        clearTimeout(this.renameTimeout);
                    }

                    // Debounce keystrokes (wait 750ms after typing stops)
                    this.renameTimeout = setTimeout(() => {
                        const finalNewId = this.el.id;
                        const originalOldId = this.renameOldId;
                        
                        // Reset for next rename sequence
                        this.renameOldId = null;
                        this.renameTimeout = null;

                        if (originalOldId === finalNewId) return; // User renamed it back, abort

                        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);

                        const outMsg = {
                            object_id: originalOldId,
                            action: 'delete',
                            persist: true,
                        };
                        LogToUser(outMsg);
                        console.debug('publishing:', outMsg.action, JSON.stringify(outMsg));
                        ARENA.Mqtt.publish(
                            topicBase.formatStr({
                                objectId: outMsg.object_id,
                            }),
                            outMsg
                        );

                        // publishing create for new ID with full data
                        const fakeMutation = { target: this.el };
                        const createMsg = {
                            object_id: finalNewId === 'env' ? 'scene-options' : finalNewId,
                            action: 'create',
                            type: finalNewId === 'env' ? 'scene-options' : 'object',
                            persist: true,
                            data: extractDataFullDOM(fakeMutation),
                        };
                        LogToUser(createMsg, 'id');
                        console.debug('publishing:', createMsg.action, JSON.stringify(createMsg));
                        ARENA.Mqtt.publish(
                            topicBase.formatStr({
                                objectId: createMsg.object_id,
                            }),
                            createMsg
                        );
                    }, 750);
                }
            }
        });
    },
    onComponentChanged(evt) {
        if (!this.data.enabled || !this.el.id) return;
        const { name, newData } = evt.detail;
        if (name === 'position' || name === 'rotation' || name === 'scale' || name === 'build3d-mqtt-object') return;

        // Defer read to allow A-Frame Inspector to synchronously populate history.updates
        setTimeout(() => {
            let changes;
            if (AFRAME.INSPECTOR && AFRAME.INSPECTOR.history && AFRAME.INSPECTOR.history.updates[this.el.id]) {
                changes = AFRAME.INSPECTOR.history.updates[this.el.id][name];
            }

            const fakeMutation = { attributeName: name, target: this.el };
            const data = extractDataUpdates(fakeMutation, newData, changes);

            Object.assign(this.changedData, data);
            this.debouncePublish();
        }, 0);
    },
    tick(t, dt) {
        if (!this.data.enabled || !this.el.object3D) return;

        // ONLY track transform changes if this entity is selected in the Inspector!
        // This filters out background physics/animations while preserving the ability to edit them.
        const isSelected = AFRAME.INSPECTOR && AFRAME.INSPECTOR.opened && AFRAME.INSPECTOR.selectedEntity === this.el;
        if (!isSelected) {
            // Keep caching the latest transform so we don't trigger a jump when selected
            this.lastTransform.position.copy(this.el.object3D.position);
            this.lastTransform.rotation.copy(this.el.object3D.quaternion);
            this.lastTransform.scale.copy(this.el.object3D.scale);
            return;
        }

        let transformChanged = false;

        if (!this.lastTransform.position.equals(this.el.object3D.position)) {
            this.changedData.position = {
                x: this.el.object3D.position.x,
                y: this.el.object3D.position.y,
                z: this.el.object3D.position.z
            };
            this.lastTransform.position.copy(this.el.object3D.position);
            transformChanged = true;
        }
        if (!this.lastTransform.rotation.equals(this.el.object3D.quaternion)) {
            const { quaternion } = this.el.object3D;
            this.changedData.rotation = { x: quaternion._x, y: quaternion._y, z: quaternion._z, w: quaternion._w };
            this.lastTransform.rotation.copy(quaternion);
            transformChanged = true;
        }
        if (!this.lastTransform.scale.equals(this.el.object3D.scale)) {
            this.changedData.scale = {
                x: this.el.object3D.scale.x,
                y: this.el.object3D.scale.y,
                z: this.el.object3D.scale.z
            };
            this.lastTransform.scale.copy(this.el.object3D.scale);
            transformChanged = true;
        }

        if (transformChanged) {
            this.debouncePublish();
        }
    },
    update(oldData) {
        if (this.data.enabled && (Object.keys(oldData).length === 0 || !oldData.enabled)) {
            // console.debug(`build3d watching entity ${this.el.id} attributes...`);
            this.observer.observe(this.el, { attributeFilter: ['id'], attributeOldValue: true });
            this.el.addEventListener('componentchanged', this.onComponentChanged);
            if (this.el.object3D) {
                this.lastTransform.position.copy(this.el.object3D.position);
                this.lastTransform.rotation.copy(this.el.object3D.quaternion);
                this.lastTransform.scale.copy(this.el.object3D.scale);
            }
        } else if (!this.data.enabled && oldData.enabled) {
            this.observer.disconnect();
            this.el.removeEventListener('componentchanged', this.onComponentChanged);
            // console.debug(`build3d watching entity ${this.el.id} attributes stopped`);
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
                    userClient: ARENA.userClient,
                    object_id: msg.object_id,
                }),
                msg
            );
        }
    },
});
