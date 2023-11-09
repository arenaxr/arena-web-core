/* global AFRAME, ARENA, THREE */

function computeCentroid(points, centroid) {
    centroid.set(0, 0);
    points.forEach((p) => {
        centroid.add(p);
    });
    centroid.divideScalar(points.length);
}

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
            const refFloor = document.getElementById('ref_floor');
            if (refFloor) {
                let floorPlane;
                // eslint-disable-next-line no-restricted-syntax
                for (const plane of frame.detectedPlanes) {
                    if (plane.semanticLabel === 'floor') {
                        floorPlane = plane;
                        break;
                    }
                }
                const xrRefSpace = this.sceneEl.renderer.xr.getReferenceSpace();
                const planePose = frame.getPose(floorPlane.planeSpace, xrRefSpace).transform.matrix;
                const planePos = new THREE.Vector3();
                planePos.setFromMatrix4(planePose);
                // const dVectors = floorPlane.polygon.map((p) => new THREE.Vector2(p.x, p.y));
                // dVectors.pop(); // Remove loop-closing end-point
                // const floorCentroid = new THREE.Vector2();
                // computeCentroid(dVectors, floorCentroid);
                const offset = new THREE.Vector3(refFloor.x, refFloor.y, refFloor.z);
                // offset.sub(new THREE.Vector3(floorCentroid.x, 0, floorCentroid.y));
                offset.sub(planePos);
                offset.y = 0; // Don't move vertically
                ARENA.utils.relocateUserCamera(offset);
            } else {
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
