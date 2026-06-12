/**
 * @fileoverview Audience Camera System — renders a fixed off-screen camera
 * positioned in front of the screenshare for streaming to 2D lite users.
 *
 * Uses a second lightweight WebGLRenderer at 640×480 @ 10fps, rendering the
 * same Three.js scene from a fixed audience-perspective camera. The off-screen
 * canvas feeds a captureStream() MediaStream directly.
 *
 * Screenshare position is resolved via the persist API (same source as the
 * lite client) to ensure both sides agree on which object is the "lead"
 * screenshare and where it is.
 */

const AUDIENCE_CAM_WIDTH = 640;
const AUDIENCE_CAM_HEIGHT = 480;
const AUDIENCE_CAM_FPS = 10;
const AUDIENCE_CAM_INTERVAL = 1000 / AUDIENCE_CAM_FPS; // ms between renders
const FRONT_OFFSET = 3.0; // metres in front of screenshare
const DEFAULT_SCREENSHARE_POS = { x: 0, y: 3.1, z: -3 };
const DEFAULT_SCREENSHARE_SCALE = { x: 8, y: 6, z: 0.01 };

AFRAME.registerSystem('audience-cam', {
    schema: {},

    init() {
        this.audienceCam = null; // THREE.PerspectiveCamera
        this.offCanvas = null; // HTMLCanvasElement (hidden, WebGL)
        this.offRenderer = null; // THREE.WebGLRenderer (separate context)
        this.stream = null; // MediaStream
        this.active = false;
        this.lastRenderTime = 0;
    },

    /**
     * Start the audience camera — creates the off-screen renderer and
     * positions the camera facing the screenshare.
     */
    async start() {
        if (this.active) return;

        // 1. Create perspective camera (NOT added to scene graph)
        this.audienceCam = new THREE.PerspectiveCamera(
            60, // FOV — wide enough to frame the screenshare
            AUDIENCE_CAM_WIDTH / AUDIENCE_CAM_HEIGHT,
            0.1,
            1000
        );

        // 2. Position the camera facing the screenshare (async — fetches persist data)
        await this.updatePosition();

        // 3. Create off-screen WebGL canvas + renderer
        this.offCanvas = document.createElement('canvas');
        this.offCanvas.width = AUDIENCE_CAM_WIDTH;
        this.offCanvas.height = AUDIENCE_CAM_HEIGHT;
        this.offCanvas.style.display = 'none';
        document.body.appendChild(this.offCanvas);

        this.offRenderer = new THREE.WebGLRenderer({
            canvas: this.offCanvas,
            antialias: false,
            preserveDrawingBuffer: true, // required for captureStream
        });
        this.offRenderer.setSize(AUDIENCE_CAM_WIDTH, AUDIENCE_CAM_HEIGHT);
        this.offRenderer.setPixelRatio(1);

        // 4. Create stream (manual frame capture mode)
        this.stream = this.offCanvas.captureStream(0);

        this.active = true;
        this.lastRenderTime = 0;

        console.info('[AudienceCam] Started');
    },

    /**
     * Stop the audience camera and clean up resources.
     */
    stop() {
        if (!this.active) return;

        // Stop all stream tracks
        if (this.stream) {
            this.stream.getTracks().forEach((t) => t.stop());
            this.stream = null;
        }

        // Dispose off-screen renderer
        if (this.offRenderer) {
            this.offRenderer.dispose();
            this.offRenderer = null;
        }

        // Remove off-screen canvas
        if (this.offCanvas && this.offCanvas.parentNode) {
            this.offCanvas.parentNode.removeChild(this.offCanvas);
        }
        this.offCanvas = null;
        this.audienceCam = null;
        this.active = false;

        console.info('[AudienceCam] Stopped');
    },

    /**
     * Return the MediaStream from the off-screen canvas.
     */
    getStream() {
        return this.stream;
    },

    /**
     * Compute the audience camera position facing the screenshare.
     * Uses the SAME data source and algorithm as the lite client:
     *   1. Fetch persist objects from the REST API
     *   2. Find the lead screenshareable object (oldest with screenshareable or id='screenshare')
     *   3. Compute front face using weighted references: origin (1.0), startPosition landmarks (2.0)
     *   4. Position camera FRONT_OFFSET metres in front of the screenshare
     */
    async updatePosition() {
        if (!this.audienceCam) return;

        let ssPos = { ...DEFAULT_SCREENSHARE_POS };
        let ssScale = { ...DEFAULT_SCREENSHARE_SCALE };
        let ssQuat = new THREE.Quaternion();
        let geomType = 'plane';
        let persistObjects = [];

        // --- 1. Fetch persist objects (same API as lite client) ---
        try {
            const persistHost = ARENA?.defaults?.persistHost || window.location.hostname;
            const persistPath = ARENA?.defaults?.persistPath || '/persist';
            const nameSpace = ARENA?.nameSpace || 'public';
            const sceneName = ARENA?.sceneName || 'lobby';
            const url = `//${persistHost}${persistPath}/${nameSpace}/${sceneName}`;

            const token = ARENA?.defaults?.mqttToken || ARENA?.mqttToken || '';
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                persistObjects = await res.json();
            }
        } catch (err) {
            console.warn('[AudienceCam] Failed to fetch persist objects:', err);
        }

        // --- 2. Find lead screenshareable object (same logic as lite client) ---
        const screenshareableObjs = persistObjects
            .filter((o) => o.attributes?.screenshareable || o.object_id === 'screenshare')
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        if (screenshareableObjs.length > 0) {
            const ss = screenshareableObjs[0];
            const attr = ss.attributes || {};
            const pos = attr.position;
            if (pos) {
                ssPos = { x: pos.x ?? 0, y: pos.y ?? 3.1, z: pos.z ?? -3 };
            }
            const objType = attr.object_type || attr.geometry?.primitive || 'plane';
            geomType = (objType === 'box' || objType === 'cube') ? 'box' : 'plane';

            // Rotation
            const rot = attr.rotation;
            if (rot && rot.w !== undefined) {
                ssQuat = new THREE.Quaternion(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0, rot.w);
            } else if (rot) {
                const euler = new THREE.Euler(
                    THREE.MathUtils.degToRad(rot.x || 0),
                    THREE.MathUtils.degToRad(rot.y || 0),
                    THREE.MathUtils.degToRad(rot.z || 0),
                    'YXZ'
                );
                ssQuat = new THREE.Quaternion().setFromEuler(euler);
            }

            // Scale
            const scl = attr.scale;
            if (scl) {
                ssScale = { x: scl.x ?? 8, y: scl.y ?? 6, z: scl.z ?? 0.01 };
            }

            console.info(`[AudienceCam] Found persist object "${ss.object_id}", pos=(${ssPos.x}, ${ssPos.y}, ${ssPos.z}), scale=(${ssScale.x}, ${ssScale.y}, ${ssScale.z}), geom=${geomType}`);
        } else {
            console.info(`[AudienceCam] No screenshare in persist, using defaults: pos=(${ssPos.x}, ${ssPos.y}, ${ssPos.z})`);
        }

        // --- 3. Compute front face (same algorithm as lite client) ---
        let localNormal;
        if (geomType === 'box') {
            const { x: sx, y: sy, z: sz } = ssScale;
            if (sx <= sy && sx <= sz) localNormal = new THREE.Vector3(1, 0, 0);
            else if (sy <= sx && sy <= sz) localNormal = new THREE.Vector3(0, 1, 0);
            else localNormal = new THREE.Vector3(0, 0, 1);
        } else {
            localNormal = new THREE.Vector3(0, 0, 1);
        }

        const worldNormal = localNormal.clone().applyQuaternion(ssQuat);

        let posWeight = 0;
        let negWeight = 0;

        const classify = (px, py, pz, weight) => {
            const dx = px - ssPos.x;
            const dy = py - ssPos.y;
            const dz = pz - ssPos.z;
            const dot = dx * worldNormal.x + dy * worldNormal.y + dz * worldNormal.z;
            if (dot >= 0) posWeight += weight;
            else negWeight += weight;
        };

        // Scene origin (weight 1.0)
        classify(0, 0, 0, 1.0);

        // startPosition landmarks from persist (weight 2.0)
        for (const obj of persistObjects) {
            const attr = obj.attributes || {};
            const pos = attr.position;
            if (!pos || (pos.x === undefined && pos.y === undefined && pos.z === undefined)) continue;
            const lm = attr.landmark;
            if (lm && lm.startingPosition === true) {
                classify(pos.x ?? 0, pos.y ?? 0, pos.z ?? 0, 2.0);
            }
        }

        const frontNormal = posWeight >= negWeight
            ? worldNormal.clone()
            : worldNormal.clone().negate();

        console.info(`[AudienceCam] worldNormal=(${worldNormal.x.toFixed(2)}, ${worldNormal.y.toFixed(2)}, ${worldNormal.z.toFixed(2)}) posWeight=${posWeight} negWeight=${negWeight} frontNormal=(${frontNormal.x.toFixed(2)}, ${frontNormal.y.toFixed(2)}, ${frontNormal.z.toFixed(2)})`);

        // --- 4. Position camera at screenshare, looking AWAY into the scene ---
        const camPos = new THREE.Vector3(ssPos.x, ssPos.y, ssPos.z);
        const lookTarget = new THREE.Vector3(
            ssPos.x + frontNormal.x * FRONT_OFFSET,
            ssPos.y,
            ssPos.z + frontNormal.z * FRONT_OFFSET
        );

        this.audienceCam.position.copy(camPos);
        this.audienceCam.lookAt(lookTarget);
        this.audienceCam.updateMatrixWorld(true);

        console.info(`[AudienceCam] Camera at (${camPos.x.toFixed(1)}, ${camPos.y.toFixed(1)}, ${camPos.z.toFixed(1)}) looking away from screenshare (${ssPos.x.toFixed(1)}, ${ssPos.y.toFixed(1)}, ${ssPos.z.toFixed(1)})`);
    },

    /**
     * Throttled render pass — renders the scene from the audience camera
     * using the off-screen WebGL renderer.
     */
    tick(t) {
        if (!this.active || !this.audienceCam || !this.offRenderer) return;

        // Throttle to target FPS
        if (t - this.lastRenderTime < AUDIENCE_CAM_INTERVAL) return;
        this.lastRenderTime = t;

        const scene = this.el.object3D;
        if (!scene) return;

        // Render scene from audience camera using the separate renderer
        this.offRenderer.render(scene, this.audienceCam);

        // Request frame capture from captureStream
        const videoTrack = this.stream?.getVideoTracks()[0];
        if (videoTrack && videoTrack.requestFrame) {
            videoTrack.requestFrame();
        }

        // Debug: log frame count
        this._frameCount = (this._frameCount || 0) + 1;
        if (this._frameCount <= 3 || this._frameCount % 100 === 0) {
            console.info(`[AudienceCam] Frame ${this._frameCount} rendered`);
        }
    },

    remove() {
        this.stop();
    },
});
