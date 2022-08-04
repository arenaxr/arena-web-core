const HIDDEN_CLASS = 'a-hidden';

AFRAME.registerComponent('arena-webar-session', {
    schema: {
        enabled: {type: 'boolean', default: true},
        drawTagsEnabled: {type: 'boolean', default: true},
        quadSigma: {type: 'number', default: 0.2},
        imgWidth: {type: 'number', default: 1280},
        imgHeight: {type: 'number', default: 720},
        cx: {type: 'number', default: 640},
        cy: {type: 'number', default: 360},
        fx: {type: 'number', default: 1280},
        fy: {type: 'number', default: 1280},
    },

    init: async function() {
        const data = this.data;
        const el = this.el;

        // hide environment and make scene transparent
        const env = document.getElementById('env');
        env.setAttribute('visible', false);

        // hide ar/vr buttons
        this.hideVRButtons();

        // hide icons
        const icons = document.getElementById('icons-div-container');
        icons.style.display = 'none';

        const camera = document.getElementById('my-camera');
        // disable press and move controls
        camera.setAttribute('press-and-move', 'enabled', false);
        // remove dragging to rotate scene
        camera.setAttribute('look-controls', 'touchEnabled', false);
        // enable aframe's usage of gyro
        camera.setAttribute('look-controls', 'magicWindowTrackingEnabled', true);

        // Disable handoff of orientation to THREE when `ar-mode` and VR-capability is detected
        document.getElementById('my-camera').components['look-controls'].updateOrientation = function() {
            const object3D = this.el.object3D;
            const pitchObject = this.pitchObject;
            const yawObject = this.yawObject;

            this.updateMagicWindowOrientation();

            // On mobile, do camera rotation with touch events and sensors.
            object3D.rotation.x = this.magicWindowDeltaEuler.x + pitchObject.rotation.x;
            object3D.rotation.y = this.magicWindowDeltaEuler.y + yawObject.rotation.y;
            object3D.rotation.z = this.magicWindowDeltaEuler.z;
        };

        el.addState('ar-mode');
        el.resize();

        this.setupCursor();

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));

        document.querySelector('a-scene').systems['armarker'].webXRSessionStarted();
    },

    setupCursor: function() {
        const urlParams = new URLSearchParams(window.location.search);

        // create cursor
        let cursor = document.getElementById('mouse-cursor');
        const cursorParent = cursor.parentNode;
        cursorParent.removeChild(cursor);
        cursor = document.createElement('a-cursor');
        cursor.setAttribute('fuse', false);
        cursor.setAttribute('scale', '0.1 0.1 0.1');
        cursor.setAttribute('position', '0 0 -0.1');
        if (urlParams.get('noreticle')) {
            cursor.setAttribute('material', 'transparent: "true"; opacity: 0');
        } else {
            cursor.setAttribute('color', '#555');
        }
        cursor.setAttribute('max-distance', '10000');
        cursorParent.appendChild(cursor);

        window.lastMouseTarget = undefined;

        // handle tap events
        document.addEventListener('mousedown', function(e) {
            const intersectedEl = cursor.components.cursor.intersectedEl;
            if (intersectedEl) {
                const intersection = cursor.components.raycaster.getIntersection(intersectedEl);
                intersectedEl.emit('mousedown', {
                    'clicker': window.ARENA.camName,
                    'intersection': {
                        point: intersection.point,
                    },
                    'cursorEl': true,
                }, false);
            }
        });

        document.addEventListener('mouseup', function(e) {
            const intersectedEl = cursor.components.cursor.intersectedEl;
            if (intersectedEl) {
                const intersection = cursor.components.raycaster.getIntersection(intersectedEl);
                intersectedEl.emit('mouseup', {
                    'clicker': window.ARENA.camName,
                    'intersection': {
                        point: intersection.point,
                    },
                    'cursorEl': true,
                }, false);
            }
        });
    },

    hideVRButtons: function() {
        const data = this.data;
        const el = this.el;

        const enterAREl = el.components['vr-mode-ui'].enterAREl;
        enterAREl.classList.add(HIDDEN_CLASS);
        const enterVREl = el.components['vr-mode-ui'].enterVREl;
        enterVREl.classList.add(HIDDEN_CLASS);
    },

    onResize: function() {
        const data = this.data;
        const el = this.el;

        // set new camera projection matrix parameters
        if (window.innerWidth > data.imgWidth || window.innerHeight > data.imgHeight) {
            el.camera.fov = 31; // found empirically
        } else {
            el.camera.fov = 26; // found empirically
        }
        el.camera.aspect = window.innerWidth / window.innerHeight;
        el.camera.near = 0.001; // webxr viewer parameters
        el.camera.far = 1000.0;
        el.camera.updateProjectionMatrix();

        // webxr:
        // el.camera.projectionMatrix.elements[0] = 1.7113397121429443; // 1.6807010173797607
        // el.camera.projectionMatrix.elements[1] = 0;
        // el.camera.projectionMatrix.elements[2] = 0;
        // el.camera.projectionMatrix.elements[3] = 0;
        // el.camera.projectionMatrix.elements[4] = 0;
        // el.camera.projectionMatrix.elements[5] = 3.5782558917999268; // 2.9894068241119385
        // el.camera.projectionMatrix.elements[6] = 0;
        // el.camera.projectionMatrix.elements[7] = 0;
        // el.camera.projectionMatrix.elements[8] = 0;
        // el.camera.projectionMatrix.elements[9] = 0;
        // el.camera.projectionMatrix.elements[10] = -1.0000009536743164;
        // el.camera.projectionMatrix.elements[11] = -1;
        // el.camera.projectionMatrix.elements[12] = 0;
        // el.camera.projectionMatrix.elements[13] = 0;
        // el.camera.projectionMatrix.elements[14] = -0.001000000978820026;
        // el.camera.projectionMatrix.elements[15] = 0;
    },
});
