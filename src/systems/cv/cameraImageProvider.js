import { ARENAUtils } from '../../utils';

// TODO: refactor various API helpers
// import { WebXRRawCameraCaptureHelper } from './capture-helpers/webxr-raw-camera-helper.js';
// import { WebARViewerCaptureHelper } from './capture-helpers/webar-viewer-helper.js';
// import { GetUserMediaCaptureHelper } from './capture-helpers/getusermedia-helper.js';

/**
 * Provides camera images synchronized with the WebXR frame loop
 * to registered CV Processors. Handles different camera access APIs
 * via dedicated Capture Helper classes.
 */
export default class CameraImageProvider {
    /**
     * @param {XRSession} xrSession The active WebXR session (can be null if API doesn't require it initially).
     * @param {WebGLRenderingContext} glContext The WebGL rendering context.
     * @param {XRReferenceSpace} xrRefSpace The XR reference space (can be null initially).
     * @param {AFRAME.Entity} aframeCameraEl The A-Frame camera entity (e.g., document.querySelector('a-camera')).
     * @param {object} [options] Optional parameters.
     * @param {boolean} [options.debug=false] Enable debug logging.
     */
    constructor(xrSession, glContext, xrRefSpace, aframeCameraEl, options = {}) {
        /*
            NOTE: xrSession and xrRefSpace can be initially null for APIs like getUserMedia
            that might start before an XR session or operate independently.
        */
        this.xrSession = xrSession;
        this.gl = glContext; // Required for WebXR Raw Camera and potentially others
        this.xrRefSpace = xrRefSpace;
        this.aframeCameraEl = aframeCameraEl; // Crucial for manual pose capture with GUM

        if (!this.aframeCameraEl) {
            console.warn(
                'CameraImageProvider: A-Frame camera element not provided. Pose capture for some APIs may fail.'
            );
        }

        this.options = { debug: false, ...options };

        this.processors = new Set();
        this.activeApiName = null; // String identifier like 'webxr-raw-camera'
        this.captureHelper = null; // Instance of the active capture helper class
        this.isCapturing = false;
        this.isPipelineBusy = false;

        // WebGL resources for specific APIs (e.g., WebXR Raw Camera)
        this.fb = null; // Framebuffer, created if WebXR Raw Camera is used

        this._onXRFrame = this._onXRFrame.bind(this); // For XR session-driven updates
        this._onGUMFrame = this._onGUMFrame.bind(this); // For getUserMedia-driven updates

        // Attempt to detect and initialize the camera API
        this._detectAndInitializeApi(); // This sets this.activeApiName synchronously

        if (this.gl && this.activeApiName === 'webxr-raw-camera') {
            this.gl.makeXRCompatible().catch((err) => {
                console.error('CameraImageProvider: Could not make gl context XR compatible!', err);
                // This might affect usability of the glBinding
                this._handleApiInitializationError('GL context not XR compatible');
            });
        }
    }

