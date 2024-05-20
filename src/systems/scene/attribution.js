/**
 * Attribution Component/System. Add attribution message to any entity.
 * Tries to extract author, license, source and title (assuming format used in sketchfab downloaded models)
 *
 * Looks for authorship metadata in both asset.extras (sketchfab models) and scene.extra (manually added attributes in blender).
 * If both asset.extras and scene.extra exist, gives preference to asset.extras.
 *
 * @example <caption>Sketchfab downloaded model attributes - asset.extra</caption>
 *    author: "AuthorName (url-link-to-author)"
 *    license: "CC-BY-4.0 (url-link-to-license)"
 *    source: "url-link-to-model-website"
 *    title: "Model Title"
 * @module attribution-system
 */

/* global AFRAME */

AFRAME.registerSystem('attribution', {
    schema: {},
    init() {
        this.entities = [];
    },
    /**
     * Register an attribution component with the system
     * @param {object} el - The attribution a-frame element to register.
     * @alias module:attribution-system
     */
    registerComponent(el) {
        this.entities.push(el);
        if (el.getAttribute('attribution').extractAssetExtras === false) return;
        // if element has a gltf-model component try to extract attribution from gltf asset extras
        el.addEventListener('loaded', () => {
            if (Object.hasOwn(el.components, 'gltf-model')) {
                el.addEventListener('model-loaded', () => {
                    const gltfComponent = el.components['gltf-model'];
                    this.extractAttributionFromGltfAsset(el, gltfComponent);
                });
            }
            // TODO: check FBX/OBJ
        });
    },
    /**
     * Unregister an attribution component
     * @param {object} el - The attribution a-frame element.
     * @alias module:attribution-system
     */
    unregisterComponent(el) {
        const index = this.entities.indexOf(el);
        this.entities.splice(index, 1);
    },
    /**
     * Collect all attribution components and return an HTML table with credits
     * @return {string} - an HTML table with the scene credits
     * @alias module:attribution-system
     * @example <caption>Query the system for an HTML table of credits:</caption>
     *    document.querySelector("a-scene").systems["attribution"].getAttributionTable();
     */
    getAttributionTable() {
        if (this.entities.length === 0) return undefined;
        let table = '<table>';
        for (let i = 0; i < this.entities.length; i++) {
            const attr = this.entities[i].getAttribute('attribution');
            const title =
                attr.sourceURL.length > 0
                    ? `<a href='${attr.sourceURL}' target='_blank'>${attr.title}</a>`
                    : `${attr.title}`;
            const author =
                attr.authorURL.length > 0
                    ? `<a href='${attr.authorURL}' target='_blank'>${attr.author}</a>`
                    : `${attr.author}`;
            const license =
                attr.licenseURL.length > 0
                    ? `<a href='${attr.licenseURL}' target='_blank'>${attr.license}</a>`
                    : `${attr.license}`;
            table += `<tr><td style='text-align: left'>
                        <small>${title} (id:${attr.id}) by ${author}, ${license}.</small>
                      </td></tr>`;
        }
        table += '</table>';
        return table;
    },
    /**
     * Extract author, license, source and title assuming sketchfab format:
     *   author: "AuthorName (url-link-to-author)"
     *   license: "CC-BY-4.0 (url-link-to-license)"
     *   source: "url-link-to-model-website"
     *   title: "Model Title"
     *
     * It will try to get exttributes from gltf's asset.extras (sketchfab) and scene.userData (blender)
     * If both are found, data will be merged with preference to properties in asset.extras
     *
     * @param {object} el - the aframe element to set the attribution
     * @param {object} gltfComponent - the GLTF model to extract properties from
     * @alias module:attribution-system
     */
    extractAttributionFromGltfAsset(el, gltfComponent) {
        // check gltf's asset.extras (sketchfab) and scene.userData (blender)
        let attr1 = {};
        let attr2 = {};
        if (gltfComponent.model && Object.hasOwn(gltfComponent.model, 'asset')) {
            if (Object.hasOwn(gltfComponent.model.asset, 'extras')) {
                attr1 = this.parseExtrasAttributes(gltfComponent.model.asset.extras);
            }
        }
        if (gltfComponent.model && Object.hasOwn(gltfComponent.model, 'userData')) {
            attr2 = this.parseExtrasAttributes(gltfComponent.model.userData);
        }
        Object.assign(attr2, attr1); // merge data from asset.extras and scene.userData;  asset.extras is preferred
        el.setAttribute('attribution', attr2);
    },
    /**
     * Parse author, license, source and title attributes.
     * @param {object} extras - the source for the attribute data (asset.extras or scene.userData)
     * @return {object} - a dictionary with the author, license, source and title parsed
     * @alias module:attribution-system
     */
    parseExtrasAttributes(extras) {
        const attrObj = {};
        this.parseAttribute(extras, attrObj, 'author');
        this.parseAttribute(extras, attrObj, 'license');
        this.parseAttribute(extras, attrObj, 'source');
        this.parseAttribute(extras, attrObj, 'title');
        return attrObj;
    },
    /**
     * Parse attribute given as parameter. Tries to find the attribute and add it to 'attribution' dictionary
     * @param {object} extras - the source for the attribute data
     * @param {object} attribution - the destination attribute dictionary
     * @param {string} attribute - which attribute to parse
     * @return {boolean} - true/false if it could find the attribute
     * @alias module:attribution-system
     */
    parseAttribute(extras, attribution, attribute) {
        if (!Object.hasOwn(extras, attribute)) return false;
        const r = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g; // fairly permissive url regex
        const match = r.exec(extras[attribute]); // extract url
        const url = match ? match[0] : undefined;
        /* eslint-disable no-param-reassign */
        attribution[attribute] = extras[attribute].replace(url, '').replace('(', '').replace(')', '').trim(); // remove url, parenthesis and extra spaces
        attribution[`${attribute}URL`] = url;
        return true;
    },
});
