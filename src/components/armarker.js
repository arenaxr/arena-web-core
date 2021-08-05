/* eslint-disable max-len */

/* global AFRAME */

/**
 * @fileoverview Armarker Component/System. Support for ARMarkers in a scene
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * ARMarker System. Supports ARMarkers in a scene.
 * @module armarker-system
*/
AFRAME.registerSystem('armarker', {
    schema: {},
    init: function() {
        this.markers = {};
    },
    /**
     * Register an ARMarker component with the system
     * @param {object} marker - The marker component object to register.
     * @alias module:armarker-system
     */
    registerComponent: function(marker) {
        this.markers[marker.data.markerid] = marker;
    },
    /**
     * Unregister an ARMarker component
     * @param {object} marker - The marker component object to unregister.
     * @alias module:armarker-system
     */
    unregisterComponent: function(marker) {
        delete this.markers[marker.data.markerid];
    },
    /**
     * Get all markers registered with the system
     * @param {object} mtype - The marker type 'apriltag_36h11', 'lightanchor', 'uwb' to filter for; No argument or undefined will return all
     * @return {object} - a dictionary of markers
     * @alias module:armarker-system
     * @example <caption>Query the system a list of all markers in a scene</caption>
     *     let markers = document.querySelector("a-scene").systems["armarker"].getAll();
     *     Object.keys(markers).forEach(function(key) {
     *       console.log(`tag id: ${markers[key].data.markerid}`, markers[key].el.object3D.matrixWorld); //matrixWorld: https://threejs.org/docs/#api/en/math/Matrix4
     *     });
     * @example <caption>getAll() also accepts a marker type argument to filter by a given type</caption>
     *     let markers = document.querySelector("a-scene").systems["armarker"].getAll('apriltag_36h11');
     *
     */
    getAll: function(mtype=undefined) {
        if (mtype === undefined) return this.markers;
        const filtered = Object.assign({}, ...Object.entries(this.markers).filter(([k, v]) =>
            v.data.markertype === mtype).map(([k, v]) => ({[k]: v})));
        return filtered;
    },
    /**
     * Get a marker given is markerid
     * @param {object} markerid - The marker id to return
     * @return {object} - the marker with the markerid given
     * @alias module:armarker-system
     */
    get: function(markerid) {
        return this.markers[markerid];
    },
});

/**
 * ARMarker Component. Supports ARMarkers in a scene
 * @module armarker
 * @property {string} [markertype=apriltag_36h11] - The marker type. One of 'apriltag_36h11', 'lightanchor', 'uwb'
 * @property {boolean} [dynamic=false] - Whether tag is a static localizer, or dynamically changes position
 * @property {boolean} [buildable=false] - Allow tag to be reoriented by a scene author
 * @property {string} [markerid] - Marker id. Typically an integer (e.g. for AprilTag 36h11 family, an integer in the range [0, 586])
 * @property {number} [size=150] - Size of the marker (assumed to be a square), if applicable (mm).
 * @property {string} [url] - A URL associated with the marker.
 * @property {number} [lat=0] - Marker latitude.
 * @property {number} [long=0] - Marker longitude.
 * @property {number} [ele=0] - Marker elevation.
 *
 */
AFRAME.registerComponent('armarker', {
    schema: {
        markertype: {
            default: 'apriltag_36h11', oneOf: ['apriltag_36h11', 'lightanchor', 'uwb'],
        }, // markertype: apriltag_36h11, lightanchor, uwb
        dynamic: {
            default: false, type: 'boolean',
        },
        buildable: {
            default: false, type: 'boolean',
        },
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
            default: '',
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
        if (this.data.buildable) { // Toggle clientside dynamic
            this.el.setAttribute('click-listener', '');
            this.el.addEventListener('click', () => {
                this.data.dynamic = !this.data.dynamic;
                this.el.setAttribute('material', 'wireframe', this.data.dynamic);
            });
        }
    },
    update: function() {
        // try to assign a marker id based on the object id: name_markerid
        if (this.data.markerid === '') {
            const regex = /(?<name>\w+)_(?<markerid>\w+)/g;
            const match = regex.exec(this.el.getAttribute('id'));
            this.data.markerid = match.groups.markerid;
        }
    },
    remove: function() {
        this.system.unregisterComponent(this);
    },
});