    /**
     * Detects the most suitable camera API and initializes its capture helper.
     * @private
     */
    _detectAndInitializeApi() {
        console.log('CameraImageProvider: Detecting camera API...');

        // TODO: detect logic

        try {
            if (ARENAUtils.isWebXRViewer() && this.xrSession) {
                // 1. WebXRViewer/WebARViewer (custom iOS browser)
                this.activeApiName = 'webxr-viewer';
                // Example: this.captureHelper = new WebARViewerCaptureHelper(this.xrSession, this.aframeCameraEl, this.options);
                // if (this.captureHelper.isSupported && this.captureHelper.init()) {
                //     console.info(`CameraImageProvider: Initialized ${this.activeApiName}.`);
                //     return;
                // } else { this.activeApiName = null; this.captureHelper = null; console.warn(`Failed to init ${this.activeApiName}`);}
                console.warn('CameraImageProvider: WebXRViewerCaptureHelper not fully implemented in this stub.');
                // Fall-through if conceptual helper "fails" or not implemented
            }

            const detectedHeadset = ARENAUtils.detectARHeadset();
            if (detectedHeadset !== 'unknown' && !this.activeApiName) {
                // Check !this.activeApiName to ensure priority
                // 2. AR Headset (using getUserMedia)
                this.activeApiName = 'ar-headset-gum';
                // Example: this.captureHelper = new GetUserMediaCaptureHelper(this.aframeCameraEl, { ...this.options, isHeadset: true });
                // if (this.captureHelper.isSupported && this.captureHelper.init()) {
                //    console.info(`CameraImageProvider: Initialized ${this.activeApiName}.`);
                //    return;
                // } else { this.activeApiName = null; this.captureHelper = null; console.warn(`Failed to init ${this.activeApiName}`);}
                console.warn('CameraImageProvider: ARHeadsetCaptureHelper (GUM) not fully implemented in this stub.');
                // Fall-through
            }

            if (this.xrSession && window.XRWebGLBinding && this.gl && !this.activeApiName) {
                // 3. WebXR Raw Camera Access API
                // Ensure framebuffer is created for this API
                if (!this.fb) this.fb = this.gl.createFramebuffer(); // Create if not exists
                // Example: this.captureHelper = new WebXRRawCameraCaptureHelper(this.xrSession, this.gl, this.fb, this.options);
                // if (this.captureHelper.isSupported && this.captureHelper.init()) {
                //     this.activeApiName = 'webxr-raw-camera';
                //     console.info(`CameraImageProvider: Initialized ${this.activeApiName} via helper.`);
                //     return;
                // } else { this.captureHelper = null; if(this.fb) {this.gl.deleteFramebuffer(this.fb); this.fb = null;} console.warn(`Failed to init WebXRRawCameraCaptureHelper`);}

                // Simplified direct use for now for WebXR Raw Camera (as per previous version)
                console.warn(
                    'CameraImageProvider: WebXRRawCameraCaptureHelper not fully implemented in this stub. Using simplified direct path.'
                );
                try {
                    if (!this.glBinding) this.glBinding = new window.XRWebGLBinding(this.xrSession, this.gl);
                    if (this.glBinding && this.glBinding.getCameraImage) {
                        this.activeApiName = 'webxr-raw-camera'; // Set activeApiName here
                        console.info(
                            `CameraImageProvider: Initialized ${this.activeApiName} (simplified direct path).`
                        );
                        // No separate helper needed for this simplified path, logic in _getWebXRRawCameraImageData
                        return; // Successfully initialized
                    }
                } catch (bindingError) {
                    console.warn('CameraImageProvider: XRWebGLBinding failed for simplified path.', bindingError);
                    if (this.fb) {
                        this.gl.deleteFramebuffer(this.fb);
                        this.fb = null;
                    } // Clean up framebuffer if binding failed
                }
                // If we reached here, simplified path failed
                this.activeApiName = null;
            }

            // 4. Fallback to generic getUserMedia (WebAR)
            if (!this.activeApiName) {
                // Only if nothing else was chosen
                // Example: this.captureHelper = new GetUserMediaCaptureHelper(this.aframeCameraEl, this.options);
                // if (this.captureHelper.isSupported && this.captureHelper.init()) {
                //    this.activeApiName = 'webar-gum';
                //    console.info(`CameraImageProvider: Initialized ${this.activeApiName} (fallback).`);
                //    return;
                // } else { this.activeApiName = null; this.captureHelper = null; console.warn(`Failed to init ${this.activeApiName} fallback`);}
                console.warn(
                    'CameraImageProvider: WebARCaptureHelper (GUM fallback) not fully implemented in this stub.'
                );
                this.activeApiName = 'webar-gum'; // Tentatively set, actual helper init would confirm
            }
        } catch (error) {
            this._handleApiInitializationError(error.message, error);
            return; // Exit on construction error during detection
        }

        // Final check after all attempts
        if (!this.activeApiName && !this.captureHelper) {
            // If using simplified path, activeApiName is the key. If using helpers, captureHelper is.
            // For simplified path, activeApiName would be set if successful.
            // For helpers, activeApiName would be set AND captureHelper would be instantiated.
            // This condition means neither path succeeded.
            this._handleApiInitializationError('No suitable camera API could be initialized after all checks.');
        } else if (this.activeApiName && !this.captureHelper && this.activeApiName !== 'webxr-raw-camera') {
            // This case implies an API was named but its helper wasn't actually instantiated (due to stubbed logic)
            // For a real implementation, this would be an error or the API name wouldn't be set.
            console.warn(
                `CameraImageProvider: API '${this.activeApiName}' selected, but no capture helper instance created (likely due to stubbed implementation).`
            );
            // Potentially: this._handleApiInitializationError(`Helper for ${this.activeApiName} not created.`);
        } else if (this.captureHelper) {
            console.info(`CameraImageProvider: Final active API: ${this.activeApiName} with capture helper.`);
        } else if (this.activeApiName === 'webxr-raw-camera') {
            console.info(`CameraImageProvider: Final active API: ${this.activeApiName} (simplified direct path).`);
        }
    }

