
/* global AFRAME */

/**
 * @fileoverview Apriltag Component/System
 *
 * Query the system a list of all tags in a scene:
 *   let apriltags = document.querySelector("a-scene").systems["apriltag"].getAll();
 *   apriltags.forEach(tag => {
 *      let tagPose = tag.el.object3D.matrixWorld; // a 4x4 matrix: https://threejs.org/docs/#api/en/math/Matrix4 
 *      console.log(`tag id: ${tag.data.tagid}`, tagPose);
 *   });
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.registerSystem('apriltag', {
    schema: {},
    init: function() {
        this.tags = [];
    },
    registerComponent: function(tag) {
        this.tags.push(tag);
    },
    unregisterComponent: function(tag) {
        const index = this.tags.indexOf(tag);
        this.tags.splice(index, 1);
    },
    getAll: function() {
        return this.tags;
    },
});

AFRAME.registerComponent('apriltag', {
    schema: {
        tagid: {
            type: 'number',
            default: 0,
        }, // tagid: 0, 1, 2, 3,...
        size: {
            type: 'number',
            default: 150,
        }, // tag size in mm
        url: {
            type: 'string',
        }, // url associated with the tag
        lat: {
            type: 'number',
            default: 0,
        }, // apriltag latitude
        long: {
            type: 'number',
            default: 0,
        }, // apriltag longitude
        ele: {
            type: 'number',
            default: 0,
        }, // apriltag elevation
    },
    init: function() {
        this.system.registerComponent(this);
        this.update();
    },
    update: function() {
        regex = /(?<name>\w+)_(?<id>\w+)/g;
        const match = regex.exec(this.el.getAttribute('id'));
        this.data.tagid = match.groups.id;
    },
    remove: function() {
        this.system.unregisterComponent(this);
    },
});
