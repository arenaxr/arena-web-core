/* global AFRAME, ARENA */

/**
 * @fileoverview Screen share System to keep track of all screenshareable objects.
 *
 */

/**
 * Screenshare-able System. Allows an object to be screenshared upon
 * @module screenshareable
 *
 */
AFRAME.registerSystem('screenshareable', {
    schema: {

    },

    init: function() {
        this.screenshareables = {};
    },

    registerComponent: function(object) {
        const objId = object.el.id.trim();
        this.screenshareables[objId] = object;
    },

    unregisterComponent: function(object) {
        const objId = object.el.id.trim();
        delete this.screenshareables[objId];
    },

    getAll: function() {
        return this.screenshareables;
    },

    getAllAsList: function() {
        return Object.keys(this.screenshareables);
    },

    asHTMLSelect: function() {
        // creates an HTML select list for usage in screen share icon
        let res = `<select id="screenshareables" class="swal2-select" multiple>`;
        if (Object.keys(this.screenshareables).length > 0) {
            for (const obj of Object.keys(this.screenshareables)) {
                res += `<option value="${obj}">${obj}</option>`;
            }
        } else {
            // add only one option: the default screen share object name
            const defaultScreenObj = ARENA.screenshare ? ARENA.screenshare : 'screenshare';
            res += `<option value="${defaultScreenObj}">${defaultScreenObj}</option>`;
        }
        res += `</select>`;
        return res;
    },

    get: function(object) {
        const objId = object.el.id.trim();
        return this.screenshareable[objId];
    },
});
