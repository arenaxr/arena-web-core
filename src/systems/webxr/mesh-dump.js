/* global AFRAME, ARENA */

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
        if (frame.detectedMeshes === undefined) return;
        if (frame.detectedMeshes.size === 0) {
            // First may be empty
            this.sceneEl.xrSession.requestAnimationFrame(this.onRAF);
        } else {
            console.log(frame.detectedMeshes);
            frame.detectedMeshes.forEach((mesh) => {
                ARENA.Mqtt.publish(
                    `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}`,
                    JSON.stringify({ vertices: mesh.vertices, indices: mesh.indices, semanticLabel: mesh })
                );
            });
        }
    },
});
