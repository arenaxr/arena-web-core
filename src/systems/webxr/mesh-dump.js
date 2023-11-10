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
                ARENA.debugXR = (text) => {
                    const prevText = debugCard.getAttribute('arenaui-card').body;
                    if (text === undefined) {
                        debugCard.setAttribute('arenaui-card', { body: '' });
                    } else {
                        debugCard.setAttribute('arenaui-card', { body: `${prevText}\n${text}` });
                    }
                };
            });
        }
    },
});

AFRAME.registerSystem('mesh-dump', {
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
                // eslint-disable-next-line no-restricted-syntax
                for (const plane of frame.detectedPlanes) {
                    if (plane.semanticLabel === 'floor') {
                        floorPlane = plane;
                        break;
                    }
                }
                ARENA.debugXR('Found detected floor plane');
                const planePose = frame.getPose(floorPlane.planeSpace, xrRefSpace).transform.matrix;
                const planePos = new THREE.Vector3();
                planePos.setFromMatrixPosition(planePose);
                // const dVectors = floorPlane.polygon.map((p) => new THREE.Vector2(p.x, p.y));
                // dVectors.pop(); // Remove loop-closing end-point
                // const floorCentroid = new THREE.Vector2();
                // computeCentroid(dVectors, floorCentroid);
                const offset = new THREE.Vector3(refFloor.x, refFloor.y, refFloor.z);
                // offset.sub(new THREE.Vector3(floorCentroid.x, 0, floorCentroid.y));
                offset.sub(planePos);
                offset.y = 0; // Don't move vertically
                ARENA.debugXR();
                ARENA.debugXR(`Relocating by ${offset.x}, ${offset.y}, ${offset.z}`);
                ARENA.utils.relocateUserCamera(offset);
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
