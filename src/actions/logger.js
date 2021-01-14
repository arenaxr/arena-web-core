/**
 * Wrapper for various console logs and errors
 */
export class Logger {
    /**
     * Normal log
     * @param {string} source caller source for logging
     * @param {string} text message to log
     * @param {args} args extra messages
     * @return {string} logged message
     */
    static log(source, text, ...args) {
        const msgSrc = ['[action=', source, ']'].join('');
        const message = [text, ...args].join(' ');
        console.log(msgSrc, message);
        return message;
    }

    /**
     * Warning
     * @param {string} source caller source for logging
     * @param {string} text message to log
     * @param {args} args extra messages
     * @return {string} logged message
     */
    static warning(source, text, ...args) {
        const msgSrc = ['[action=', source, ']'].join('');
        const message = [text, ...args].join(' ');
        console.warn(msgSrc, message);
        return message;
    }

    /**
     * Error
     * @param {string} source caller source for logging
     * @param {string} text message to log
     * @param {args} args extra messages
     * @return {string} logged message
     */
    static error(source, text, ...args) {
        const msgSrc = ['[action=', source, ']'].join('');
        const message = [text, ...args].join(' ');
        console.error(msgSrc, message);
        return message;
    }
}
