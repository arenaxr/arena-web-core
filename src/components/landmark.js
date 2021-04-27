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
        randomRadius: {
            type: 'number',
            default: 0,
        }, // range in m
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
        }, // Set to 0 probably, since object position is often centered above ground plane
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
        if (this.data.randomRadius > 0) {
            dest.x = dest.x - this.data.randomRadius + (2 * Math.random() * this.data.randomRadius);
            dest.z = dest.z - this.data.randomRadius + (2 * Math.random() * this.data.randomRadius);
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
    getAll: function(startingPosition = false) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition);
        }
        return landmarks;
    },
    getRandom: function(startingPosition = false) {
        let landmarks = Object.values(this.landmarks);
        if (startingPosition) {
            landmarks = landmarks.filter((landmark) => landmark.data.startingPosition);
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
