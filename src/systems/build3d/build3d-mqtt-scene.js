/**
 * @fileoverview Create an observer to listen for changes made locally in the A-Frame Inspector and publish them to MQTT.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENAAUTH */

import { ARENAUtils } from '../../utils.js';
import * as FileStore from '../../utils/filestore-upload.js';
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
Object.keys(FileStore.filestoreUploadSchema).forEach((props) => {
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
        LogToUser(newObj);
        const topicBase = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr(ARENA.topicParams);
        const pubTopic = topicBase.formatStr({ objectId: newObj.object_id });
        console.debug('publishing:', pubTopic, JSON.stringify(newObj));
        ARENA.Mqtt.publish(pubTopic, newObj);

        AFRAME.INSPECTOR.selectEntity(AFRAME.INSPECTOR.selectedEntity);
    }
}

async function handleComponentUploadAction(selectedEntity, componentName) {
    const objid = selectedEntity.id;
    let objtype = componentName;
    // merge only, leave as much of original wire format as possible, including object_type
    const srcs = FileStore.filestoreUploadSchema[componentName];
    if (srcs[0]) {
        if (srcs[0].startsWith(`${componentName}.`)) {
            // sub-component, test for geometry, if needed
            if ('geometry' in selectedEntity.components) {
                objtype = selectedEntity.components.geometry.primitive;
            }
        }
    }
    const newObj = await FileStore.uploadFileStoreDialog(
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
                                if (!node.id) {
                                    let promptId = prompt('Provide a unique ID for this new object (e.g., my-entity):');
                                    if (promptId) {
                                        node.id = promptId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                                    }
                                }
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
        // Auto-expand sceneRoot once on load
        if (!this.sceneRootExpanded) {
            const sceneRootNameEl = Array.from(document.querySelectorAll('.outliner .entity .entityName')).find(
                (el) => el.textContent.trim() === 'sceneRoot'
            );
            if (sceneRootNameEl) {
                const entityRow = sceneRootNameEl.closest('.entity');
                if (entityRow) {
                    const collapseSpan = entityRow.querySelector('.collapsespace');
                    if (collapseSpan && collapseSpan.querySelector('.fa-caret-right')) {
                        // The programmatic click will bubble up and accidentally select sceneRoot.
                        // We must cache the current selection and URL target to restore it immediately.
                        let targetEntity = AFRAME.INSPECTOR ? AFRAME.INSPECTOR.selectedEntity : null;
                        const urlParams = new URLSearchParams(window.location.search);
                        const objectId = urlParams.get('objectId');
                        if (objectId) {
                            const urlEntity = document.getElementById(objectId);
                            if (urlEntity) targetEntity = urlEntity;
                        }

                        collapseSpan.click();

                        // Restore the actual targeted selection
                        if (targetEntity && targetEntity.id !== 'sceneRoot' && AFRAME.INSPECTOR) {
                            AFRAME.INSPECTOR.selectEntity(targetEntity);
                        }

                        this.sceneRootExpanded = true;
                    } else if (collapseSpan && collapseSpan.querySelector('.fa-caret-down')) {
                        this.sceneRootExpanded = true; // Already expanded
                    }
                }
            }
        }

        // Auto-select objectId entity once sceneRoot is expanded.
        // Deferred via setTimeout so the Inspector's async scene graph UI
        // settles after the expand click before we override the selection.
        if (this.sceneRootExpanded && !this.objectIdSelected) {
            const urlParams = new URLSearchParams(window.location.search);
            const objectId = urlParams.get('objectId');
            if (objectId) {
                const targetEntity = document.getElementById(objectId);
                if (targetEntity && AFRAME.INSPECTOR) {
                    setTimeout(() => {
                        AFRAME.INSPECTOR.selectEntity(targetEntity);
                    }, 500);
                    this.objectIdSelected = true;
                }
            } else {
                this.objectIdSelected = true; // No objectId param, nothing to do
            }
        }

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
        } else if (!document.body.contains(this.components)) {
            // inspector rebuilt the components panel; reset so we re-bind the observer
            this.components = null;
        }

        if (!this.env) {
            this.env = document.getElementById('env');
            if (this.env) {
                this.env.setAttribute('build3d-mqtt-object', 'enabled', true);
            }
        }

        // Apply UI lockout if selected entity is stateless
        // We run this in tick() to automatically detect ID updates and un-lock the panel securely.
        if (AFRAME.INSPECTOR) {
            const { selectedEntity } = AFRAME.INSPECTOR;
            if (selectedEntity) {
                let warningBox = document.getElementById('build3d-id-warning');
                const allComponentDivs = document.querySelectorAll('.components > div, .components > span');

                if (!selectedEntity.id && selectedEntity.hasAttribute('build3d-mqtt-object')) {
                    // Lockout: Hide component additions and specific components
                    allComponentDivs.forEach((c) => {
                        if (c.id !== 'componentEntityHeader' && c.id !== 'build3d-id-warning') {
                            c.style.display = 'none';
                        }
                    });

                    // Create warning box if it doesn't exist
                    if (!warningBox) {
                        warningBox = document.createElement('div');
                        warningBox.id = 'build3d-id-warning';
                        warningBox.style.padding = '15px';
                        warningBox.style.margin = '15px';
                        warningBox.style.backgroundColor = '#333';
                        warningBox.style.border = '1px solid #ffeb3b';
                        warningBox.style.borderRadius = '4px';
                        warningBox.style.color = '#ffeb3b';
                        warningBox.style.textAlign = 'center';
                        warningBox.innerHTML =
                            '<strong>⚠️ ID Required</strong><br/><br/>This object does not have an ID yet. A unique ID is required for ARENA MQTT state synchronization.<br/><br/>☝️ Please enter an ID in the box above to unlock component properties.';

                        const commonComps = document.getElementById('componentEntityHeader');
                        if (commonComps) {
                            commonComps.after(warningBox);
                        } else {
                            const componentsContainer = document.querySelector('.components');
                            if (componentsContainer) componentsContainer.prepend(warningBox);
                        }
                    }
                    warningBox.style.display = 'block';
                } else {
                    // Unlock: Restore normal visibility
                    allComponentDivs.forEach((c) => {
                        if (c.id !== 'build3d-id-warning') {
                            c.style.display = '';
                        }
                    });
                    if (warningBox) warningBox.style.display = 'none';
                }
            }
        }
    },
});
