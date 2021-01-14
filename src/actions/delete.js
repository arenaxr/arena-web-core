import {Logger} from './logger.js';

/**
 * Delete object handler
 */
export class Delete {
    /**
     * Delete handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const name = message.object_id;
        if (name === undefined) {
            Logger.error('delete', 'Malformed message (no object_id):', JSON.stringify(message));
        }

        const entityEl = document.getElementById(name);
        if (!entityEl) {
            Logger.error('delete', `Object with object_id "${name}" does not exist!`);
        }

        const parentEl = entityEl.parentEl;
        if (parentEl) {
            parentEl.removeChild(entityEl);
        }
    }
}
