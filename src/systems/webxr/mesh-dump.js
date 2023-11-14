/* global AFRAME, ARENA, THREE */

import { ARENA_EVENTS } from '../../constants';

function computeCentroid(points, centroid) {
    centroid.set(0, 0);
    points.forEach((p) => {
        centroid.add(p);
    });
    centroid.divideScalar(points.length);
}

function findBestAlignment(refPoints, dPoints) {
    let bestDistance = Infinity;
    let bestMatrix = null;
    let bestRotation = 0;
    let bestIndex = -1;
    const tempMatrix = new THREE.Matrix3();
    const rotatedVector = new THREE.Vector2();

    // Try aligning each corner of xRect to each corner of refRect
    for (let i = 0; i < refPoints.length; i++) {
        for (let j = 0; j < dPoints.length; j++) {
            // Calculate the angle difference
            const angle = refPoints[i].angle() - dPoints[j].angle();

            // Reset the temporary matrix for new rotation
            tempMatrix.identity().rotate(angle);

            // Calculate the sum of squared distances between the rotated xRect and refRect
            let distance = 0;
            for (let k = 0; k < dPoints.length; k++) {
                // Apply the matrix to rotate the point
                rotatedVector.copy(dPoints[k]).applyMatrix3(tempMatrix);
                distance += rotatedVector.distanceToSquared(refPoints[(i + k) % refPoints.length]);
            }

            // Check if this is the best alignment so far
            if (distance < bestDistance) {
                bestDistance = distance;
                bestRotation = angle;
                bestIndex = j;
                // Clone the temporary matrix to store the best one
                bestMatrix = tempMatrix.clone();
            }
        }
    }

    return {
        distance: bestDistance,
        matrix: bestMatrix,
        rotation: bestRotation,
        index: bestIndex,
    };
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
        directionObjectName: { type: 'string', default: 'door' },
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
                // Get points of refFloor
                const { width, height } = refFloor.getAttribute('geometry');
                const rVectors = [
                    new THREE.Vector2(width / 2, height / 2),
                    new THREE.Vector2(-width / 2, height / 2),
                    new THREE.Vector2(-width / 2, -height / 2),
                    new THREE.Vector2(width / 2, -height / 2),
                ];
                // Get points of detected floor
                const dVectors = floorPlane.polygon.map((p) => new THREE.Vector2(p.x, p.z));
                dVectors.pop(); // Remove loop-closing end-point
                // If we have a directionPlane, add corresponding points
                if (directionPlane) {
                    const directionBox = document.getElementById('directionBox');
                    if (directionBox) {
                        dVectors.push(
                            new THREE.Vector2(
                                refFloor.object3D.position.x - directionBox.object3D.position.x,
                                refFloor.object3D.position.z - directionBox.object3D.position.z
                            )
                        );
                    }
                    const directionPlanePose = new THREE.Matrix4();
                    directionPlanePose.fromArray(frame.getPose(directionPlane.planeSpace, xrRefSpace).transform.matrix);
                    const directionPlanePos = new THREE.Vector3();
                    directionPlanePos.setFromMatrixPosition(directionPlanePose);
                    rVectors.push(directionPlanePos);
                }
                // Find best alignment
                const { matrix } = findBestAlignment(rVectors, dVectors);
                const offsetRotation = new THREE.Quaternion();
                offsetRotation.setFromMatrix4(matrix);
                ARENA.debugXR(
                    `Rotating by ${offsetRotation.x}, ${offsetRotation.y}, ${offsetRotation.z}, ${offsetRotation.w}`
                );
                ARENA.utils.relocateUserCamera(offsetPos, offsetRotation);
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
