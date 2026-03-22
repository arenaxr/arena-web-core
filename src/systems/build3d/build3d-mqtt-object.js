/**
 * @fileoverview Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

import { TOPICS } from '../../constants';

const OBJECT_TYPE_COMPONENTS = new Set([
    'arenaui-button-panel', 'arenaui-card', 'arenaui-prompt',
    'gaussian_splatting', 'gltf-model', 'image', 'light', 'line',
    'obj-model', 'ocean', 'pcd-model', 'text', 'thickline',
    'threejs-scene', 'urdf-model',
]);

function coerceVisible(value) {
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
    if (value === 'false' || value === false) return false;
    return true;
}

function LogToUser(msg, attributeName, changes) {
    const inspectorMqttLog = document.getElementById('inspectorMqttLog');
    if (inspectorMqttLog) {
        inspectorMqttLog.appendChild(document.createElement('br'));
        const line = document.createElement('span');
        line.innerHTML += `${msg.action}: ${msg.object_id} ${attributeName || ''} ${JSON.stringify(
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

        // Parse multi-property component strings, but guard against URLs containing colons
        if (typeof attribute === 'string' && attribute.includes(':') && !attribute.includes('//')) {
            attribute = AFRAME.utils.styleParser.parse(attribute);
        }

        if (OBJECT_TYPE_COMPONENTS.has(attr.name)) {
            data.object_type = attr.name;
        }

        switch (attr.name) {
            case 'id':
            case 'build3d-mqtt-object':
                // skip
                break;
            case 'visible':
                data.visible = coerceVisible(attribute);
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

    if (OBJECT_TYPE_COMPONENTS.has(mutation.attributeName)) {
        data.object_type = mutation.attributeName;
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
            // Fall back to getDOMAttribute if Inspector history didn't capture changes yet
            // eslint-disable-next-line no-case-declarations
            const geomData = changes || mutation.target.getDOMAttribute('geometry') || {};
            if (geomData) {
                data = { ...data, ...geomData };
                delete data.primitive;
            }
            if (attribute && mutation.target.nodeName.toLowerCase() === 'a-videosphere') {
                // sphere shouldn't overwrite videosphere
                data.object_type = 'videosphere';
            } else if (attribute && attribute.primitive === 'plane') {
                // plane shouldn't overwrite image
                data.object_type = mutation.target.hasAttribute('src') ? 'image' : attribute.primitive;
            } else if (attribute) {
                data.object_type = attribute.primitive;
            }
            break;
        case 'environment':
            data['env-presets'] = changes || {};
            break;
        case 'visible':
            data.visible = coerceVisible(changes);
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
            if (changes === null) data[mutation.attributeName] = null; // component was removed
            else if (changes === 'true' || changes === 'false') data[mutation.attributeName] = JSON.parse(changes);
            else data[mutation.attributeName] = changes || {};
            // Guard spe-particles fog crash: mirror create-update.js workaround
            if (mutation.attributeName.startsWith('spe-particles') && typeof data[mutation.attributeName] === 'object' && data[mutation.attributeName] !== null) {
                if (!Object.hasOwn(data[mutation.attributeName], 'affectedByFog')) {
                    data[mutation.attributeName].affectedByFog = false;
                }
            }
            break;
    }


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
        this.onComponentRemoved = this.onComponentRemoved.bind(this);
        this.objectAttributesUpdate = this.objectAttributesUpdate.bind(this);

        this.renameOldId = null;
        this.renameTimeout = null;
        this.hasBeenPublished = false; // Track whether a create was ever published for this entity

        // Track attribute changes including id renames and Inspector-driven component mutations
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
        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
        const pubTopic = topicBase.formatStr({ objectId: msg.object_id });
        console.debug('publishing:', pubTopic, JSON.stringify(msg));
        ARENA.Mqtt.publish(pubTopic, msg);
        this.hasBeenPublished = true;
    },
    objectAttributesUpdate(mutationList, observer) {
        mutationList.forEach((mutation) => {
            if (mutation.type !== 'attributes') return;
            const attrName = mutation.attributeName;

            // Skip transforms (handled by tick) and self-referencing component
            if (['position', 'rotation', 'scale', 'build3d-mqtt-object', 'class', 'attribution'].includes(attrName)) return;

            if (attrName === 'id') {
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

                        // Only send delete if this entity was previously published AND had a real ID
                        if (this.hasBeenPublished && originalOldId) {
                            const outMsg = {
                                object_id: originalOldId,
                                action: 'delete',
                                persist: true,
                            };
                            LogToUser(outMsg);
                            const pubTopic = topicBase.formatStr({ objectId: outMsg.object_id });
                            console.debug('publishing:', pubTopic, JSON.stringify(outMsg));
                            ARENA.Mqtt.publish(pubTopic, outMsg);
                        }

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
                        const pubTopic = topicBase.formatStr({ objectId: createMsg.object_id });
                        console.debug('publishing:', pubTopic, JSON.stringify(createMsg));
                        ARENA.Mqtt.publish(pubTopic, createMsg);
                        this.hasBeenPublished = true;

                        // Update children's parent reference to prevent orphaning
                        const children = this.el.querySelectorAll('[build3d-mqtt-object]');
                        children.forEach((child) => {
                            if (!child.id) return;
                            const childMsg = {
                                object_id: child.id,
                                action: 'update',
                                type: 'object',
                                persist: true,
                                data: { parent: finalNewId },
                            };
                            LogToUser(childMsg);
                            const pubTopic = topicBase.formatStr({ objectId: childMsg.object_id });
                            console.debug('publishing:', pubTopic, JSON.stringify(childMsg));
                            ARENA.Mqtt.publish(pubTopic, childMsg);
                        });
                    }, 750);
                }
            } else {
                // Non-id attribute mutation (geometry, material, etc.) from Inspector DOM writes
                setTimeout(() => {
                    // Check if this attribute was removed (component deletion)
                    if (!this.el.hasAttribute(attrName)) {
                        this.changedData[attrName] = null;
                        this.debouncePublish();
                        return;
                    }
                    const attribute = this.el.getAttribute(attrName);
                    const domAttr = this.el.getDOMAttribute(attrName);
                    const fakeMutation = { attributeName: attrName, target: this.el };
                    const data = extractDataUpdates(fakeMutation, attribute, domAttr);

                    Object.assign(this.changedData, data);
                    this.debouncePublish();
                }, 0);
            }
        });
    },
    onComponentChanged(evt) {
        if (!this.data.enabled || !this.el.id) return;
        const { name, newData } = evt.detail;
        if (['position', 'rotation', 'scale', 'build3d-mqtt-object', 'class', 'attribution'].includes(name)) return;

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
    onComponentRemoved(evt) {
        if (!this.data.enabled || !this.el.id) return;
        const { name } = evt.detail;
        if (name === 'build3d-mqtt-object') return;
        // Publish null to signal component deletion on the wire
        this.changedData[name] = null;
        this.debouncePublish();
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
            this.observer.observe(this.el, { attributes: true, attributeOldValue: true });
            this.el.addEventListener('componentchanged', this.onComponentChanged);
            this.el.addEventListener('componentremoved', this.onComponentRemoved);
            // Entities loaded from persistence have an ID when first enabled; new Inspector entities don't
            if (this.el.id) {
                this.hasBeenPublished = true;
            }
            if (this.el.object3D) {
                this.lastTransform.position.copy(this.el.object3D.position);
                this.lastTransform.rotation.copy(this.el.object3D.quaternion);
                this.lastTransform.scale.copy(this.el.object3D.scale);
            }
        } else if (!this.data.enabled && oldData.enabled) {
            this.observer.disconnect();
            this.el.removeEventListener('componentchanged', this.onComponentChanged);
            this.el.removeEventListener('componentremoved', this.onComponentRemoved);
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
            const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
            const pubTopic = topicBase.formatStr({ objectId: msg.object_id });
            console.debug('publishing:', pubTopic, JSON.stringify(msg));
            ARENA.Mqtt.publish(pubTopic, msg);
        }
    },
});
