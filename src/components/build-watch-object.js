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
        this.observer = new MutationObserver(this.objectAttributesUpdate);
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    objectAttributesUpdate: function (mutationList, observer) {
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
                    if (mutation.attributeName === 'build-watch-object') {
                        return; // no need to handle on/off mutations to our own component
                    }
                    if (mutation.target.id) {
                        const attribute = mutation.target.getAttribute(mutation.attributeName);
                        // when 'id' changes, we have a new object, maybe a name change
                        let msg = {
                            object_id: mutation.target.id === 'env' ? 'scene-options' : mutation.target.id,
                            action: mutation.attributeName === 'id' ? 'create' : 'update',
                            type:  mutation.target.id === 'env' ? 'scene-options' : 'object',
                            persist: true,
                            data: {},
                        };
                        // use aframe-watcher updates to send only changes updated
                        let changes = undefined;
                        if (AFRAME.INSPECTOR.history.updates[mutation.target.id]) {
                            changes = AFRAME.INSPECTOR.history.updates[mutation.target.id][mutation.attributeName];
                        }
                        if (msg.action == 'update'){
                            msg.data = extractDataUpdates(mutation, attribute, changes);
                        } else if (msg.action == 'create') {
                            msg.data = extractDataFullDOM(mutation);
                        }
                        LogToUser(msg, mutation.attributeName, changes);
                        console.log('pub:', msg);
                        ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);

                        // check rename case
                        if (
                            mutation.attributeName === 'id' &&
                            mutation.oldValue &&
                            mutation.target.id != mutation.oldValue
                        ) {
                            let msg = {
                                object_id: mutation.oldValue,
                                action: 'delete',
                                persist: true,
                            };
                            LogToUser(msg);
                            console.log('pub:', msg);
                            ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);
                        }
                    }
                    break;
            }
        });
    },
    update: function () {
        if (this.data.enabled) {
            console.log('build3d watching scene attributes...');
            this.observer.observe(this.el, {
                attributes: true,
                attributeOldValue: true,
            });
        } else {
            this.observer.disconnect();
            console.log('build3d watching scene attributes ended');
        }
        // quick setting for user to edit in the build page
        if (this.data.openJsonEditor) {
            this.data.openJsonEditor = false; // restore
            this.update();
            window.open(`/build/?scene=${ARENA.namespacedScene}&objectId=${this.el.id}`, 'ArenaJsonEditor');
        }
    },
    remove: function () {
        const el = document.getElementById(this.el.id);
        // don't delete if only the component is removed, the node must be removed
        if (!el) {
            let msg = {
                object_id: this.el.id,
                action: 'delete',
                persist: true,
            };
            LogToUser(msg);
            console.log('pub:', msg);
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${msg.object_id}`, msg);
        }
    },
    tick: function () {

    },
});

const symbols = { create: 'CRE', update: 'UPD', delete: 'DEL' };

function extractDataUpdates(mutation, attribute, changes) {
    data = {}
    // TODO always try and get the object_type, complicated
    switch (mutation.attributeName) {
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
            data.object_type = mutation.attributeName;
            break;
    }
    switch (mutation.attributeName) {
        case 'id':
        case 'build-watch-object':
            // skip
            break;
        case 'position':
            data.position = attribute;
            break;
        case 'rotation':
            const quaternion = mutation.target.object3D.quaternion;
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
            data.object_type = attribute.primitive;
            break;
        case 'environment':
            data['env-presets'] = changes ? changes : {};
            break;
        default:
            data[mutation.attributeName] = changes ? changes : {};
            break;
    }
    return data;
}

function extractDataFullDOM(mutation) {
    data = {object_type: 'entity'};
    mutation.target.attributes.forEach((attr) => {
        const attribute = mutation.target.getAttribute(attr.name);
        switch (attr.name) {
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
                data.object_type = attr.name;
                break;
        }
        switch (attr.name) {
            case 'id':
            case 'build-watch-object':
                // skip
                break;
            case 'position':
                data.position = attribute;
                break;
            case 'rotation':
                const quaternion = mutation.target.object3D.quaternion;
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
                data.object_type = attribute.primitive;
                break;
            case 'environment':
                data['env-presets'] = attribute;
                break;
            default:
                data[attr.name] = attribute;
                break;
        }
    });
    return data;
}

function LogToUser(msg, attributeName, changes) {
    inspectorMqttLog = document.getElementById('inspectorMqttLog');
    if (inspectorMqttLog) {
        inspectorMqttLog.appendChild(document.createElement('br'));
        let line = document.createElement('span');
        line.innerHTML += `${symbols[msg.action]}: ${msg.object_id} ${
            attributeName ? attributeName : ''
        } ${JSON.stringify(changes ? changes : msg.data ? msg.data : '')}`;
        inspectorMqttLog.appendChild(line);
        line.scrollIntoView();
    }
}
