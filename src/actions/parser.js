import {Logger} from './logger.js';

/**
 * Message parser and verifier
 */
export class Parser {
    /**
     * Parses a message and ensures it has an object_id and data
     * @param {string} source caller source for logging
     * @param {object} message message to parse
     * @return {object} parsed message, undefined if failure
     */
    static parse(source, message) {
        if (!message) {
            Logger.warn(source, 'Recieved empty message');
            return undefined;
        }

        const name = message.object_id;
        if (name === undefined) {
            Logger.error(source, 'Malformed message (no object_id):', JSON.stringify(message));
            return undefined;
        }

        const data = message.data;
        if (data === undefined) {
            Logger.error(source, 'Malformed message (no data field):', JSON.stringify(message));
            return undefined;
        }

        return {
            name: name,
            data: data,
        };
    }
}
