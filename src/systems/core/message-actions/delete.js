/* global AFRAME */

const info = AFRAME.utils.debug('ARENA:delete:info');
const warn = AFRAME.utils.debug('ARENA:delete:warn');
const error = AFRAME.utils.debug('ARENA:delete:error');

/**
 * Delete object handler
 */
export default class Delete {
    /**
     * Delete handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const { id } = message;
        if (id === undefined) {
            error('Malformed message (no object_id):', JSON.stringify(message));
        }

        const entityEl = document.getElementById(id);
        if (!entityEl) {
            error(`Object with object_id "${id}" does not exist!`);
            return;
        }

        // Clean up linked dependents
        try {
            document.querySelectorAll(`[dep=${id}]`).forEach((depEl) => {
                this.blipRemove(depEl);
            });
        } catch (e) {
            console.error(e);
        }

        // Remove element itself
        this.blipRemove(entityEl);
    }

    /**
     * Remove element with blip effect if it has the component and is set as enabled
     * @param el - element to remove
     */
    static blipRemove(el) {
        if (el.components.blipout?.data?.enabled) {
            el.components.blipout.blip();
        } else {
            el.remove();
        }
    }
}
