/* global AFRAME, ARENA, THREE */

import { ARENA_EVENTS } from '../../constants';

function computeCentroid(points, centroid) {
    centroid.set(0, 0);
    points.forEach((p) => {
        centroid.add(p);
    });
    centroid.divideScalar(points.length);
}

AFRAME.registerSystem('debug-ui', {
    init() {
        if (ARENA.params.debugUI) {
            ARENA.events.addMultiEventListener([ARENA_EVENTS.ARENA_LOADED], () => {
                const debugCard = document.createElement('a-entity');
                debugCard.setAttribute('arenaui-card', {
                    title: 'Debug',
                    body: '',
                    fontSize: 0.018,
                    widthScale: '0.5',
                });
                debugCard.setAttribute('position', { x: 0, y: 0.2, z: -1 });
                document.getElementById('my-camera').appendChild(debugCard);
                ARENA.debugXR = (text, newline = true) => {
                    const prevText = debugCard.getAttribute('arenaui-card').body;
                    if (text === undefined) {
                        debugCard.setAttribute('arenaui-card', { body: '' });
                    } else {
                        const n = newline ? '\n' : '';
                        debugCard.setAttribute('arenaui-card', { body: `${prevText}${n}${text}` });
                    }
                };
            });
        }
    },
});

AFRAME.registerSystem('mesh-dump', {
    schema: {
        directionObjectName: { type: 'string', default: 'plant' },
    },

    init() {
        const { sceneEl } = this;

        if (ARENA.params.debugMesh) {
            sceneEl.renderer.xr.addEventListener('sessionstart', () => {
                if (sceneEl.is('ar-mode')) {
                    const { xrSession } = sceneEl;
                    this.webXRSessionStarted(xrSession).then(() => {});
                }
            });
        }

        this.onRAF = this.onRAF.bind(this);
        this.webXRSessionStarted = this.webXRSessionStarted.bind(this);
    },
    async webXRSessionStarted(xrSession) {
        if (xrSession === undefined) return;
        xrSession.requestAnimationFrame(this.onRAF);
    },
    async onRAF(_time, frame) {
        if (frame.detectedPlanes === undefined) return;
        if (frame.detectedPlanes.size === 0) {
            // First may be empty
            this.sceneEl.xrSession.requestAnimationFrame(this.onRAF);
        } else {
            ARENA.debugXR('Detected planes. ');
            const refFloor = document.getElementById('ref_floor');
            const xrRefSpace = this.sceneEl.renderer.xr.getReferenceSpace();
            if (refFloor) {
                ARENA.debugXR('Found ref floor plane');
                let floorPlane;
                let directionPlane;
                // eslint-disable-next-line no-restricted-syntax
                ARENA.debugXR('Planes: ', false);
                for (const plane of frame.detectedPlanes) {
                    ARENA.debugXR(`${plane.semanticLabel} | `, false);
                    if (plane.semanticLabel === 'floor') {
                        floorPlane = plane;
                    }
                    if (plane.semanticLabel === this.data.directionObjectName) {
                        directionPlane = plane;
                    }
                }
                // Get detected floor pose
                ARENA.debugXR('Found detected floor plane');
                const planePose = new THREE.Matrix4();
                planePose.fromArray(frame.getPose(floorPlane.planeSpace, xrRefSpace).transform.matrix);
                const planePos = new THREE.Vector3();
                const planeRot = new THREE.Matrix3();
                planePos.setFromMatrixPosition(planePose);
                planeRot.setFromMatrix4(planePose);
                // Calculate offset from refFloor to detected floor
                const refFloorPos = refFloor.object3D.position;
                const offsetPos = new THREE.Vector3(refFloorPos.x, refFloorPos.y, refFloorPos.z);
                offsetPos.sub(planePos);
                offsetPos.y = 0; // Don't move vertically
                ARENA.debugXR(`Relocating position by ${offsetPos.x}, ${offsetPos.y}, ${offsetPos.z}`);
                // Get points of detected floor
                const dVectors = floorPlane.polygon.map((p) => new THREE.Vector2(p.x, p.z));
                dVectors.pop(); // Remove loop-closing end-point
                if (directionPlane) {
                    const directionBox = document.getElementById('directionBox');
                    if (directionBox) {
                        dVectors.push(
                            new THREE.Vector2(directionBox.object3D.position.x, directionBox.object3D.position.z)
                        );
                    }
                }

                ARENA.utils.relocateUserCamera(offsetPos);
            } else {
                ARENA.debugXR('Found floor, no ref, publishing ref');
                frame.detectedMeshes.forEach((mesh) => {
                    ARENA.Mqtt.publish(
                        `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}`,
                        JSON.stringify({
                            vertices: mesh.vertices,
                            indices: mesh.indices,
                            semanticLabel: mesh.semanticLabel,
                            meshPose: frame.getPose(mesh.meshSpace, xrRefSpace).transform.matrix,
                        })
                    );
                });
                frame.detectedPlanes.forEach((plane) => {
                    ARENA.Mqtt.publish(
                        `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}`,
                        JSON.stringify({
                            polygon: plane.polygon,
                            orientation: plane.orientation,
                            semanticLabel: plane.semanticLabel,
                            planePose: frame.getPose(plane.planeSpace, xrRefSpace).transform.matrix,
                        })
                    );
                });
            }
        }
    },
});
