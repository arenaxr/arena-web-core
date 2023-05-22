import {CompositorPass} from './compositor-pass';

AFRAME.registerSystem('compositor', {
    init: function() {
        const sceneEl = this.sceneEl;

        if (!sceneEl.hasLoaded) {
            sceneEl.addEventListener('renderstart', this.init.bind(this));
            return;
        }

        const renderer = sceneEl.renderer;

        this.cameras = [];
        this.prevFrames = {};
        this.prevFrameID = -1;

        this.originalRenderFunc = null;

        this.renderTarget = new THREE.WebGLRenderTarget(1,1);
        this.renderTarget.texture.name = 'EffectComposer.rt1';
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.t = 0;
        this.dt = 0;

        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionstart', this.onResize.bind(this));
        renderer.xr.addEventListener('sessionend', this.onResize.bind(this));
    },

    addRemoteRenderTarget: function(remoteRenderTarget) {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        this.pass = new CompositorPass(camera, remoteRenderTarget);

        this.onResize();
    },

    onResize: function() {
        const sceneEl = this.sceneEl;
        const renderer = sceneEl.renderer;

        var rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        const pixelRatio = renderer.getPixelRatio();
        this.renderTarget.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        if (this.pass) {
            this.pass.setSize(pixelRatio * rendererSize.width, pixelRatio * rendererSize.height);
        }
    },

    closestKeyInDict: function(k, d, thres=10) {
        var result, minDist = Infinity;
        for (var key in d) {
            var dist = Math.abs(key - k);
            if (dist <= thres && dist <= minDist) {
                result = key;
                minDist = dist;
            }
        }

        return result;
    },

    tick: function(t, dt) {
        this.t = t;
        this.dt = dt;
    },

    bind: function() {
        const renderer = this.sceneEl.renderer;
        const render = renderer.render;
        const sceneEl = this.sceneEl;

        const scene = sceneEl.object3D;
        const camera = sceneEl.camera;

        const cameraEl = camera.el;
        const system = this;

        let isDigest = false;

        this.originalRenderFunc = render;

        this.sceneEl.object3D.onBeforeRender = function(renderer, scene, camera) {
            if (camera instanceof THREE.ArrayCamera) {
                system.cameras = camera.cameras;
            } else {
                system.cameras.push(camera);
            }
        }

        function decomposeProj(projMat) {
            const elements = projMat.elements;
            const x = elements[0] / 2;
            const a = elements[2] / 2;
            const y = elements[5];
            const b = elements[6];
            const c = elements[10];
            const d = elements[11];
            const e = elements[14];
            return [x,a,y,b,c,d,e];
        }

        let hasDualCameras, ipd, leftProj, rightProj;

        let currentXREnabled = renderer.xr.enabled;

        const isWebXRViewer = navigator.userAgent.includes('WebXRViewer');

        const cameraLPos = new THREE.Vector3();
        const cameraRPos = new THREE.Vector3();
        const sizeVector = new THREE.Vector2();
        let cameraLProj = new THREE.Matrix4();
        let cameraRProj = new THREE.Matrix4();
        renderer.render = function() {
            const size = renderer.getSize(sizeVector);
            if (isDigest) {
                // render "normally"
                render.apply(this, arguments);
            } else {
                isDigest = true;

                // save render state (1)
                const currentRenderTarget = this.getRenderTarget();
                if (currentRenderTarget != null) {
                    // resize if an existing rendertarget exists (usually in webxr mode)
                    system.pass.setSize(currentRenderTarget.width, currentRenderTarget.height);
                    system.renderTarget.setSize(currentRenderTarget.width, currentRenderTarget.height);
                }

                // store "normal" rendering output to this.renderTarget (2)
                this.setRenderTarget(system.renderTarget);
                render.apply(this, arguments);
                this.setRenderTarget(currentRenderTarget);

                const cameraVR = this.xr.getCamera();

                // save render state (3)
                currentXREnabled = this.xr.enabled;

                // disable xr
                if (this.xr.enabled === true) {
                    this.xr.enabled = false;
                }
                this.shadowMap.autoUpdate = false;

                // set camera parameters (transformation, projection) for ATW
                if (system.cameras.length == 2) {
                    // we have two cameras here (vr mode or headset ar mode)
                    hasDualCameras = !isWebXRViewer; // webarviewer seens to have 2 cameras, but uses one...

                    const cameraL = system.cameras[0];
                    const cameraR = system.cameras[1];
                    cameraLPos.setFromMatrixPosition( cameraL.matrixWorld );
                    cameraRPos.setFromMatrixPosition( cameraR.matrixWorld );
                    ipd = cameraLPos.distanceTo( cameraRPos );

                    cameraLProj.copy(cameraL.projectionMatrix);
                    cameraRProj.copy(cameraR.projectionMatrix);

                    leftProj = decomposeProj(cameraLProj.transpose());
                    rightProj = decomposeProj(cameraRProj.transpose());

                    system.pass.setCameraMats(cameraL, cameraR);

                    AFRAME.utils.entity.setComponentProperty(sceneEl, 'arena-hybrid-render-client', {
                        hasDualCameras: hasDualCameras,
                        ipd: ipd,
                        leftProj: leftProj,
                        rightProj: rightProj,
                    });
                } else if (system.cameras.length == 1) {
                    // we just have a single xr camera here
                    hasDualCameras = false;

                    system.pass.setCameraMats(camera);
                } else {
                    // not in xr mode, just one camera
                    hasDualCameras = false;

                    system.pass.setCameraMats(camera);
                }

                let currFrameID = system.pass.getFrameID(this, currentRenderTarget, system.renderTarget);
                // console.log(sceneEl.components['arena-hybrid-render-client'].frameID, currFrameID);
                currFrameID = system.closestKeyInDict(currFrameID, system.prevFrames);
                if (currFrameID) {
                    const currFrame = system.prevFrames[currFrameID];
                    // const currTime = performance.now();
                    // const frameTimestamp = currFrame.ts;
                    // console.log("[frame id]", currTime - frameTimestamp);

                    // console.log(currFrameID, system.prevcurrFrameID);
                    if (currFrameID >= system.prevFrameID) {
                        const pose = currFrame.pose;
                        if (pose.length === 2) {
                            const cameraL = cameraVR.cameras[0];
                            const cameraR = cameraVR.cameras[1];
                            const poseL = pose[0];
                            const poseR = pose[1];
                            system.pass.setCameraMatsRemote(poseL, cameraL.projectionMatrix,
                                                            poseR, cameraR.projectionMatrix);
                        } else {
                            system.pass.setCameraMatsRemote(pose, camera.projectionMatrix);
                        }
                    }

                    for (var i = currFrameID; i > 0; i--) {
                        delete system.prevFrames[i]; // remove entry with frameID
                    }
                    system.prevFrameID = currFrameID;
                }

                // (4) render with custom shader (local-remote compositing):
                // this will internally call renderer.render(), which will execute the code within
                // the isDigest conditional above (render normally). this will copy the result of
                // the rendering to the readbuffer in the compositor (aka this.renderTarget), which we
                // will use for the "local" frame.
                // the composer will take the "local" frame and merge it with the "remote" frame from
                // the video by calling the compositor pass and executing the shaders.
                system.pass.render(this, currentRenderTarget, system.renderTarget);

                // restore render state
                this.setRenderTarget(currentRenderTarget);
                this.xr.enabled = currentXREnabled;

                system.pass.setHasDualCameras(hasDualCameras);

                sceneEl.setAttribute('arena-hybrid-render-client', 'hasDualCameras', hasDualCameras);

                // call this part of the conditional again on the next call to render()
                isDigest = false;

                system.cameras = [];
            }
        };
    },

    unbind: function() {
        const renderer = this.sceneEl.renderer;
        renderer.render = this.originalRenderFunc;
        this.sceneEl.object3D.onBeforeRender = () => {};
    },
});
