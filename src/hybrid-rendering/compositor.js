import { CompositorPass } from '../postprocessing/passes/compositor-pass';

AFRAME.registerSystem('compositor', {
    init() {
        const { sceneEl } = this;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        this.effects = sceneEl.systems.effects;

        this.isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        this.cameraLPos = new THREE.Vector3();
        this.cameraRPos = new THREE.Vector3();

        this.cameraLProj = new THREE.Matrix4();
        this.cameraRProj = new THREE.Matrix4();

        this.prevFrames = {};
        this.prevFrameID = -1;
        this.latency = -1;

        this.pass = null;
    },

    disable() {
        if (this.pass === null) return;

        this.pass.enabled = false;
        // special case: unbind postprocessing effects when this is the only pass
        if (this.effects.composer.passes.length === 1) {
            this.effects.composer.passes = [];
            this.effects.unbind();
        } else {
            this.effects.composer.passes.shift();
        }
    },

    addRemoteRenderTarget(remoteRenderTarget) {
        const { sceneEl } = this;
        const { renderer } = sceneEl;

        const scene = sceneEl.object3D;
        const { camera } = sceneEl;

        this.pass = new CompositorPass(camera, remoteRenderTarget);
        this.effects.insertPass(this.pass, 0);
    },

    decomposeProj(projMat) {
        const { elements } = projMat;
        const x = elements[0];
        const a = elements[2];
        const y = elements[5];
        const b = elements[6];
        const c = elements[10];
        const d = elements[11];
        const e = elements[14];
        return [x, a, y, b, c, d, e];
    },

    closestKeyInDict(k, d, thres = 10) {
        let result;
        let minDist = Infinity;
        for (const key in d) {
            const dist = Math.abs(key - k);
            if (dist <= thres && dist <= minDist) {
                result = key;
                minDist = dist;
            }
        }

        return result;
    },

    updateRenderingState() {
        const { renderer } = this.sceneEl;
        const { render } = renderer;
        const { sceneEl } = this;

        const scene = sceneEl.object3D;
        const { camera } = sceneEl;

        let hasDualCameras;
        let ipd;
        let leftProj;
        let rightProj;

        const cameraVR = renderer.xr.getCamera();

        if (this.pass === null) return;

        // set camera parameters (transformation, projection) for ATW
        if (this.effects.cameras.length === 2) {
            // we have two cameras here (vr mode or headset ar mode)
            hasDualCameras = !this.isWebXRViewer; // webarviewer seens to have 2 cameras, but uses one...

            const cameraL = this.effects.cameras[0];
            const cameraR = this.effects.cameras[1];
            this.cameraLPos.setFromMatrixPosition(cameraL.matrixWorld);
            this.cameraRPos.setFromMatrixPosition(cameraR.matrixWorld);
            ipd = this.cameraLPos.distanceTo(this.cameraRPos);

            this.cameraLProj.copy(cameraL.projectionMatrix);
            this.cameraRProj.copy(cameraR.projectionMatrix);

            leftProj = this.decomposeProj(this.cameraLProj.transpose());
            rightProj = this.decomposeProj(this.cameraRProj.transpose());

            this.pass.setCameraMats(cameraL, cameraR);

            AFRAME.utils.entity.setComponentProperty(sceneEl, 'arena-hybrid-render-client', {
                hasDualCameras,
                ipd,
                leftProj,
                rightProj,
            });
        } else if (this.effects.cameras.length === 1) {
            // we just have a single xr camera here
            hasDualCameras = false;

            this.pass.setCameraMats(camera);
        } else {
            // not in xr mode, just one camera
            hasDualCameras = false;

            this.pass.setCameraMats(camera);
        }

        this.pass.setHasDualCameras(hasDualCameras);

        sceneEl.setAttribute('arena-hybrid-render-client', 'hasDualCameras', hasDualCameras);

        let currFrameID = this.pass.getFrameID(renderer);
        if (currFrameID) {
            currFrameID = this.closestKeyInDict(currFrameID, this.prevFrames);
        }
        if (currFrameID) {
            const currFrame = this.prevFrames[currFrameID];
            const currTime = performance.now();
            const frameTimestamp = currFrame.ts;
            this.latency = currTime - frameTimestamp;
            // console.log("[frame id]", currTime - frameTimestamp);

            if (currFrameID >= this.prevFrameID) {
                const { pose } = currFrame;
                if (pose.length === 2) {
                    const cameraL = cameraVR.cameras[0];
                    const cameraR = cameraVR.cameras[1];
                    const poseL = pose[0];
                    const poseR = pose[1];
                    this.pass.setCameraMatsRemote(poseL, cameraL.projectionMatrix, poseR, cameraR.projectionMatrix);
                } else {
                    this.pass.setCameraMatsRemote(pose, camera.projectionMatrix);
                }
            }

            for (const key in this.prevFrames) {
                if (this.prevFrames.hasOwnProperty(key) && key < currFrameID) {
                    delete this.prevFrames[key];
                }
            }
            this.prevFrameID = currFrameID;
        }
    },
});
