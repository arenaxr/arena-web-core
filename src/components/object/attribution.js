/* eslint-disable max-len */

/**
 * @fileoverview Attribution Component. Add attribution message to any entity.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Attribution Component. Saves attribution data in any entity. The following properties can be saved.
 * <!-- markdown-link-check-disable-next-line -->
 * If `extractAssetExtras=true` (default), the [attribution system]{@link https://help.sketchfab.com/hc/en-us/articles/202512396-Model-Properties} attempts to extract data automatically from the model (requires models with authorship metadata; e.g. models downloaded from sketchfab have these data)
 * @module attribution
 * @property {string} [author=Unknown] - Author name; e.g. "Vaptor-Studio"
 * @property {string} [authorURL] - Author homepage/profile; e.g. https://sketchfab.com/VapTor
 * @property {string} [license=Unknown] - License summary/short name; e.g. "CC-BY-4.0".
 * @property {string} [licenseURL] - License URL; e.g. http://creativecommons.org/licenses/by/4.0/
 * @property {string} [source=Unknown] - Model source e.g. "Sketchfab".
 * @property {string} [sourceURL] - Model source URL; e.g. https://sketchfab.com/models/2135501583704537907645bf723685e7
 * @property {string} [title=No Title] - Model title; e.g. "Spinosaurus".
 * @property {string} id - The entity id in the scene; automatically filled in on component init
 * @property {boolean} [extractAssetExtras=true] - Extract attribution info from asset extras; will override attribution info given (default: true)
 *
 */
AFRAME.registerComponent('attribution', {
    schema: {
        author: {
            type: 'string',
            default: 'Unknown Author',
        },
        authorURL: {
            type: 'string',
            default: '',
        },
        license: {
            type: 'string',
            default: 'Unknown License',
        },
        licenseURL: {
            type: 'string',
            default: '',
        },
        source: {
            type: 'string',
            default: 'Unknown',
        },
        sourceURL: {
            type: 'string',
            default: '',
        },
        title: {
            type: 'string',
            default: 'No Title',
        },
        id: {
            type: 'string',
            default: '',
        },
        extractAssetExtras: {
            type: 'boolean',
            default: true,
        },
    },
    init() {
        this.data.id = this.el.getAttribute('id');
        this.system.registerComponent(this.el);
    },
    update() {},
    remove() {
        this.system.unregisterComponent(this.el);
    },
});
