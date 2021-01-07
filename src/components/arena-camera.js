/* global AFRAME, ARENA */

/**
 * Tracking camera movement in real time. Emits camera pose change and vio change events.
 *
 */
AFRAME.registerComponent('arena-camera', {
    enabled: {type: 'boolean', default: false},
    color: {type: 'string', default: '#' + Math.floor(Math.random() * 16777215).toString(16)},

    init: function() {
        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();

        this.vioRotation = new THREE.Quaternion();
        this.vioPosition = new THREE.Vector3();
        this.vioMatrix = new THREE.Matrix4();

        this.camParent = new THREE.Matrix4();
        this.cam = new THREE.Matrix4();
        this.cpi = new THREE.Matrix4();

        this.lastPose = '';

        this.heartBeatCounter = 0;
        this.tick = AFRAME.utils.throttleTick(this.tick, 1000, this);
    },

    publishPose() {
        const data = this.data;
        if (!data.enabled) return;
        const msg = {
            object_id: ARENA.camName,
            displayName: ARENA.displayName,
            action: 'create',
            type: 'object',
            data: {
                object_type: 'camera',
                position: {
                    x: parseFloat(this.position.x.toFixed(3)),
                    y: parseFloat(this.position.y.toFixed(3)),
                    z: parseFloat(this.position.z.toFixed(3)),
                },
                rotation: {
                    x: parseFloat(this.rotation._x.toFixed(3)),
                    y: parseFloat(this.rotation._y.toFixed(3)),
                    z: parseFloat(this.rotation._z.toFixed(3)),
                    w: parseFloat(this.rotation._w.toFixed(3)),
                },
                color: data.color,
            },
        };

        if (ARENA.JitsiAPI) {
            msg.jitsiId = ARENA.JitsiAPI.getJitsiId();
            msg.hasAudio = ARENA.JitsiAPI.hasAudio();
            msg.hasVideo = ARENA.JitsiAPI.hasVideo();
        }

        if (ARENA.FaceTracker) {
            msg.hasAvatar = ARENA.FaceTracker.running();
        }

        publish(ARENA.outputTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
    },

    publishVio() {
        const data = this.data;
        if (!data.enabled) return;
        if (ARENA.fixedCamera !== '') {
            const msg = {
                object_id: ARENA.camName,
                action: 'create',
                type: 'object',
                data: {
                    object_type: 'camera',
                    position: {
                        x: parseFloat(this.vioPosition.x.toFixed(3)),
                        y: parseFloat(this.vioPosition.y.toFixed(3)),
                        z: parseFloat(this.vioPosition.z.toFixed(3)),
                    },
                    rotation: {
                        x: parseFloat(this.vioRotation._x.toFixed(3)),
                        y: parseFloat(this.vioRotation._y.toFixed(3)),
                        z: parseFloat(this.vioRotation._z.toFixed(3)),
                        w: parseFloat(this.vioRotation._w.toFixed(3)),
                    },
                    color: data.color,
                },
            };
            publish(ARENA.vioTopic + ARENA.camName, msg); // extra timestamp info at end for debugging
        }
    },

    tick: (function(t, dt) {
        const el = this.el;
        this.heartBeatCounter++;

        this.rotation.setFromRotationMatrix(el.object3D.matrixWorld);
        this.position.setFromMatrixPosition(el.object3D.matrixWorld);

        this.camParent = el.object3D.parent.matrixWorld;
        this.cam = el.object3D.matrixWorld;

        this.cpi.getInverse(this.camParent);
        this.cpi.multiply(this.cam);

        this.vioMatrix.copy(this.cpi);
        this.vioRotation.setFromRotationMatrix(this.cpi);
        this.vioPosition.setFromMatrixPosition(this.cpi);

        const rotationCoords = rotToText(this.rotation);
        const positionCoords = coordsToText(this.position);
        const newPose = rotationCoords + ' ' + positionCoords;

        // update position every 1 sec
        if (this.lastPose !== newPose || this.heartBeatCounter % 1000 == 0) {
            this.publishPose();
            this.publishVio();
            this.lastPose = newPose;
        }
    }),
});
