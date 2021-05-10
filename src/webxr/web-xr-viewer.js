/**
 * WebXR viewer handler and pseudo-click generator
 *
 */

window.addEventListener('enter-vr', async function(e) {
    const urlParams = new URLSearchParams(window.location.search);
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl.is('ar-mode')) {
        window.lastMouseTarget = undefined;
        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        if (isWebXRViewer) {
            await import('../apriltag/apriltag-script.js');

            // create psuedo-cursor
            let cursor = document.getElementById('mouse-cursor');
            const cursorParent = cursor.parentNode;
            cursorParent.removeChild(cursor);
            cursor = document.createElement('a-cursor');
            cursor.setAttribute('fuse', false);
            cursor.setAttribute('scale', '0.1 0.1 0.1');
            cursor.setAttribute('position', '0 0 -0.1');
            cursor.setAttribute('max-distance', '10000');
            if (urlParams.get('noreticle')) {
                cursor.setAttribute('material', 'transparent: "true"; opacity: 0');
            } else {
                cursor.setAttribute('color', '#f00');
            }
            cursorParent.appendChild(cursor);

            // handle tap events
            document.addEventListener('mousedown', function(e) {
                if (window.lastMouseTarget) {
                    const el = document.getElementById(window.lastMouseTarget);
                    const elPos = new THREE.Vector3();
                    el.object3D.getWorldPosition(elPos);

                    const intersection = {
                        x: elPos.x,
                        y: elPos.y,
                        z: elPos.z,
                    };
                    el.emit('mousedown', {
                        'clicker': window.ARENA.camName,
                        'intersection': {
                            point: intersection,
                        },
                        'cursorEl': true,
                    }, false);
                }
            });

            document.addEventListener('mouseup', function(e) {
                if (window.lastMouseTarget) {
                    const el = document.getElementById(window.lastMouseTarget);
                    const elPos = new THREE.Vector3();
                    el.object3D.getWorldPosition(elPos);
                    const intersection = {
                        x: elPos.x,
                        y: elPos.y,
                        z: elPos.z,
                    };
                    el.emit('mouseup', {
                        'clicker': window.ARENA.camName,
                        'intersection': {
                            point: intersection,
                        },
                        'cursorEl': true,
                    }, false);
                }
            });
        }
        document.getElementById('env').setAttribute('visible', false);
    }
});
