/**
 * @fileoverview Landmark component system
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2021
 */

/* global AFRAME, THREE */

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
        baseHeight: {
            type: 'number',
            default: undefined,
        }, // Set optionally, since object position is often centered above ground plane
        lookAtLandmark: {
            type: 'boolean',
            default: false,
        },
    },
    init: function() {
        this.system.registerComponent(this);
    },
    remove: function() {
        this.system.unregisterComponent(this);
    },
    moveElTo: function(moveEl) {
        const dest = new THREE.Vector3;
        dest.copy(this.el.object3D.position);
        dest.y = isNaN(this.data.baseHeight) ? dest.y : this.data.baseHeight;
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
        moveEl.object3D.position.copy(dest).y += ARENA.defaults.camHeight;
        const myCamera = document.getElementById('my-camera');
        if (this.data.lookAtLandmark) {
            myCamera.components['look-controls'].yawObject.rotation.y = Math.atan2(
                myCamera.object3D.position.x - this.el.object3D.position.x,
                myCamera.object3D.position.z - this.el.object3D.position.z,
            );
        } else {
            myCamera.components['look-controls'].yawObject.rotation.copy(this.el.object3D.rotation);
        }
    },
});

AFRAME.registerSystem('landmark', {
    init: function() {
        this.landmarks = {};
    },
    registerComponent: function(landmark) {
        this.landmarks[landmark.el.id] = landmark;
    },
    unregisterComponent: function(landmark) {
        delete this.landmarks[landmark.el.id];
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
