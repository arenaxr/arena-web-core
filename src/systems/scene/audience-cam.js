/**
 * @fileoverview Audience Camera System — renders a fixed off-screen camera
 * positioned in front of the screenshare for streaming to 2D lite users.
 *
 * Uses the MAIN A-Frame renderer with a WebGLRenderTarget at 1280×720 @ 15fps.
 * Renders the scene from the audience camera into the render target, then blits
 * to a 2D canvas for captureStream(). This shares all compiled shaders/textures
 * with the main renderer — no second WebGL context needed.
 *
 * Screenshare position is resolved via the persist API (same source as the
 * lite client) to ensure both sides agree on which object is the "lead"
 * screenshare and where it is.
 */

const AUDIENCE_CAM_WIDTH = 1280;
const AUDIENCE_CAM_HEIGHT = 720;
const AUDIENCE_CAM_FPS = 15;
const AUDIENCE_CAM_INTERVAL = 1000 / AUDIENCE_CAM_FPS; // ms between renders
const FRONT_OFFSET = 3.0; // metres in front of screenshare
const DEFAULT_SCREENSHARE_POS = { x: 0, y: 3.1, z: -3 };
const DEFAULT_SCREENSHARE_SCALE = { x: 8, y: 6, z: 0.01 };

AFRAME.registerSystem('audience-cam', {
    schema: {},

    init() {
        this.audienceCam = null; // THREE.PerspectiveCamera
        this.renderTarget = null; // THREE.WebGLRenderTarget
        this.canvas2d = null; // HTMLCanvasElement (2D blit target)
        this.ctx2d = null; // CanvasRenderingContext2D
        this.pixelBuffer = null; // Uint8Array for readRenderTargetPixels
        this.stream = null; // MediaStream
        this.active = false;
        this.lastRenderTime = 0;
    },

    /**
     * Start the audience camera — creates the render target and
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

        // 2. Position the camera (async — fetches persist data)
        await this.updatePosition();

        // 3. Create WebGLRenderTarget (shares the main renderer's GL context)
        this.renderTarget = new THREE.WebGLRenderTarget(AUDIENCE_CAM_WIDTH, AUDIENCE_CAM_HEIGHT, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        });

        // 4. Create 2D canvas for blit + captureStream
        this.canvas2d = document.createElement('canvas');
        this.canvas2d.width = AUDIENCE_CAM_WIDTH;
        this.canvas2d.height = AUDIENCE_CAM_HEIGHT;
        this.canvas2d.style.display = 'none';
        document.body.appendChild(this.canvas2d);
        this.ctx2d = this.canvas2d.getContext('2d');

        // 5. Pixel buffer for readRenderTargetPixels
        this.pixelBuffer = new Uint8Array(AUDIENCE_CAM_WIDTH * AUDIENCE_CAM_HEIGHT * 4);

        // 6. ImageData for putImageData (reuse to avoid GC)
        this.imageData = new ImageData(AUDIENCE_CAM_WIDTH, AUDIENCE_CAM_HEIGHT);

        // 7. Create stream (manual frame capture mode)
        this.stream = this.canvas2d.captureStream(0);

        this.active = true;
        this.lastRenderTime = 0;
        this._frameCount = 0;

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

        // Dispose render target
        if (this.renderTarget) {
            this.renderTarget.dispose();
            this.renderTarget = null;
        }

        // Remove 2D canvas
        if (this.canvas2d && this.canvas2d.parentNode) {
            this.canvas2d.parentNode.removeChild(this.canvas2d);
        }
        this.canvas2d = null;
        this.ctx2d = null;
        this.pixelBuffer = null;
        this.imageData = null;
        this.audienceCam = null;
        this.active = false;

        console.info('[AudienceCam] Stopped');
    },

    /**
     * Return the MediaStream from the 2D canvas.
     */
    getStream() {
        return this.stream;
    },

    /**
     * Compute the audience camera position.
     * Uses persist API (same data source as lite client).
     */
    async updatePosition() {
        if (!this.audienceCam) return;

        let ssPos = { ...DEFAULT_SCREENSHARE_POS };
        let ssScale = { ...DEFAULT_SCREENSHARE_SCALE };
        let ssQuat = new THREE.Quaternion();
        let geomType = 'plane';
        let persistObjects = [];

        // --- 1. Fetch persist objects ---
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

        // --- 2. Find lead screenshareable object ---
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

            const scl = attr.scale;
            if (scl) {
                ssScale = { x: scl.x ?? 8, y: scl.y ?? 6, z: scl.z ?? 0.01 };
            }

            console.info(`[AudienceCam] Found persist object "${ss.object_id}", pos=(${ssPos.x}, ${ssPos.y}, ${ssPos.z}), scale=(${ssScale.x}, ${ssScale.y}, ${ssScale.z}), geom=${geomType}`);
        } else {
            console.info(`[AudienceCam] No screenshare in persist, using defaults`);
        }

        // --- 3. Compute front face ---
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

        classify(0, 0, 0, 1.0);

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
     * into the render target, then blits to the 2D canvas.
     */
    tick(t) {
        if (!this.active || !this.audienceCam || !this.renderTarget) return;

        // Throttle to target FPS
        if (t - this.lastRenderTime < AUDIENCE_CAM_INTERVAL) return;
        this.lastRenderTime = t;

        const scene = this.el.object3D;
        if (!scene) return;

        const renderer = this.el.renderer;
        if (!renderer) return;

        const W = AUDIENCE_CAM_WIDTH;
        const H = AUDIENCE_CAM_HEIGHT;

        // Save renderer state
        const currentRenderTarget = renderer.getRenderTarget();
        const currentXrEnabled = renderer.xr.enabled;
        const savedClearColor = new THREE.Color();
        renderer.getClearColor(savedClearColor);
        const savedClearAlpha = renderer.getClearAlpha();

        // Disable XR for the off-screen render
        renderer.xr.enabled = false;

        // Set clear color to match scene background
        if (scene.background && scene.background.isColor) {
            renderer.setClearColor(scene.background, 1);
        } else {
            renderer.setClearColor(0x000000, 1);
        }

        // Render scene from audience camera into render target
        renderer.setRenderTarget(this.renderTarget);
        renderer.clear(true, true, true);
        renderer.render(scene, this.audienceCam);

        // Read pixels from render target
        renderer.readRenderTargetPixels(this.renderTarget, 0, 0, W, H, this.pixelBuffer);

        // Restore renderer state
        renderer.setRenderTarget(currentRenderTarget);
        renderer.xr.enabled = currentXrEnabled;
        renderer.setClearColor(savedClearColor, savedClearAlpha);

        // Blit to 2D canvas (flip Y — WebGL reads bottom-to-top)
        const src = this.pixelBuffer;
        const dst = this.imageData.data;
        const rowBytes = W * 4;
        for (let y = 0; y < H; y++) {
            const srcOffset = (H - 1 - y) * rowBytes;
            const dstOffset = y * rowBytes;
            dst.set(src.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
        }
        this.ctx2d.putImageData(this.imageData, 0, 0);

        // Request frame capture from captureStream
        const videoTrack = this.stream?.getVideoTracks()[0];
        if (videoTrack && videoTrack.requestFrame) {
            videoTrack.requestFrame();
        }

        // Debug: log frame count
        this._frameCount++;
        if (this._frameCount <= 3 || this._frameCount % 100 === 0) {
            console.info(`[AudienceCam] Frame ${this._frameCount} rendered`);
        }
    },

    remove() {
        this.stop();
    },
});
