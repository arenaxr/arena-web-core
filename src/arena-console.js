/**
 * @fileoverview Redirect log messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENA */
'use strict';

/**
 * Redirect console messages to MQTT
 * 
 * Assumes that a publish() function is given (defaults to ARENA.Mqtt.publish) and will
 * publish to a configured topic (defaults to dftDbgTopic bellow).
 * 
 * Original console is saved to window.jsConsole
 */
 export class ARENAMqttConsole {
    static dftDbgTopic = "realm/proc/debug/stdout/unknown-rtuuid";
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
     static init({consoleDebug = true, mqttDebug = true, mqttLogUncaughtExceptions = true, mqttQueueLen = 500, mqttMsgsPerSec = 100, dbgTopic = ARENAMqttConsole.dftDbgTopic, publish = undefined} = {}) {
      window.console = (function(jsConsole) {
        // deal with browsers with no console
        if (!window.console || !jsConsole) {
          jsConsole = {};
        }
  
        // save original console as window.jsConsole
        window.jsConsole = jsConsole;
        
        // declare internal variables; mostly for setOptions
        var _consoleDebug = consoleDebug;
        var _mqttDebug = mqttDebug;
        var _mqttLogUncaughtExceptions = mqttLogUncaughtExceptions;
        var _mqttQueueLen = mqttQueueLen;
        var _dbgTopic = dbgTopic;
        var _publish = publish;
        var _sendQueue = [];
        var _isSending = false;
        var _mqttDelayMs = (mqttMsgsPerSec == 0) ? 0 : 1000/mqttMsgsPerSec;
 
        // send unhandled exceptions to mqtt
        if (_mqttLogUncaughtExceptions) {          
          window.onerror = function (message, file, line, col, error) {
              let msg = `ERROR: ${message} (${file}, line ${line})`;
              if (_publish) _publish(_dbgTopic, msg);
              else {
                _sendQueue.push(msg);
                sendNextMessage(); // attempt to send next msg    
              }
              return false;
          };
          /*
          window.addEventListener("error", function (e) {
              let msg = `ERROR: ${e.error} (${e.filename}, line ${e.lineno}`;
              _publish(_dbgTopic, msg);
              return false;
          })*/
          window.addEventListener('unhandledrejection', function (e) {
              let msg = `ERROR: ${e.reason}`;
              if (_publish) _publish(_dbgTopic, msg);
              else {
                _sendQueue.push(msg);
                sendNextMessage(); // attempt to send next msg    
              }
              return false;
          })
        }
        
        // log to console
        var consoleLog = (args, level) => {
            if (_consoleDebug == false) return;
            //let argsArray = [...args];
            //argsArray.unshift('>');
            window.jsConsole[level] && window.jsConsole[level].apply(window.jsConsole, args);
        };
        
        // log to mqtt
        var mqttLog = (args, level) => {
            if (!_mqttDebug) return;
            let msg = `${level.toUpperCase()}:`; 
            // convert args into a string
            for (var i = 0; i < args.length; i++) {
                try {
                    msg += ` ${JSON.stringify(args[i])}`;
                } catch (e) {
                    msg += ' (Object; could not convert)';
                } 
            }
            if (_sendQueue.length >= mqttQueueLen) _sendQueue.shift(); // throw old messages when queue is full
            _sendQueue.push(msg);
            sendNextMessage(); // attempt to send next msg
        };
        
        // publish messages from queue
        var sendNextMessage = async () => {          
            if (!_sendQueue.length || _isSending || _publish==undefined) return;

            if (_mqttDelayMs > 0) {
                _isSending = true;
                var msg = _sendQueue.shift();
                await _publish(_dbgTopic, msg);
                setTimeout(sendNextMessage, _mqttDelayMs);
                _isSending = false;
            } else {
                _isSending = true;
                for (var i = 0; i < _sendQueue.length; i++) {
                    _publish(_dbgTopic, _sendQueue[i]);
                }              
                _sendQueue = [];
                _isSending = false;
            }
        };
                    
        return {
          log: function() {
            consoleLog(arguments, "log");
            mqttLog(arguments, "log");
          },
          warn: function() {
            consoleLog(arguments, "warn");
            mqttLog(arguments, "warn");
          },
          error: function() {
            consoleLog(arguments, "error");
            mqttLog(arguments, "error");
          },
          info: function(v) {
            consoleLog(arguments, "info");
            mqttLog(arguments, "info");
          },
          setOptions({consoleDebug = true, mqttDebug = true, mqttLogUncaughtExceptions = undefined, mqttQueueLen = 500, mqttMsgsPerSec = 100, dbgTopic = ARENAMqttConsole.dftDbgTopic, publish = undefined}) {
            if (mqttLogUncaughtExceptions != undefined) throw 'We do not support changing mqttLogUncaughtExceptions!';
            _consoleDebug = consoleDebug;
            _mqttDebug = mqttDebug;
            _mqttQueueLen = mqttQueueLen;
            _dbgTopic = dbgTopic;
            _publish = publish;   
                        
            // adjust queue size
            while (_sendQueue.length >= _mqttQueueLen) _sendQueue.shift(); 
              
            // as _publish() might be set now, check if we have pending messages 
            if (_sendQueue) sendNextMessage();
          }
        };
      })(window.console);
    }
  }
