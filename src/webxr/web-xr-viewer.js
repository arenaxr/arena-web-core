/**
 * WebXR viewer handler and pseudo-click generator
 *
 */

/**
 * Dynamically import js script
 * usage:
 *   importScript('./path/to/script.js').then((allExports) => { .... }));
 * @param {string} path path of js script
 * @return {promise}
 */
function importScript(path) {
    let entry = window.importScript.__db[path];
    if (entry === undefined) {
        const escape = path.replace(`'`, `\\'`);
        const script = Object.assign(document.createElement('script'), {
            type: 'module',
            textContent: `import * as x from '${escape}'; importScript.__db['${escape}'].resolve(x);`,
        });
        entry = importScript.__db[path] = {};
        entry.promise = new Promise((resolve, reject) => {
            entry.resolve = resolve;
            script.onerror = reject;
        });
        document.head.appendChild(script);
        script.remove();
    }
    return entry.promise;
}
importScript.__db = {};
window['importScript'] = importScript; // needed if we ourselves are in a module

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

            // create psuedo-cursor
            let cursor = document.getElementById('mouse-cursor');
            const cursorParent = cursor.parentNode;
            cursorParent.removeChild(cursor);
            cursor = document.createElement('a-cursor');
            cursor.setAttribute('fuse', false);
            cursor.setAttribute('scale', '0.1 0.1 0.1');
            cursor.setAttribute('position', '0 0 -0.1');
            cursor.setAttribute('color', '#555');
            cursor.setAttribute('max-distance', '10000');
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
