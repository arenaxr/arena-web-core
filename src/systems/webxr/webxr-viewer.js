/**
 * WebXR viewer handler and pseudo-click generator
 *
 */
/* global AFRAME */

AFRAME.registerComponent('webxr-viewer', {
    init() {
        this.onEnterVR = this.onEnterVR.bind(this);
        window.addEventListener('enter-vr', this.onEnterVR);
    },

    onEnterVR() {
        const { el } = this;
        const { sceneEl } = el;

        const urlParams = new URLSearchParams(window.location.search);

        if (sceneEl.is('ar-mode')) {
            window.lastMouseTarget = undefined;

            // create psuedo-cursor
            let cursor = document.getElementById('mouse-cursor');
            const cursorParent = cursor.parentNode;
            cursorParent.removeChild(cursor);
            cursor = document.createElement('a-cursor');
            cursor.setAttribute('fuse', false);
            cursor.setAttribute('scale', '0.1 0.1 0.1');
            cursor.setAttribute('position', '0 0 -0.1');
            cursor.setAttribute('max-distance', '10000');
            cursor.setAttribute('raycaster', { objects: '[click-listener],[click-listener-local]' });
            if (urlParams.get('noreticle')) {
                cursor.setAttribute('material', 'transparent: "true"; opacity: 0');
            } else {
                cursor.setAttribute('color', '#555');
            }
            cursorParent.appendChild(cursor);

            // handle tap events
            document.addEventListener('mousedown', () => {
                const { intersectedEl } = cursor.components.cursor;
                if (intersectedEl) {
                    const intersection = cursor.components.raycaster.getIntersection(intersectedEl);
                    intersectedEl.emit(
                        'mousedown',
                        {
                            clicker: window.ARENA.camName,
                            intersection: {
                                point: intersection.point,
                            },
                            cursorEl: true,
                        },
                        false
                    );
                }
            });

            document.addEventListener('mouseup', () => {
                const { intersectedEl } = cursor.components.cursor;
                if (intersectedEl) {
                    const intersection = cursor.components.raycaster.getIntersection(intersectedEl);
                    intersectedEl.emit(
                        'mouseup',
                        {
                            clicker: window.ARENA.camName,
                            intersection: {
                                point: intersection.point,
                            },
                            cursorEl: true,
                        },
                        false
                    );
                }
            });
        }
    },
});
