/* global ARENA */
import {Logger} from './logger.js';
import {Parser} from './parser.js';

/**
 * Update object handler
 */
export class Update {
    /**
     * Update handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const result = Parser.parse('update', message);
        if (result === undefined) return;

        const name = result.name;
        const data = result.data;

        const entityEl = document.getElementById(name);
        if (!entityEl) {
            Logger.error('update', `Object with object_id "${name}" does not exist!`);
            return;
        }

        switch (message.type) { // i.e. "object", "rig"
        case 'object': {
            // our own camera/controllers: bail, this message is meant for all other viewers
            if (name === ARENA.camName) {
                return;
            }
            if (name === ARENA.viveLName) {
                return;
            }
            if (name === ARENA.viveRName) {
                return;
            }
            if (name === ARENA.faceName) {
                return;
            }
            if (name === ARENA.avatarName) {
                return;
            }

            /**
             * just setAttribute() - data can contain multiple attribute-value pairs
             * e.g:
             * {
             *   ... "action": "update", "data":
             *   {
             *     "animation": {"property": "rotation", "to": "0 360 0", "loop": "true", "dur": 10000}}}' ...
             *   }
             * }
             */

            for (const [attribute, value] of Object.entries(data)) {
                if (attribute === 'rotation') {
                    entityEl.object3D.quaternion.set(value.x, value.y, value.z, value.w);
                } else if (attribute === 'position') {
                    entityEl.object3D.position.set(value.x, value.y, value.z);
                } else if (attribute === 'color') {
                    if (!entityEl.hasOwnProperty('text')) {
                        entityEl.setAttribute('material', 'color', value);
                    } else {
                        entityEl.setAttribute('text', 'color', value);
                    }
                } else if (attribute === 'text') {
                    if (entityEl.hasOwnProperty('text')) {
                        entityEl.setAttribute('text', 'value', value);
                    }
                } else {
                    if (value === null) {
                        entityEl.removeAttribute(attribute);
                    } else {
                        entityEl.setAttribute(attribute, value);
                    }
                }
            }
            break;
        }
        default: {
            Logger.warn('update', 'Possibly empty message:', JSON.stringify(message));
            break;
        }
        }
    }
}
