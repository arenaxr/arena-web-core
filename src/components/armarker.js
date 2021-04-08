
/* global AFRAME */

/**
 * @fileoverview Armarker Component/System
 *
 * Query the system a list of all markers in a scene:
 *     let markers = document.querySelector("a-scene").systems["armarker"].getAll();
 *     Object.keys(markers).forEach(function(key) {
 *       console.log(`tag id: ${markers[key].data.markerid}`, markers[key].el.object3D.matrixWorld); //matrixWorld: https://threejs.org/docs/#api/en/math/Matrix4
 *     });
 *
 * getAll() also accepts a marker type argument to filter by a given type:
 *     let markers = document.querySelector("a-scene").systems["armarker"].getAll('apriltag_36h11');
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.registerSystem('armarker', {
    schema: {},
    init: function() {
        this.markers = {};
    },
    registerComponent: function(marker) {
        this.markers[marker.data.markerid] = marker;
    },
    unregisterComponent: function(tag) {
        delete this.markers[tag.data.markerid];
    },
    getAll: function(mtype=undefined) {
        if (mtype==undefined) return this.markers;
        const filtered = Object.assign({}, ...Object.entries(this.markers).filter(([k, v]) =>
            v.data.markertype == mtype).map(([k, v]) => ({[k]: v})));
        return filtered;
    },
    get: function(markerid) {
        return this.markers[markerid];
    },
});

AFRAME.registerComponent('armarker', {
    schema: {
        markertype: {
            default: 'apriltag_36h11', oneOf: ['apriltag_36h11', 'lightanchor', 'uwb'],
        }, // markertype: apriltag_36h11, lightanchor, uwb
        markerid: {
            type: 'string',
            default: '',
        }, // markerid: 0, 1, 2, 3,...
        size: {
            type: 'number',
            default: 150,
        }, // size in mm
        url: {
            type: 'string',
            default: undefined,
        }, // url associated with the marker
        lat: {
            type: 'number',
            default: 0,
        }, // marker latitude
        long: {
            type: 'number',
            default: 0,
        }, // marker longitude
        ele: {
            type: 'number',
            default: 0,
        }, // marker elevation
    },
    init: function() {
        this.update();
        this.system.registerComponent(this);
    },
    update: function() {
        // try to assign a marker id based on the object id: name_markerid
        if (this.data.markerid == '') {
            regex = /(?<name>\w+)_(?<markerid>\w+)/g;
            const match = regex.exec(this.el.getAttribute('id'));
            this.data.markerid = match.groups.markerid;
        }
    },
    remove: function() {
        this.system.unregisterComponent(this);
    },
});
