/**
 * @fileoverview Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENAAUTH */

import { TOPICS } from '../../constants';

/**
 * Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 * @module build3d-mqtt-scene
 */

// register component actions
const B3DACTIONS = {
    JSON_EDIT: 'edit-json',
    FS_UPLOAD: 'upload-to-filestore',
};
const arenaComponentActions = {
    'build3d-mqtt-object': { action: B3DACTIONS.JSON_EDIT, label: 'Edit Json', icon: 'fa-code' },
};
Object.keys(ARENAAUTH.filestoreUploadSchema).forEach((props) => {
    arenaComponentActions[props] = {
        action: B3DACTIONS.FS_UPLOAD,
        label: 'Upload to Filestore',
        icon: 'fa-upload',
    };
});

function updateMqttWidth() {
    const inspectorMqttLogWrap = document.getElementById('inspectorMqttLogWrap');
    const entire = window.innerWidth;
    const left = document.getElementById('scenegraph').clientWidth;
    const right = document.getElementById('rightPanel').clientWidth;
    const correct = entire - left - right;
    inspectorMqttLogWrap.style.width = `${correct}px`;
}

function publishUploadedFile(newObj) {
    if (newObj) {
        console.debug('publishing:', newObj.action, JSON.stringify(newObj));
        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
        ARENA.Mqtt.publish(
            topicBase.formatStr({
                objectId: newObj.object_id,
            }),
            newObj
        );

        AFRAME.INSPECTOR.selectEntity(AFRAME.INSPECTOR.selectedEntity);
    }
}

async function handleComponentUploadAction(selectedEntity, componentName) {
    const objid = selectedEntity.id;
    let objtype = componentName;
    // merge only, leave as much of original wire format as possible, including object_type
    const srcs = ARENAAUTH.filestoreUploadSchema[componentName];
    if (srcs[0]) {
        if (srcs[0].startsWith(`${componentName}.`)) {
            // sub-component, test for geometry, if needed
            if ('geometry' in selectedEntity.components) {
                objtype = selectedEntity.components.geometry.primitive;
            }
        }
    }
    const newObj = await ARENAAUTH.uploadFileStoreDialog(
        ARENA.nameSpace,
        ARENA.sceneName,
        objid,
        objtype,
        publishUploadedFile
    );
}

function addComponentAction(componentName, dataAction, title, iconName) {
    const thetitle = document.querySelector(`.component .componentHeader .componentTitle[title="${componentName}"]`);
    if (!thetitle) return;
    const actionsContainer = thetitle.parentElement.querySelector('.componentHeaderActions');
    if (!actionsContainer) return;
    const thebutton = actionsContainer.querySelector(`[data-action="${dataAction}"]`);

    // does the graph have a new component?
    // insert the upload link and and action listener
    if (!thebutton) {
        const buttonId = `${componentName}-${dataAction}`;
        const actionButton = document.createElement('a');
        actionButton.id = buttonId;
        actionButton.title = title;
        actionButton.classList.add('button', 'fa', iconName);
        actionButton.dataset.action = dataAction;
        actionButton.dataset.component = componentName;
        actionButton.addEventListener(
            'click',
            async (e) => {
                const { selectedEntity } = AFRAME.INSPECTOR;
                switch (dataAction) {
                    case B3DACTIONS.JSON_EDIT:
                        window.open(
                            `/build/?scene=${ARENA.namespacedScene}&objectId=${selectedEntity.id}`,
                            'ArenaJsonEditor'
                        );
                        break;
                    case B3DACTIONS.FS_UPLOAD: {
                        await handleComponentUploadAction(selectedEntity, componentName);
                        break;
                    }
                    default:
                        console.error(`Build3d data-action '${dataAction}' unsupported!`);
                        break;
                }
            },
            false
        );
        actionsContainer.prepend(actionButton);
    }
}