    _handleApiInitializationError(message, errorObj = null) {
        console.error(`CameraImageProvider: API Initialization Failed - ${message}`, errorObj || '');
        this.activeApiName = null;
        this.captureHelper = null;
        // The system wrapper will check activeApiName and emit 'camera-provider-failed'.
    }

    registerProcessor(processor) {
        if (typeof processor.processImage !== 'function') {
            console.error(
                'CameraImageProvider: Processor must implement processImage(imageData, metadata) that returns a Promise.'
            );
            return;
        }
        this.processors.add(processor);

        if (this.activeApiName || this.captureHelper) {
            if (!this.isCapturing && this.processors.size > 0) {
                console.log(
                    `CameraImageProvider: First processor registered with active API ('${this.activeApiName}'). Starting capture loop.`
                );
                this._startCaptureLoop();
            } else {
                console.log(
                    `CameraImageProvider: Processor registered. API ('${this.activeApiName}') active. Capture loop already running or no processors.`
                );
            }
        } else {
            console.log(
                'CameraImageProvider: Processor registered, but no camera API is active yet. Capture loop will not start.'
            );
        }
    }

    unregisterProcessor(processor) {
        this.processors.delete(processor);
        if (this.isCapturing && this.processors.size === 0) {
            this._stopCaptureLoop();
        }
    }

    _startCaptureLoop() {
        // Condition to start: capturing not already started, AND (an API name is set OR a helper exists)
        if (this.isCapturing || !(this.activeApiName || this.captureHelper)) {
            console.warn(
                `CameraImageProvider: Start loop called but conditions not met. Capturing: ${this.isCapturing}, API: ${this.activeApiName}, Helper: ${!!this.captureHelper}`
            );
            return;
        }
        this.isCapturing = true;
        console.info(
            `CameraImageProvider: Starting capture loop for API: ${this.activeApiName || 'N/A (using helper)'}.`
        );

        // NOTE: Frame loop depends on the API type
        if (this.activeApiName === 'webxr-raw-camera' || (this.captureHelper && this.captureHelper.usesXRFrame)) {
            // Helper indicates if it uses xrSession.rAF
            if (this.xrSession) {
                this.xrSession.requestAnimationFrame(this._onXRFrame);
            } else {
                console.error(
                    `CameraImageProvider: XR session not available for API '${this.activeApiName}'. Cannot start XR frame loop.`
                );
                this.isCapturing = false; // Abort starting
            }
        } else if (
            this.activeApiName === 'ar-headset-gum' ||
            this.activeApiName === 'webar-gum' ||
            (this.captureHelper && !this.captureHelper.usesXRFrame)
        ) {
            // Assumes GUM or other helpers not tied to xrSession.rAF will use window.rAF
            // if (this.captureHelper && typeof this.captureHelper.startStreaming === 'function') {
            //     this.captureHelper.startStreaming(); // If helper needs explicit start
            // }
            window.requestAnimationFrame(this._onGUMFrame);
        } else {
            console.warn('CameraImageProvider: No active API or suitable helper to start capture loop for.');
            this.isCapturing = false; // Abort starting
        }
    }

    _stopCaptureLoop() {
        if (!this.isCapturing) return;
        this.isCapturing = false; // This flag will stop the rAF callbacks from proceeding
        console.info(`CameraImageProvider: Stopping capture loop for API: ${this.activeApiName || 'N/A'}.`);
        // if (this.captureHelper && typeof this.captureHelper.stopStreaming === 'function') {
        //     this.captureHelper.stopStreaming();
        // }
    }

    /**
     * Frame callback for XR session-driven APIs.
     */
    async _onXRFrame(time, frame) {
        if (!this.isCapturing || !this.xrSession) {
            // Check xrSession still valid
            this.isCapturing = false;
            return;
        }
        this.xrSession.requestAnimationFrame(this._onXRFrame); // Request next frame

        if (this.processors.size === 0 || this.isPipelineBusy) {
            if (this.isPipelineBusy && this.options.debug) {
                console.log('CameraImageProvider: Pipeline busy, XR frame dropped.');
            }
            return;
        }

        const pose = frame.getViewerPose(this.xrRefSpace);
        if (!pose) {
            if (this.options.debug) console.warn('CameraImageProvider: No viewer pose for XR frame.');
            return;
        }

        let acquiredFrameData = null;
        try {
            if (this.activeApiName === 'webxr-raw-camera' && !this.captureHelper) {
                // Using simplified direct path
                for (const view of pose.views) {
                    if (view.camera) {
                        acquiredFrameData = this._getWebXRRawCameraImageData(time, pose, view);
                        break;
                    }
                }
            } else if (this.captureHelper && typeof this.captureHelper.getFrameData === 'function') {
                // Assumes helpers using xrSession rAF will use frame and pose
                acquiredFrameData = await this.captureHelper.getFrameData(time, frame, pose);
            }
        } catch (error) {
            console.error(`CameraImageProvider: Error in getFrameData for ${this.activeApiName || 'helper'}:`, error);
            return; // Skip frame on error
        }

        if (acquiredFrameData) {
            this._distributeFrameToProcessors(acquiredFrameData.imageData, acquiredFrameData.metadata);
        } else if (this.options.debug && this.activeApiName === 'webxr-raw-camera') {
            // console.log('CameraImageProvider: No view with camera found or image acquisition failed for WebXR Raw Camera.');
        }
    }

