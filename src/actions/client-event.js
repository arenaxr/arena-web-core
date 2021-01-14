/* global THREE */
import {Logger} from './logger.js';
import {Parser} from './parser.js';

/**
 * Client Event handler
 */
export class ClientEvent {
    /**
     * Client Event handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const result = Parser.parse('clientEvent', message);
        if (result === undefined) return;

        const name = result.name;
        const data = result.data;
        const entityEl = document.getElementById(name);
        if (!entityEl) {
            Logger.error('clientEvent', `Object with object_id "${name}" does not exist!`);
            return;
        }

        let point = null;
        if (data.position) {
            point = new THREE.Vector3(
                parseFloat(data.position.x),
                parseFloat(data.position.y),
                parseFloat(data.position.z),
            );
        } else {
            Logger.warn('clientEvent', 'Malformed message (no data.position):', JSON.stringify(message));
        }

        const clicker = data.source;
        switch (message.type) {
        case 'collision':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: point,
                },
            }, false);
            break;
        case 'mousedown':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mousedown', {
                'clicker': clicker,
                'intersection': {
                    point: point,
                },
            }, false);
            break;
        case 'mouseup':
            // emit a synthetic click event with ugly data syntax
            entityEl.emit('mouseup', {
                'clicker': clicker,
                'intersection': {
                    point: point,
                },
            }, false);
            break;
        default: // handle others here like mouseenter / mouseleave
            break;
        }
    }
}
