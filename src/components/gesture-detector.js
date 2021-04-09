/* global AFRAME, ARENA */

/**
 * @fileoverview Component that detects multi-finger touch gestures. 
 * Based off of work from 8th Wall at https://github.com/8thwall/web/blob/master/examples/aframe/manipulate/gesture-detector.js
 *
 */

import {
    ARENAUtils,
} from '../utils.js';

/**
 * Detect multi-finger touch gestures. Publish events accordingly.
 * Based off 8th Wall's [gesture-detector]{@link https://github.com/8thwall/web/blob/master/examples/aframe/manipulate/gesture-detector.js}
 * @module gesture-detector
 */
AFRAME.registerComponent('gesture-detector', {
    // Without throttling, touchmove publishes at ~20ms
    schema: {
        publishRateMs: {
            default: 200,
        },
    },

    init: function() {
        this.internalState = {
            previousState: null,
            timer: null,
        };
        this.emitGestureEvent = this.emitGestureEvent.bind(this);
        window.addEventListener('touchstart', this.emitGestureEvent);
        window.addEventListener('touchend', this.emitGestureEvent);
        window.addEventListener('touchmove', this.emitGestureEvent);
    },

    remove: function() {
        window.removeEventListener('touchstart', this.emitGestureEvent);
        window.removeEventListener('touchend', this.emitGestureEvent);
        window.removeEventListener('touchmove', this.emitGestureEvent);
    },

    emitGestureEvent(event) {
        const currentState = this.getTouchState(event);
        const previousState = this.internalState.previousState;
        const gestureContinues = previousState && currentState && currentState.touchCount == previousState.touchCount;
        const gestureEnded = previousState && !gestureContinues;
        const gestureStarted = currentState && !gestureContinues;

        if (gestureEnded) {
            const eventName = this.getEventPrefix(previousState.touchCount) + 'fingerend';
            this.sendGesture(eventName, previousState);
            if (this.internalState.timer) {
                clearTimeout(this.internalState.timer);
                this.internalState.timer = null;
            }
            this.internalState.previousState = null;
        }

        if (gestureStarted) {
            currentState.startTime = performance.now();
            currentState.positionStart = currentState.position;
            currentState.spreadStart = currentState.spread;
            const eventName = this.getEventPrefix(currentState.touchCount) + 'fingerstart';
            if (!this.internalState.timer) {
                this.internalState.timer = window.setTimeout(() => {
                    this.internalState.timer = null;
                }, this.data.publishRateMs);
            }
            this.sendGesture(eventName, currentState);
            this.internalState.previousState = currentState;
        }

        if (gestureContinues) {
            const eventDetail = {
                positionChange: {
                    x: currentState.position.x - previousState.position.x,
                    y: currentState.position.y - previousState.position.y,
                },
            };
            if (currentState.spread) {
                eventDetail.spreadChange = currentState.spread - previousState.spread;
            }
            // Update state with new data
            Object.assign(previousState, currentState);
            // Add state data to event detail
            Object.assign(eventDetail, previousState);

            if (!this.internalState.timer) { // throttle publish to publishRateMs
                const eventName = this.getEventPrefix(currentState.touchCount) + 'fingermove';
                this.sendGesture(eventName, eventDetail);

                this.internalState.timer = window.setTimeout(() => {
                    this.internalState.timer = null;
                }, this.data.publishRateMs);
            }
        }
    },

    getTouchState: function(event) {
        if (event.touches.length === 0) {
            return null;
        }
        // Convert event.touches to an array so we can use reduce
        const touchList = [];
        for (let i = 0; i < event.touches.length; i++) {
            touchList.push(event.touches[i]);
        }
        const touchState = {
            touchCount: touchList.length,
        };
        // Calculate center of all current touches
        const centerPositionRawX = touchList.reduce((sum, touch) => sum + touch.clientX, 0) / touchList.length;
        const centerPositionRawY = touchList.reduce((sum, touch) => sum + touch.clientY, 0) / touchList.length;
        touchState.positionRaw = {
            x: centerPositionRawX,
            y: centerPositionRawY,
        };

        // Scale touch position and spread by average of window dimensions
        const screenScale = 2 / (window.innerWidth + window.innerHeight);
        touchState.position = {
            x: centerPositionRawX * screenScale,
            y: centerPositionRawY * screenScale,
        };

        // Calculate average spread of touches from the center point
        if (touchList.length >= 2) {
            const spread = touchList.reduce((sum, touch) => {
                return (
                    sum +
                    Math.sqrt(
                        Math.pow(centerPositionRawX - touch.clientX, 2) +
                        Math.pow(centerPositionRawY - touch.clientY, 2),
                    )
                );
            }, 0) / touchList.length;

            touchState.spread = spread * screenScale;
        }
        return touchState;
    },

    getEventPrefix(touchCount) {
        const numberNames = ['one', 'two', 'three', 'many'];
        return numberNames[Math.min(touchCount, 4) - 1];
    },

    sendGesture(eventName, eventDetail) {
        // only send MQTT clientEvent for 2+ finger touches to avoid 1-finger common touch press-and-move
        if (eventDetail.touchCount < 2) {
            return;
        }
        // send through MQTT
        const camera = document.getElementById('my-camera');
        const position = camera.getAttribute('position');
        const clickPos = ARENAUtils.vec3ToObject(position);

        // generated finger move
        const thisMsg = {
            object_id: 'my-camera',
            action: 'clientEvent',
            type: eventName,
            data: {
                clickPos: clickPos,
                source: ARENA.camName,
                position: {
                    x: parseFloat(eventDetail.position.x.toFixed(5)),
                    y: parseFloat(eventDetail.position.y.toFixed(5)),
                },
                positionStart: {
                    x: parseFloat(eventDetail.positionStart.x.toFixed(5)),
                    y: parseFloat(eventDetail.positionStart.y.toFixed(5)),
                },
                spread: parseFloat(eventDetail.spread.toFixed(5)),
                spreadStart: parseFloat(eventDetail.spreadStart.toFixed(5)),
            },
        };
        // publishing events attached to user id objects allows sculpting security
        ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
    },
});