    /**
     * Frame callback for getUserMedia-driven APIs (using window.rAF).
     */
    async _onGUMFrame(time) {
        if (!this.isCapturing) return;
        window.requestAnimationFrame(this._onGUMFrame); // Continue GUM loop

        if (this.processors.size === 0 || this.isPipelineBusy) {
            if (this.isPipelineBusy && this.options.debug) {
                console.log('CameraImageProvider: Pipeline busy, GUM frame dropped.');
            }
            return;
        }

        let acquiredFrameData = null;
        try {
            if (this.captureHelper && typeof this.captureHelper.getFrameData === 'function') {
                // GUM helpers might just need timestamp, or can derive pose internally using this.aframeCameraEl
                acquiredFrameData = await this.captureHelper.getFrameData(time);
            }
        } catch (error) {
            console.error(
                `CameraImageProvider: Error in GUM getFrameData for ${this.activeApiName || 'helper'}:`,
                error
            );
            return; // Skip frame on error
        }

        if (acquiredFrameData) {
            this._distributeFrameToProcessors(acquiredFrameData.imageData, acquiredFrameData.metadata);
        }
    }

    _distributeFrameToProcessors(imageData, metadata) {
        if (!imageData || !metadata) {
            if (this.options.debug) console.warn('CameraImageProvider: No image data or metadata to distribute.');
            return;
        }

        this.isPipelineBusy = true;
        const processingPromises = [];
        for (const processor of this.processors) {
            processingPromises.push(
                processor.processImage(imageData, metadata).catch((err) => {
                    console.error(
                        'CameraImageProvider: Error in a processor:',
                        processor.constructor ? processor.constructor.name : 'UnknownProcessor',
                        err
                    );
                    return null; // Ensure Promise.all().finally() still runs
                })
            );
        }

        Promise.all(processingPromises).finally(() => {
            this.isPipelineBusy = false;
        });
    }

