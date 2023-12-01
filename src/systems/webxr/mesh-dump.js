/* global AFRAME, ARENA, THREE */

import { Packr } from 'msgpackr';
import { ARENA_EVENTS } from '../../constants';

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
        } else {
            ARENA.debugXR = () => {};
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
        if (frame.detectedPlanes === undefined || frame.detectedMeshes === undefined) return;
        if (frame.detectedPlanes.size === 0 || frame.detectedMeshes.size === 0) {
            // First may be empty
            this.sceneEl.xrSession.requestAnimationFrame(this.onRAF);
        } else {
            ARENA.debugXR('Found plane and mesh', false);
            const xrRefSpace = this.sceneEl.renderer.xr.getReferenceSpace();
            frame.detectedMeshes.forEach((mesh) => {
                if (mesh.semanticLabel === 'global mesh') {
                    const msg = this.packr.pack({
                        vertices: Object.values(mesh.vertices),
                        indices: Object.values(mesh.indices),
                        semanticLabel: mesh.semanticLabel,
                        meshPose: Object.values(frame.getPose(mesh.meshSpace, xrRefSpace).transform.matrix),
                    });
                    ARENA.debugXR(' packing and publishing global mesh');
                    ARENA.Mqtt.publish(
                        `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}/${ARENA.camName}/meshes`,
                        msg,
                        undefined,
                        undefined,
                        true
                    );
                }
            });
            // frame.detectedPlanes.forEach((plane) => {
            //     ARENA.Mqtt.publish(
            //         `${ARENA.defaults.realm}/proc/debug/${ARENA.namespacedScene}/${ARENA.camName}/planes`,
            //         JSON.stringify({
            //             polygon: plane.polygon,
            //             orientation: plane.orientation,
            //             semanticLabel: plane.semanticLabel,
            //             planePose: frame.getPose(plane.planeSpace, xrRefSpace).transform.matrix,
            //         })
            //     );
            // });
        }
    },
});
