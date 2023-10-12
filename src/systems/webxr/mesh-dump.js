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
    },
    async webXRSessionStarted(xrSession) {
        if (xrSession === undefined) return;
        xrSession.requestAnimationFrame((_time, frame) => {
            if (frame.detectedMeshes) {
                ARENA.Mqtt.publish(
                    `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}`,
                    JSON.stringify(frame.detectedMeshes)
                );
                console.log(frame.detectedMeshes);
            }
        });
    },
});
