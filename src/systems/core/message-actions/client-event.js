const warn = AFRAME.utils.debug('ARENA:client-event:warn');
const error = AFRAME.utils.debug('ARENA:client-event:error');

/**
 * Client Event handler
 */
export default class ClientEvent {
    /**
     * Client Event handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const { id } = message;
        const { data } = message;

        // ignore events from ourselves
        if (id === ARENA.idTag) {
            return;
        }
        if (id === ARENA.handLName) {
            return;
        }
        if (id === ARENA.handRName) {
            return;
        }

        // ignore goto-url and textinput events
        if (message.type === 'goto-url' || message.type === 'textinput') {
            return;
        }

        const entityEl = document.getElementById(id);
        if (!entityEl) {
            error(`Object with object_id "${id}" does not exist!`);
            return;
        }

        const point = new THREE.Vector3(
            parseFloat(data.targetPosition.x),
            parseFloat(data.targetPosition.y),
            parseFloat(data.targetPosition.z)
        );

        switch (message.type) {
            case 'collision':
                // emit a synthetic click event with ugly data syntax
                entityEl.emit(
                    'mousedown',
                    {
                        clicker: id,
                        intersection: {
                            point,
                        },
                    },
                    false
                );
                break;
            case 'mousedown':
                // emit a synthetic click event with ugly data syntax
                entityEl.emit(
                    'mousedown',
                    {
                        clicker: id,
                        intersection: {
                            point,
                        },
                    },
                    false
                );
                break;
            case 'mouseup':
                // emit a synthetic click event with ugly data syntax
                entityEl.emit(
                    'mouseup',
                    {
                        clicker: id,
                        intersection: {
                            point,
                        },
                    },
                    false
                );
                break;
            case 'soundplay':
                if (entityEl.components.sound) {
                    entityEl.components.sound.playSound();
                }
                break;
            case 'soundpause':
                if (entityEl.components.sound) {
                    entityEl.components.sound.pauseSound();
                }
                break;
            case 'soundstop':
                if (entityEl.components.sound) {
                    entityEl.components.sound.stopSound();
                }
                break;
            case 'physx-grabstart':
                if (AFRAME.scenes[0].systems.physx) {
                    entityEl.components['physx-remote-grabber']?.startGrab(data.target, data.pose, data.targetPose);
                }
                break;
            case 'physx-grabend':
                if (AFRAME.scenes[0].systems.physx) {
                    entityEl.components['physx-remote-grabber']?.stopGrab(data.target, data.pose, data.targetPose);
                }
                break;
            default: // handle others here like mouseenter / mouseleave
                break;
        }
    }
}
