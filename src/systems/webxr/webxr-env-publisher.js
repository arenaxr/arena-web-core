import { Packr } from 'msgpackr';

AFRAME.registerSystem('xr-env-publisher', {
    schema: {
        publishMeshes: { type: 'boolean', default: true },
        onlyGlobalMesh: { type: 'boolean', default: true },
        publishPlanes: { type: 'boolean', default: false },
        publishTopicBase: {
            type: 'string',
            default: `${ARENA.defaults.realm}/env/`,
        },
    },
    init() {
        const { sceneEl } = this;

        this.onRAF = this.onRAF.bind(this);
        this.webXRSessionStarted = this.webXRSessionStarted.bind(this);

        sceneEl.addEventListener('enter-vr', () => {
            if (sceneEl.is('ar-mode')) {
                const { xrSession } = sceneEl;
                this.webXRSessionStarted(xrSession).then(() => {});
            }
        });

        this.packr = new Packr({
            useRecords: false,
            useFloat32: true,
        });
    },
    async webXRSessionStarted(xrSession) {
        if (xrSession === undefined) return;
        xrSession.requestAnimationFrame(this.onRAF);
    },
    async onRAF(_time, frame) {
        const {
            data: { publishMeshes, publishPlanes, publishTopicBase, onlyGlobalMesh },
        } = this;
        if (
            // No mesh or plane support
            (publishPlanes && frame.detectedPlanes === undefined) ||
            (publishMeshes && frame.detectedMeshes === undefined)
        )
            return;
        if ((publishPlanes && frame.detectedPlanes.size === 0) || (publishMeshes && frame.detectedMeshes.size === 0)) {
            // First frame may be empty
            this.sceneEl.xrSession.requestAnimationFrame(this.onRAF);
        } else {
            ARENA.debugXR(`Found ${frame.detectedPlanes.size} planes, ${frame.detectedMeshes.size} meshes`, false);
            const xrRefSpace = this.sceneEl.renderer.xr.getReferenceSpace();
            if (publishMeshes) {
                frame.detectedMeshes.forEach((mesh) => {
                    if (onlyGlobalMesh && mesh.semanticLabel !== 'global mesh') {
                        return;
                    }
                    const msg = this.packr.pack({
                        vertices: Object.values(mesh.vertices),
                        indices: Object.values(mesh.indices),
                        semanticLabel: mesh.semanticLabel,
                        meshPose: Object.values(frame.getPose(mesh.meshSpace, xrRefSpace).transform.matrix),
                    });
                    ARENA.debugXR(`Packing and publishing ${mesh.semanticLabel}`);
                    ARENA.Mqtt.publish(
                        `${publishTopicBase}${ARENA.namespacedScene}/${ARENA.camName}/meshes`,
                        msg,
                        undefined,
                        undefined,
                        true
                    );
                });
            }
            if (publishPlanes) {
                frame.detectedPlanes.forEach((plane) => {
                    const msg = this.packr.pack({
                        polygon: plane.polygon,
                        orientation: plane.orientation,
                        semanticLabel: plane.semanticLabel,
                        planePose: frame.getPose(plane.planeSpace, xrRefSpace).transform.matrix,
                    });
                    ARENA.debugXR(`Packing and publishing ${plane.semanticLabel}`);
                    ARENA.Mqtt.publish(
                        `${publishTopicBase}${ARENA.namespacedScene}/${ARENA.camName}/planes`,
                        msg,
                        undefined,
                        undefined,
                        true
                    );
                });
            }
        }
    },
});