AFRAME.registerComponent('build3d-mqtt-scene', {
    // create an observer to listen for changes made locally in the a-frame inspector and publish them to mqtt.
    schema: {
        sceneOptionsObject: {
            type: 'string',
            default: 'scene-options',
        },
    },
    multiple: false,
    init() {
        const observer = new MutationObserver(this.sceneNodesUpdate);
        // console.debug('build3d watching scene children...');
        observer.observe(this.el, {
            childList: true,
            subtree: true,
        });

        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },
    sceneNodesUpdate(mutationList, observer) {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    if (mutation.addedNodes.length > 0) {
                        // console.debug(`${mutation.addedNodes.length} child nodes have been added.`, mutation.addedNodes);
                        mutation.addedNodes.forEach((node) => {
                            // console.debug('add node:', node.nodeName, node.components);
                            // new blank entities are added by the user in the inspector
                            if (
                                node.nodeName.toLowerCase() === 'a-entity' &&
                                Object.keys(node.components).length === 0
                            ) {
                                // console.debug('add build3d-mqtt-object:');
                                node.setAttribute('build3d-mqtt-object', 'enabled', true);
                            }
                        });
                    }
                    if (mutation.removedNodes.length > 0) {
                        // Removed nodes are handled by each entity's build3d-mqtt-object remove() lifecycle
                    }
                    break;
                default:
                // skip
            }
        });
    },
    tick() {
        if (!this.scenegraphDiv) {
            this.scenegraphDiv = document.getElementById('viewportBar');
            if (this.scenegraphDiv) {
                // container
                const inspectorMqttLogWrap = document.createElement('div');
                inspectorMqttLogWrap.id = 'inspectorMqttLogWrap';
                inspectorMqttLogWrap.tabIndex = 2;
                inspectorMqttLogWrap.style.width = '-webkit-fill-available';
                inspectorMqttLogWrap.style.bottom = '0';
                inspectorMqttLogWrap.style.position = 'fixed';
                inspectorMqttLogWrap.style.height = '25%';
                inspectorMqttLogWrap.style.display = 'flex';
                inspectorMqttLogWrap.style.flexDirection = 'column';
                this.scenegraphDiv.appendChild(inspectorMqttLogWrap);
                // update width as needed
                const rightPanel = document.getElementById('rightPanel');
                const resizeObserver = new ResizeObserver((entries) => {
                    updateMqttWidth();
                });
                resizeObserver.observe(rightPanel);
                window.onresize = updateMqttWidth;

                // title
                const inspectorMqttTitle = document.createElement('div');
                inspectorMqttTitle.id = 'inspectorMqttTitle';
                inspectorMqttTitle.style.backgroundColor = 'darkgreen';
                inspectorMqttTitle.style.color = 'white';
                inspectorMqttTitle.style.opacity = '.75';
                inspectorMqttTitle.style.width = '100%';
                inspectorMqttTitle.style.padding = '2px 10px';
                inspectorMqttTitle.style.cursor = 'pointer';
                inspectorMqttTitle.style.display = 'flex';
                inspectorMqttTitle.style.justifyContent = 'space-between';
                inspectorMqttTitle.style.alignItems = 'center';
                
                const titleText = document.createElement('span');
                titleText.textContent = `ARENA's Build3D MQTT Publish Log (user: ${ARENAAUTH.user_username})`;
                inspectorMqttTitle.appendChild(titleText);
                
                const chevron = document.createElement('i');
                chevron.className = 'fa fa-chevron-down';
                inspectorMqttTitle.appendChild(chevron);
                
                inspectorMqttLogWrap.appendChild(inspectorMqttTitle);

                // log
                const inspectorMqttLog = document.createElement('div');
                inspectorMqttLog.id = 'inspectorMqttLog';
                inspectorMqttLog.style.overflowY = 'auto';
                inspectorMqttLog.style.width = '100%';
                inspectorMqttLog.style.height = '100%';
                inspectorMqttLog.style.backgroundColor = '#242424';
                inspectorMqttLog.style.color = '#c3c3c3';
                inspectorMqttLog.style.opacity = '.75';
                inspectorMqttLog.style.paddingLeft = '10px';
                inspectorMqttLog.style.fontFamily = 'monospace,monospace';
                inspectorMqttLog.style.fontSize = '10px';
                inspectorMqttLogWrap.appendChild(inspectorMqttLog);

                inspectorMqttTitle.onclick = () => {
                    if (inspectorMqttLog.style.display === 'none') {
                        inspectorMqttLog.style.display = 'block';
                        chevron.className = 'fa fa-chevron-down';
                        inspectorMqttLogWrap.style.height = '25%';
                    } else {
                        inspectorMqttLog.style.display = 'none';
                        chevron.className = 'fa fa-chevron-up';
                        inspectorMqttLogWrap.style.height = 'auto';
                    }
                };

                const line = document.createElement('span');
                line.innerHTML += `Watching for local changes...`;
                inspectorMqttLog.appendChild(document.createElement('br'));
                inspectorMqttLog.appendChild(line);
            }
        }
        if (!this.components) {
            if (document.getElementsByClassName('components').length > 0) {
                // eslint-disable-next-line prefer-destructuring
                this.components = document.getElementsByClassName('components')[0];
                if (this.components) {
                    // handle selected entity
                    const observer = new MutationObserver((mutationList) => {
                        mutationList.forEach((mutation) => {
                            // handle class change

                            // query active components
                            Object.keys(arenaComponentActions).forEach((key) => {
                                addComponentAction(
                                    key,
                                    arenaComponentActions[key].action,
                                    arenaComponentActions[key].label,
                                    arenaComponentActions[key].icon
                                );
                            });
                        });
                    });
                    const options = {
                        attributeFilter: ['class'],
                        childList: true,
                        subtree: true,
                    };
                    observer.observe(this.components, options);
                }
            }
        }
        if (!this.env) {
            this.env = document.getElementById('env');
            if (this.env) {
                this.env.setAttribute('build3d-mqtt-object', 'enabled', true);
            }
        }
    },
});
