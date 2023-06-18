/**
 * @fileoverview Redirect log messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Redirect console messages to MQTT
 *
 * Assumes that a publish() function is given (defaults to ARENA.Mqtt.publish) and will
 * publish to a configured topic (defaults to dftDbgTopic below).
 *
 * Original console is saved to window.jsConsole
 */
export default class ARENAMqttConsole {
    static dftDbgTopic = 'realm/proc/debug/stdout/unknown-rtuuid';

    /**
     * Returns a console object that replaces the original console (original console saved to **window.jsConsole**)
     * Parameters are passed in an object: Uses ES6 object destructuring to set defaults.
     *
     * @param {boolean} [consoleDebug=true] - Outputs to console
     * @param {boolean} [mqttDebug=true] - Outputs to mqtt
     * @param {boolean} [mqttLogUncaughtExceptions=true] - Will try to log to mqtt uncaught exceptions
     * @param {int} [mqttQueueLen=500] - Maximum number of messages in the mqtt send queue
     * @param {int} [mqttMsgsPerSec=100] - Throttle mqtt messages to this maximum number per second; 0 = no throttle
     * @param {string} [dbgTopic=dftDbgTopic] - Topic where to publish messages
     * @param {function} [publish=ARENA.Mqtt.publish] - Publish function(topic, msg)
     */
    static init({
        consoleDebug = true,
        mqttDebug = true,
        mqttLogUncaughtExceptions = true,
        mqttQueueLen = 500,
        mqttMsgsPerSec = 100,
        dbgTopic = ARENAMqttConsole.dftDbgTopic,
        publish = undefined,
    } = {}) {
        window.console = (function console(jsConsole) {
            // declare internal variables; mostly for setOptions
            let _consoleDebug = consoleDebug;
            let _mqttDebug = mqttDebug;
            const _mqttLogUncaughtExceptions = mqttLogUncaughtExceptions;
            let _mqttQueueLen = mqttQueueLen;
            let _dbgTopic = dbgTopic;
            let _publish = publish;
            let _sendQueue = [];
            let _isSending = false;
            const _mqttDelayMs = mqttMsgsPerSec === 0 ? 0 : 1000 / mqttMsgsPerSec;

            // publish messages from queue
            const sendNextMessage = async () => {
                if (!_sendQueue.length || _isSending || _publish === undefined) return;

                if (_mqttDelayMs > 0) {
                    _isSending = true;
                    const msg = _sendQueue.shift();
                    await _publish(_dbgTopic, msg);
                    setTimeout(sendNextMessage, _mqttDelayMs);
                    _isSending = false;
                } else {
                    _isSending = true;
                    for (let i = 0; i < _sendQueue.length; i++) {
                        _publish(_dbgTopic, _sendQueue[i]);
                    }
                    _sendQueue = [];
                    _isSending = false;
                }
            };
            // deal with browsers with no console
            if (!window.console || !jsConsole) {
                window.jsConsole = {};
            } else {
                // save original console as window.jsConsole
                window.jsConsole = jsConsole;
            }

            // send unhandled exceptions to mqtt
            if (_mqttLogUncaughtExceptions) {
                window.onerror = function onerror(message, file, line, _col, _error) {
                    const msg = `ERROR: ${message} (${file}, line ${line})`;
                    if (_publish) _publish(_dbgTopic, msg);
                    else {
                        _sendQueue.push(msg);
                        sendNextMessage().then(() => {}); // attempt to send next msg
                    }
                    return false;
                };
                /*
          window.addEventListener("error", function (e) {
              let msg = `ERROR: ${e.error} (${e.filename}, line ${e.lineno}`;
              _publish(_dbgTopic, msg);
              return false;
          }) */
                window.addEventListener('unhandledrejection', (e) => {
                    const msg = `ERROR: ${e.reason}`;
                    if (_publish) _publish(_dbgTopic, msg);
                    else {
                        _sendQueue.push(msg);
                        sendNextMessage().then(() => {}); // attempt to send next msg
                    }
                    return false;
                });
            }

            // log to console
            const consoleLog = (args, level) => {
                if (_consoleDebug === false) return;
                // let argsArray = [...args];
                // argsArray.unshift('>');
                if (window.jsConsole[level] !== undefined) {
                    window.jsConsole[level](...args);
                }
            };

            // log to mqtt
            const mqttLog = (args, level) => {
                if (!_mqttDebug) return;
                let msg = `${level.toUpperCase()}:`;
                // convert args into a string
                for (let i = 0; i < args.length; i++) {
                    try {
                        msg += ` ${JSON.stringify(args[i])}`;
                    } catch (e) {
                        msg += ' (Object; could not convert)';
                    }
                }
                if (_sendQueue.length >= mqttQueueLen) _sendQueue.shift(); // throw old messages when queue is full
                _sendQueue.push(msg);
                sendNextMessage().then(() => {}); // attempt to send next msg
            };

            return {
                log(...args) {
                    consoleLog(args, 'log');
                    mqttLog(args, 'log');
                },
                warn(...args) {
                    consoleLog(args, 'warn');
                    mqttLog(args, 'warn');
                },
                error(...args) {
                    consoleLog(args, 'error');
                    mqttLog(args, 'error');
                },
                info(...args) {
                    consoleLog(args, 'info');
                    mqttLog(args, 'info');
                },
                setOptions(newOpts) {
                    // Avoid shadowing outer scope's variables
                    const options = {
                        ...{
                            // default options
                            consoleDebug: true,
                            mqttDebug: true,
                            mqttLogUncaughtExceptions: undefined,
                            mqttQueueLen: 500,
                            // mqttMsgsPerSec: 100,
                            dbgTopic: ARENAMqttConsole.dftDbgTopic,
                            publish: undefined,
                        },
                        ...newOpts,
                    };
                    const {
                        consoleDebug: setConsoleDebug,
                        mqttDebug: setMqttDebug,
                        mqttLogUncaughtExceptions: setMqttLogUncaughtExceptions,
                        mqttQueueLen: setMqttQueueLen,
                        // mqttMsgsPerSec: setMqttMsgsPerSec,
                        dbgTopic: setDbgTopic,
                        publish: setPublish,
                    } = options;

                    if (setMqttLogUncaughtExceptions !== undefined)
                        throw new Error('We do not support changing mqttLogUncaughtExceptions!');
                    _consoleDebug = setConsoleDebug;
                    _mqttDebug = setMqttDebug;
                    _mqttQueueLen = setMqttQueueLen;
                    _dbgTopic = setDbgTopic;
                    _publish = setPublish;

                    // adjust queue size
                    while (_sendQueue.length >= _mqttQueueLen) _sendQueue.shift();

                    // as _publish() might be set now, check if we have pending messages
                    if (_sendQueue) sendNextMessage().then(() => {});
                },
            };
        })(window.console);
    }
}
