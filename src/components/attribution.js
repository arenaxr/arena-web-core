
/* global AFRAME */

/**
 * Attribution Component/System
 * Add attribution message to any entity
 * e.g.:
 *    attribution="description:A Spaceship;
 *     message:This work is based on 'Spaceship' by 'Some Author' licensed under CC BY 4.0."
 *
 * Query the system for a list of the messages:
 *    document.querySelector("a-scene").systems["attribution"].getMsgs();
 *    returns: [{description: "A Spaceship", message: "This work is ...', id='object_id of the entity'}]
 */
AFRAME.registerSystem('attribution', {
    schema: {},
    init: function() {
        this.entities = [];
        console.log('System init');
    },
    registerComponent: function(el) {
        this.entities.push(el);
    },
    unregisterComponent: function(el) {
        const index = this.entities.indexOf(el);
        this.entities.splice(index, 1);
    },
    getMsgs: function() {
        const attrMsgs = [];
        for (i = 0; i < this.entities.length; i++) {
            attrMsgs.push(this.entities[i].getAttribute('attribution'));
        }
        return attrMsgs;
    },
});

AFRAME.registerComponent('attribution', {
    schema: {
        message: {
            type: 'string',
            default: '',
        }, // e.g. This work is based on "Spaceship" by "Author" licensed under CC BY 4.0.
        modelDescription: {
            type: 'string',
            default: '',
        }, // e.g. A model of a spaceship
        id: {
            type: 'string',
            default: '',
        }, // the object id in the scene; filled in on init
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
