/**
 * @fileoverview Landmark component system
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/* global AFRAME, ARENA, THREE */

import { ARENA_EVENTS } from '../../constants';

/**
 * Component-System of teleport destination Landmarks
 * @module landmark
 * @property {number} [randomRadiusMin=0] - Min for a random range to teleport to. Max must > 0
 * @property {number} [randomRadiusMax=0] - Max for a random range to teleport to.
 * @property {THREE.Vector3} [offsetPosition={0,1.6,0}] - vector3 {x,y,z} to use as static teleport offset
 * @property {string} [constrainToNavMesh='false'] - Teleports here should snap to navmesh. ['false', 'any', 'coplanar']
 * @property {boolean} [startingPosition=false] - True: use as a random scene load-in position
 * @property {boolean} [lookAtLandmark=true] - True: After teleporting, user should rotate @ landmark
 * @property {string} label='' - Display label for Landmarks UI menu
 */
AFRAME.registerComponent('landmark', {
    schema: {
        randomRadiusMax: {
            type: 'number',
            default: 0,
        }, // range in m
        randomRadiusMin: {
            type: 'number',
            default: 0,
        }, // range in m. Ignored if randomRadiusMax is not set
        offsetPosition: {
            type: 'vec3',
            default: { x: 0, y: 0, z: 0 },
        },
        constrainToNavMesh: {
            oneOf: ['false', 'any', 'coplanar'],
            default: 'false',
        }, // Whether to snap to nearest navmesh, and whether to restrict coplanar mesh
        startingPosition: {
            type: 'boolean',
            default: false,
        }, // Whether to use this as a random starting point in the scene
        label: {
            type: 'string',
            default: '',
        },
        lookAtLandmark: {
            type: 'boolean',
            default: true,
        },
    },

    init() {
        this.system.registerComponent(this);
    },

    remove() {
        this.system.unregisterComponent(this);
    },
    /* eslint-disable no-param-reassign */
    teleportTo(moveEl = undefined) {
        const myCam = document.getElementById('my-camera');
        if (moveEl === undefined) moveEl = myCam;
        const dest = new THREE.Vector3();
        const thisWorldPos = new THREE.Vector3();
        this.el.object3D.updateMatrixWorld(true); // Force update for initial loads
        thisWorldPos.setFromMatrixPosition(this.el.object3D.matrixWorld);
        dest.copy(thisWorldPos).add(this.data.offsetPosition);
        if (this.data.randomRadiusMax > 0) {
            const randomNorm =
                this.data.randomRadiusMin + Math.random() * (this.data.randomRadiusMax - this.data.randomRadiusMin);
            const randomAngle = -2 * Math.PI + Math.random() * 4 * Math.PI;
            dest.x += Math.cos(randomAngle) * randomNorm;
            dest.z += Math.sin(randomAngle) * randomNorm;
        }
        const navSys = this.el.sceneEl.systems.nav;
        let closestNode;
        if (this.data.constrainToNavMesh !== 'false' && navSys.navMesh) {
            const checkPolygon = this.data.constrainToNavMesh === 'coplanar';
            const closestGroup = navSys.getGroup(dest, checkPolygon);
            closestNode = navSys.getNode(dest, closestGroup, checkPolygon);
            if (closestNode) {
                navSys.clampStep(dest, dest, closestGroup, closestNode, dest);
            }
        }
        if (moveEl === myCam) {
            moveEl.object3D.position.copy(dest).y += ARENA.defaults.camHeight;
            if (this.data.lookAtLandmark) {
                moveEl.components['look-controls'].yawObject.rotation.y = Math.atan2(
                    moveEl.object3D.position.x - thisWorldPos.x,
                    moveEl.object3D.position.z - thisWorldPos.z
                );
            } else {
                moveEl.components['look-controls'].yawObject.rotation.copy(this.el.object3D.rotation);
            }
            if (closestNode) {
                moveEl.components['wasd-controls'].resetNav();
                moveEl.components['press-and-move'].resetNav();
            }
        }
    },
    /* eslint-disable no-param-reassign */
});

AFRAME.registerSystem('landmark', {
    init() {
        this.landmarks = {};
        this.expectedStarts = 0;
        this.registeredStarts = 0;
    },

    registerComponent(landmark) {
        const {
            el: { sceneEl },
        } = this;

        const chat = sceneEl.systems['arena-chat-ui'];
        this.landmarks[landmark.el.id] = landmark;
        if (landmark.data.startingPosition === true) {
            this.registeredStarts++;
            if (this.registeredStarts === this.expectedStarts) {
                ARENA.events.emit(ARENA_EVENTS.STARTPOS_LOADED);
            }
        }
        if (chat && landmark.data.startingPosition === false) {
            chat.addLandmark(landmark);
        }
    },

    unregisterComponent(landmark) {
        const {
            el: { sceneEl },
        } = this;

        const chat = sceneEl.systems['arena-chat-ui'];
        delete this.landmarks[landmark.el.id];
        // TODO: fix loading order of chat and landmarks
        if (chat && landmark.data.startingPosition === false) {
            chat.removeLandmark(landmark);
        }
    },

    getAll(startingPosition = undefined) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition !== undefined) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition === startingPosition);
        }
        return landmarks;
    },

    getRandom(startingPosition = undefined) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition !== undefined) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition === startingPosition);
        }
        if (landmarks.length) {
            return landmarks[Math.floor(Math.random() * landmarks.length)];
        }
        return undefined;
    },

    get(id) {
        return this.landmarks[id];
    },
});

// Teleport to landmark on click/etc
AFRAME.registerComponent('goto-landmark', {
    schema: {
        on: { type: 'string', default: '' }, // event to listen 'on'
        landmark: { type: 'string', default: '' }, // id of landmark to teleport to
    },

    eventHandlerFn(evt) {
        if (evt.detail.clicker) {
            // this is synthetic click event from network, not from our own user
            return;
        }
        const targetEl = document.getElementById(this.data.landmark);
        if (targetEl?.components?.landmark) {
            targetEl.components.landmark.teleportTo();
        }
    },

    init() {
        this.eventHandlerFn = this.eventHandlerFn.bind(this);
    },

    update(oldData) {
        if (oldData.on) {
            this.el.removeEventListener(oldData.on, this.eventHandlerFn);
        }
        if (this.data.on) {
            this.el.addEventListener(this.data.on, this.eventHandlerFn);
        }
    },

    remove() {
        // handle component removal
        if (this.data.on) {
            this.el.removeEventListener(this.data.on, this.eventHandlerFn);
        }
    },
});
