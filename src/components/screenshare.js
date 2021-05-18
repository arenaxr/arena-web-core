/* global AFRAME, ARENA */

/**
 * @fileoverview Screen share System to keep track of all screenshareable objects.
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
        const defaultScreenObj = ARENA.screenshare ? ARENA.screenshare : 'screenshare';
        let res = `<select id="screenshareables" class="swal2-select" multiple>`;
        if (Object.keys(this.screenshareables).length > 0) {
            for (const obj of Object.keys(this.screenshareables)) {
                res += `<option value="${obj}">${obj}</option>`;
            }
        } else {
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

AFRAME.registerComponent('screenshareable', {
    schema: {

    },

    init: function() {
        this.system.registerComponent(this);
    },

    remove: function() {
        this.system.unregisterComponent(this);
    },
});
