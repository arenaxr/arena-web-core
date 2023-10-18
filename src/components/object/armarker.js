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
 * ARMarker Component. Supports ARMarkers in a scene
 * @module armarker
 * @property {string} [markertype=apriltag_36h11] - The marker type. One of 'apriltag_36h11', 'lightanchor', 'uwb'
 * @property {boolean} [dynamic=false] - Whether tag is a static and used to for camera relocalization, or dynamic and used for object tracking
 * @property {boolean} [publish=false] - Force publish of tag detections to realm/g/, even without networked solver mode
 * @property {boolean} [buildable=false] - Whether tag has "dynamic" toggled on click. Used to position a tag, then lock into position
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
            default: 'apriltag_36h11',
            oneOf: ['apriltag_36h11', 'lightanchor', 'uwb'],
        }, // markertype: apriltag_36h11, lightanchor, uwb
        dynamic: {
            default: false,
            type: 'boolean',
        },
        publish: {
            default: false,
            type: 'boolean',
        },
        buildable: {
            default: false,
            type: 'boolean',
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
    init() {
        this.update();
        this.system.registerComponent(this);
        if (this.data.buildable) {
            // Toggle clientside dynamic
            this.el.setAttribute('material', 'wireframe', this.data.dynamic);
            this.el.setAttribute('click-listener', true);
            this.el.addEventListener('mousedown', (evt) => {
                if (evt.detail.cursorEl && this.data.buildable) {
                    // Only track native click event
                    this.data.dynamic = !this.data.dynamic;
                    this.el.setAttribute('material', 'wireframe', this.data.dynamic);
                }
            });
        }
    },
    update() {
        // try to assign a marker id based on the object id: name_markerid
        if (this.data.markerid === '') {
            const regex = /(?<name>\w+)_(?<markerid>\w+)/g;
            const match = regex.exec(this.el.getAttribute('id'));
            this.data.markerid = match.groups.markerid;
        }
    },
    remove() {
        this.system.unregisterComponent(this);
    },
});
