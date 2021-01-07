window.addEventListener('enter-vr', function(e) {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl.is('ar-mode')) {
        window.lastMouseTarget = undefined;
        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        if (isWebXRViewer) {
            const base64script = document.createElement('script');
            base64script.onload = async () => {
                await importScript('./src/apriltag/script.js');
            };
            base64script.src = './src/apriltag/base64_binary.js';
            document.head.appendChild(base64script);

            // handle tap events
            document.addEventListener('mousedown', function(e) {
                if (window.lastMouseTarget) {
                    const el = window.ARENA.sceneObjects[window.lastMouseTarget];
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
                } else {
                    // debug("no lastMouseTarget");
                }
            });

            document.addEventListener('mouseup', function(e) {
                if (window.lastMouseTarget) {
                    const el = window.ARENA.sceneObjects[window.lastMouseTarget];
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

            // create psuedo-cursor
            let cursor = document.getElementById('mouseCursor');
            const cursorParent = cursor.parentNode;
            cursorParent.removeChild(cursor);
            cursor = document.createElement('a-cursor');
            cursor.setAttribute('fuse', false);
            cursor.setAttribute('scale', '0.1 0.1 0.1');
            cursor.setAttribute('position', '0 0 -0.1'); // move reticle closer (side effect: bigger!)
            cursor.setAttribute('color', '#333');
            cursor.setAttribute('max-distance', '10000');
            cursor.setAttribute('id', 'fuse-cursor');
            cursorParent.appendChild(cursor);
        }
        document.getElementById('env').setAttribute('visible', false);
    }
});
