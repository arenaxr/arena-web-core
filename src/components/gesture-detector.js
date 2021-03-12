// Component that detects and emits events for touch gestures
// Based off https://github.com/8thwall/web/blob/master/examples/aframe/manipulate/gesture-detector.js

import {ARENAUtils} from '../utils.js';

AFRAME.registerComponent('gesture-detector', {

    init: function() {
        console.log('gesture-detector', 'init');
        //const self = this;

        this.internalState = {
            previousState: null,
        };

        this.emitGestureEvent = this.emitGestureEvent.bind(this);

        //window.addEventListener('touchstart', this.emitGestureEvent);
        //window.addEventListener('touchend', this.emitGestureEvent);
        //window.addEventListener('touchmove', this.emitGestureEvent);

        window.addEventListener('pointerstart', this.emitGestureEvent);
        window.addEventListener('pointerend', this.emitGestureEvent);
        window.addEventListener('pointermove', this.emitGestureEvent);
    },

    remove: function() {
        console.log('gesture-detector', 'remove');

        //window.removeEventListener('touchstart', this.emitGestureEvent);
        //window.removeEventListener('touchend', this.emitGestureEvent);
        //window.removeEventListener('touchmove', this.emitGestureEvent);

        window.removeEventListener('pointerstart', this.emitGestureEvent);
        window.removeEventListener('pointerend', this.emitGestureEvent);
        window.removeEventListener('pointermove', this.emitGestureEvent);
    },

    emitGestureEvent(event) {
        const currentState = this.getTouchState(event);

        const previousState = this.internalState.previousState;

        const gestureContinues =
            previousState &&
            currentState &&
            currentState.touchCount == previousState.touchCount;

        const gestureEnded = previousState && !gestureContinues;

        const gestureStarted = currentState && !gestureContinues;

        if (gestureEnded) {
            console.log('gesture-detector', 'gestureEnded');
            const eventName =
                this.getEventPrefix(previousState.touchCount) + 'fingerend';

            //this.el.emit(eventName, previousState);
            // do not emit touch move locally, send through MQTT

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
                    positionChange: previousState,
                    source: ARENA.camName,
                },
            };
            // publishing events attached to user id objects allows sculpting security
            ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);

            this.internalState.previousState = null;
        }

        if (gestureStarted) {
            console.log('gesture-detector', 'gestureStarted');
            currentState.startTime = performance.now();

            currentState.startPosition = currentState.position;

            currentState.startSpread = currentState.spread;

            const eventName =
                this.getEventPrefix(currentState.touchCount) + 'fingerstart';

            //this.el.emit(eventName, currentState);
            // do not emit touch move locally, send through MQTT

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
                    positionChange: currentState,
                    source: ARENA.camName,
                },
            };
            // publishing events attached to user id objects allows sculpting security
            ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);

            this.internalState.previousState = currentState;
        }

        if (gestureContinues) {
            console.log('gesture-detector', 'gestureContinues');
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

            const eventName = this.getEventPrefix(currentState.touchCount) + 'fingermove';

            // this.el.emit(eventName, eventDetail);
            // do not emit touch move locally, send through MQTT

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
                    positionChange: eventDetail,
                    source: ARENA.camName,
                },
            };
            // publishing events attached to user id objects allows sculpting security
            ARENA.Mqtt.publish(ARENA.outputTopic + ARENA.camName, thisMsg);
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

        const centerPositionRawX =
            touchList.reduce((sum, touch) => sum + touch.clientX, 0) /
            touchList.length;

        const centerPositionRawY =
            touchList.reduce((sum, touch) => sum + touch.clientY, 0) /
            touchList.length;

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
            const spread =
                touchList.reduce((sum, touch) => {
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
});