    // NOTE: This method is now specific to the simplified WebXR Raw Camera path.
    //        Ideally, this logic would also move into a WebXRRawCameraCaptureHelper class. */
    _getWebXRRawCameraImageData(time, viewerPose, view) {
        const { camera } = view; // XRCamera
        const glLayer = this.xrSession.renderState.baseLayer; // XRWebGLLayer

        if (!this.framePixels || this.frameWidth !== camera.width || this.frameHeight !== camera.height) {
            this.frameWidth = camera.width;
            this.frameHeight = camera.height;
            // Ensure width and height are positive before allocating
            if (this.frameWidth <= 0 || this.frameHeight <= 0) {
                console.warn(
                    `CameraImageProvider: Invalid frame dimensions for WebXR Raw Camera: ${this.frameWidth}x${this.frameHeight}`
                );
                return null;
            }
            this.framePixels = new Uint8ClampedArray(this.frameWidth * this.frameHeight * 4); // RGBA
            const cameraViewport = { width: this.frameWidth, height: this.frameHeight, x: 0, y: 0 };
            this.frameCameraIntrinsics = this._calculateCameraIntrinsics(view.projectionMatrix, cameraViewport);
            if (!this.frameCameraIntrinsics) {
                console.error('CameraImageProvider: Failed to calculate camera intrinsics for WebXR Raw Camera.');
                return null;
            }
        }

        const texture = this.glBinding.getCameraImage(camera);
        if (!texture) {
            // if (this.options.debug) console.log('CameraImageProvider: getCameraImage returned null texture.');
            return null; // This can happen, not necessarily an error.
        }

        const currentFramebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb); // fb should have been created if this path is active
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error(`CameraImageProvider: Framebuffer incomplete (WebXR Raw): ${status}.`);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, currentFramebuffer);
            return null;
        }
        this.gl.readPixels(
            0,
            0,
            this.frameWidth,
            this.frameHeight,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.framePixels
        );
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, currentFramebuffer);

        const imageData = {
            buffer: this.framePixels,
            width: this.frameWidth,
            height: this.frameHeight,
            format: 'RGBA',
        };

        // Construct world pose for this view
        const viewWorldMatrix = new THREE.Matrix4();
        // Ensure THREE is available or pass it in/import it
        if (typeof THREE !== 'undefined' && viewerPose && view && viewerPose.transform && view.transform) {
            const viewerMatrix = new THREE.Matrix4().fromArray(viewerPose.transform.matrix);
            const viewMatrix = new THREE.Matrix4().fromArray(view.transform.matrix);
            viewWorldMatrix.multiplyMatrices(viewerMatrix, viewMatrix);
        } else if (this.aframeCameraEl && this.aframeCameraEl.object3D) {
            // Fallback if somehow viewerPose/view is not ideal
            console.warn('CameraImageProvider: Using A-Frame camera fallback for WebXR Raw Camera pose.');
            this.aframeCameraEl.object3D.updateMatrixWorld(true); // Ensure matrix is up-to-date
            viewWorldMatrix.copy(this.aframeCameraEl.object3D.matrixWorld);
        } else {
            console.error('CameraImageProvider: Cannot determine world pose for WebXR Raw Camera.');
            // Return null or a default matrix? For now, let it proceed, metadata.worldPose might be identity.
        }

        const metadata = {
            timestamp: time,
            worldPose: viewWorldMatrix, // THREE.Matrix4
            cameraIntrinsics: this.frameCameraIntrinsics,
            projectionMatrix: new Float32Array(view.projectionMatrix), // Ensure it's a copy
            viewTransformMatrix:
                view && view.transform ? new THREE.Matrix4().fromArray(view.transform.matrix) : new THREE.Matrix4(), // Relative to viewer
        };
        return { imageData, metadata };
    }

    _calculateCameraIntrinsics(projectionMatrixArray, viewport) {
        const p = projectionMatrixArray;
        if (!p || p.length < 16 || !viewport) {
            console.error('CameraImageProvider: Invalid input for _calculateCameraIntrinsics.');
            return null;
        }
        // Standard perspective projection matrix elements
        // P = [ fx  0 cx 0 ]
        //     [  0 fy cy 0 ]
        //     [  0  0  A B ]
        //     [  0  0 -1 0 ] (for OpenGL right-handed, looking down -Z)
        // fx = P[0] * viewport.width / 2
        // fy = P[5] * viewport.height / 2
        // cx = (P[8] + 1) * viewport.width / 2 + viewport.x  (P[8] is m31)
        // cy = (P[9] + 1) * viewport.height / 2 + viewport.y (P[9] is m32)
        // These calculations can vary slightly based on NDC conventions (e.g. P[8] vs (1-P[8]))
        // The version from ccwebxr.js was:
        // fx: (viewport.width / 2) * p[0],
        // fy: (viewport.height / 2) * p[5],
        // cx: ((1 - p[8]) * viewport.width) / 2 + viewport.x,
        // cy: ((1 - p[9]) * viewport.height) / 2 + viewport.y,
        // gamma: (viewport.width / 2) * p[4], // p[4] is skew, usually 0
        // Let's stick to the previously used one for consistency for now.
        return {
            fx: (viewport.width / 2) * p[0],
            fy: (viewport.height / 2) * p[5],
            cx: ((1 - p[8]) * viewport.width) / 2 + viewport.x,
            cy: ((1 - p[9]) * viewport.height) / 2 + viewport.y,
            gamma: (viewport.width / 2) * p[4], // Skew factor
        };
    }

    destroy() {
        console.info('CameraImageProvider: Destroying...');
        this._stopCaptureLoop(); // Stops rAF loops
        if (this.captureHelper && typeof this.captureHelper.destroy === 'function') {
            this.captureHelper.destroy();
        }
        this.processors.clear();
        if (this.fb) {
            if (this.gl) this.gl.deleteFramebuffer(this.fb); // Check gl exists
            this.fb = null;
        }
        this.glBinding = null;
        this.xrSession = null;
        // this.gl = null; // GL context is owned by A-Frame renderer, don't nullify here
        this.xrRefSpace = null;
        this.aframeCameraEl = null;
        this.isPipelineBusy = false;
        this.framePixels = null;
        this.captureHelper = null;
        this.activeApiName = null;
    }
}
