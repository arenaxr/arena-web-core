/**
 * @fileoverview Landmark component system
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/* global AFRAME, ARENA, THREE */

/**
 * Component-System of teleport destination Landmarks
 * @module landmark
 * @property {number} [randomRadiusMin=1] - Min for a random range to teleport to. Max must > 0
 * @property {number} [randomRadiusMax=1] - Max for a random range to teleport to.
 * @property {THREE.Vector3} [offsetPosition={0,0,0}] - vector3 {x,y,z} to use as static teleport offset
 * @property {string} [constrainToNavMesh='false'] - Teleports here should snap to navmesh. Valid values:  'false', 'any', 'coplanar'
 * @property {boolean} [startingPosition=false] - True: use as a random scene load-in position
 * @property {boolean} [lookAtLandmark=true] - True: After teleporting, user should rotate @ landmark
 * @property {string} label='' - Display label for Landmarks UI menu
 */
AFRAME.registerComponent('landmark', {
    schema: {
        randomRadiusMax: {
            type: 'number',
            default: 1,
        }, // range in m
        randomRadiusMin: {
            type: 'number',
            default: 1,
        }, // range in m. Ignored if randomRadiusMax is not set
        offsetPosition: {
            type: 'vec3',
            default: {x: 0, y: 0, z: 0},
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
    init: function() {
        this.system.registerComponent(this);
    },
    remove: function() {
        this.system.unregisterComponent(this);
    },
    teleportTo: function(moveEl = undefined) {
        const myCam = document.getElementById('my-camera'); ;
        if (moveEl === undefined) moveEl = myCam;
        const dest = new THREE.Vector3;
        dest.copy(this.el.object3D.position).add(this.data.offsetPosition);
        if (this.data.randomRadiusMax > 0) {
            const randomNorm = this.data.randomRadiusMin + (Math.random() *
                (this.data.randomRadiusMax - this.data.randomRadiusMin));
            const randomAngle = (-2 * Math.PI) + (Math.random() * 4 * Math.PI);
            dest.x += Math.cos(randomAngle) * randomNorm;
            dest.z += Math.sin(randomAngle) * randomNorm;
        }
        const navSys = this.el.sceneEl.systems.nav;
        if (this.data.constrainToNavMesh !== 'false' && navSys.navMesh) {
            const checkPolygon = this.data.constrainToNavMesh === 'coplanar';
            const closestGroup = navSys.getGroup(dest, checkPolygon);
            const closestNode = navSys.getNode(dest, closestGroup, checkPolygon);
            if (closestNode) {
                navSys.clampStep(dest, dest, closestGroup, closestNode, dest);
            }
        }
        if (moveEl === myCam) {
            moveEl.object3D.position.copy(dest).y += ARENA.defaults.camHeight;
            if (this.data.lookAtLandmark) {
                moveEl.components['look-controls'].yawObject.rotation.y = Math.atan2(
                    moveEl.object3D.position.x - this.el.object3D.position.x,
                    moveEl.object3D.position.z - this.el.object3D.position.z,
                );
            } else {
                moveEl.components['look-controls'].yawObject.rotation.copy(
                    this.el.object3D.rotation);
            }
        }
    },
});

AFRAME.registerSystem('landmark', {
    init: function() {
        this.landmarks = {};
    },
    registerComponent: function(landmark) {
        this.landmarks[landmark.el.id] = landmark;
        if (landmark.data.startingPosition === false) {
            ARENA.chat.addLandmark(landmark);
        }
    },
    unregisterComponent: function(landmark) {
        delete this.landmarks[landmark.el.id];
        if (landmark.data.startingPosition === false) {
            ARENA.chat.removeLandmark(landmark);
        }
    },
    getAll: function(startingPosition = undefined) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition !== undefined) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition === startingPosition);
        }
        return landmarks;
    },
    getRandom: function(startingPosition = undefined) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition !== undefined) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition === startingPosition);
        }
        if (landmarks.length) {
            return landmarks[Math.floor(Math.random()*landmarks.length)];
        } else {
            return undefined;
        }
    },
    get: function(id) {
        return this.landmarks[id];
    },
});
