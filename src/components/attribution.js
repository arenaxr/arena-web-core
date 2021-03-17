
/* global AFRAME */

/**
 * @fileoverview Attribution Component/System. Add attribution message to any entity.
 *
 * Tries to extract author, license, source and title assuming sketchfab format:
 *    author: "AuthorName (https://link-to-author)"
 *    license: "CC-BY-4.0 (http://link-to-license)"
 *    source: "https://link-to-model-website"
 *    title: "Model Title"
 *
 * Looks for the above metadata in both asset.extras (sketchfab models) and scene.extra.
 * If both asset.extras and scene.extra exist, gives preference to asset.extras.
 *
 * Query the system for an HTML table of credits:
 *    document.querySelector("a-scene").systems["attribution"].getAttributionTable();
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

AFRAME.registerSystem('attribution', {
    schema: {},
    init: function() {
        this.entities = [];
    },
    registerComponent: function(el) {
        this.entities.push(el);
        if (el.getAttribute('attribution').extractAssetExtras == false) return;
        const _this = this; // save reference to system
        // if element has a gltf-model component try to extract attribution from gltf asset extras
        el.addEventListener('loaded', function() {
            if (el.components.hasOwnProperty('agltf-model')) {
                el.addEventListener('model-loaded', function() {
                    const gltfComponent = el.components['agltf-model'];
                    _this.extractAttributionFromGtlfAsset(el, gltfComponent);
                });
            }
        });
    },
    unregisterComponent: function(el) {
        const index = this.entities.indexOf(el);
        this.entities.splice(index, 1);
    },
    getAttributionTable: function() {
        if (this.entities.length == 0) return undefined;
        let table='<table>';
        for (i = 0; i < this.entities.length; i++) {
            const attr = this.entities[i].getAttribute('attribution');
            const title = (attr.sourceURL.length > 0) ? `<a href=${attr.sourceURL} target='_blank'>${attr.title}</a>` : `${attr.title}`;
            const author = (attr.authorURL.length > 0) ? `<a href=${attr.authorURL} target='_blank'>${attr.author}</a>` : `${attr.author}`;
            const license = (attr.licenseURL.length > 0) ? `<a href=${attr.licenseURL} target='_blank'>${attr.license}</a>` : `${attr.license}`;
            table += `<tr><td align='left'><small>${title} (id:${attr.id}) by ${author}, ${license}.</small></td></tr>`;
        }
        table+='</table>';
        return table;
    },
    extractAttributionFromGtlfAsset: function(el, gltfComponent) {
        /* try to extract author, license, source and title assuming sketchfab format:
            author: "AuthorName (https://link-to-author)"
            license: "CC-BY-4.0 (http://link-to-license)"
            source: "https://link-to-model-website"
            title: "Model Title"
        */
        // check gltf's asset.extras (sketchfab) and scene.userData (blender)
        let attr1 = {}; let attr2 = {};
        if (gltfComponent.model.hasOwnProperty('asset')) {
            if (gltfComponent.model.asset.hasOwnProperty('extras')) {
                attr1 = this.parseExtrasAttributes(gltfComponent.model.asset.extras);
            }
        }
        if (gltfComponent.model.hasOwnProperty('userData')) {
            attr2 = this.parseExtrasAttributes(gltfComponent.model.userData);
        }
        Object.assign(attr2, attr1); // merge data from asset.extras and scene.userData;  asset.extras is preferred
        el.setAttribute('attribution', attr2);
    },
    parseExtrasAttributes: function(extras) {
        const attrObj = {};
        this.parseAttribute(extras, attrObj, 'author');
        this.parseAttribute(extras, attrObj, 'license');
        this.parseAttribute(extras, attrObj, 'source');
        this.parseAttribute(extras, attrObj, 'title');
        return attrObj;
    },
    parseAttribute: function(extras, attribution, attribute) {
        if (!extras.hasOwnProperty(attribute)) return false;
        const r = new RegExp(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g); // fairly permissive url regex
        const match = r.exec(extras[attribute]); // extract url
        const url = (match) ? match[0] : undefined;
        const value = extras[attribute].replace(url, '').replace('(', '').replace(')', '').trim(); // remove url, parenthesis and extra spaces
        attribution[attribute] = value;
        attribution[`${attribute}URL`] = url;
        return true;
    },
});

AFRAME.registerComponent('attribution', {
    schema: {
        author: {
            type: 'string',
            default: 'Unknow Author',
        }, // e.g. Vaptor-Studio
        authorURL: {
            type: 'string',
            default: '',
        }, // e.g. https://sketchfab.com/VapTor
        license: {
            type: 'string',
            default: 'Unkown License',
        }, // e.g. CC-BY-4.0
        licenseURL: {
            type: 'string',
            default: '',
        }, // e.g. http://creativecommons.org/licenses/by/4.0/
        source: {
            type: 'string',
            default: 'Unknown',
        }, // e.g. Sketchfab
        sourceURL: {
            type: 'string',
            default: '',
        }, // e.g. https://sketchfab.com/models/2135501583704537907645bf723685e7
        title: {
            type: 'string',
            default: 'No Title',
        }, // e.g. Spinosaurus
        id: {
            type: 'string',
            default: '',
        }, // the object id in the scene; filled in on init
        extractAssetExtras: {
            type: 'boolean',
            default: true,
        }, // extract attribution info from asset extras; will override attribution info given
    },
    init: function() {
        this.data.id = this.el.getAttribute('id');
        this.system.registerComponent(this.el);
    },
    update: function() {},
    remove: function() {
        this.system.unregisterComponent(this.el);
    },
});
