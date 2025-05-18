import CameraImageProvider from './cameraImageProvider'; // Import the CameraImageProvider class

/**
 * A-Frame System wrapper for the CameraImageProvider class.
 * Ensures a single instance is created and manages its lifecycle
 * tied to the AR session. Allows processors to register at any time,
 * queuing them if the provider is not yet initialized.
 */
AFRAME.registerSystem('camera-image-provider', {
    schema: {
        debug: { type: 'boolean', default: false },
        // Add other configuration options for the provider here if needed later
    },

    init() {
        const { sceneEl } = this;
        this.providerInstance = null; // Holds the CameraImageProvider class instance
        this.pendingProcessors = new Set();
        this.isProviderInitialized = false; // Track if 'camera-provider-initialized' has been emitted

        this._onEnterVR = this._onEnterVR.bind(this);
        this._onExitVR = this._onExitVR.bind(this);
        this._destroyProviderInstance = this._destroyProviderInstance.bind(this);
        this.registerProcessor = this.registerProcessor.bind(this);
        this.unregisterProcessor = this.unregisterProcessor.bind(this);
        this.getProviderInstance = this.getProviderInstance.bind(this);

        sceneEl.addEventListener('enter-vr', this._onEnterVR);
        sceneEl.addEventListener('exit-vr', this._onExitVR);

        console.log('CameraImageProvider System: Initialized.');
    },

    _onEnterVR() {
        const { sceneEl } = this;
        if (sceneEl.is('ar-mode') && sceneEl.xrSession) {
            if (this.providerInstance) {
                // Provider exists, likely previous session start w/o full exit/remove. Flush pending processors
                if (!this.isProviderInitialized) {
                    // Should not happen
                    console.warn(
                        'CameraImageProvider System: Enter AR w/ existing provider not initialized. Forcing init.'
                    );
                    this.isProviderInitialized = true; // Mark as initialized
                    this.el.emit('camera-provider-initialized', { provider: this.providerInstance }, false);
                }
                this._flushPendingProcessors(); // Process any queued processors
                return;
            }

            const { xrSession, renderer } = sceneEl;
            const glContext = renderer.getContext();
            const xrRefSpace = renderer.xr.getReferenceSpace();
            const aframeCameraEl = sceneEl.camera.el; // Get the active A-Frame camera

            if (!glContext || !xrRefSpace) {
                const reason = 'Missing GL context or XR reference space for CameraImageProvider.';
                console.error(`CameraImageProvider System: ${reason}`);
                this.el.emit('camera-provider-failed', { reason }, false);
                this.isProviderInitialized = false;
                return;
            }

            console.log('CameraImageProvider System: AR session detected. Attempting to create provider instance.');

            try {
                const providerOptions = { debug: this.data.debug };
                const potentialProvider = new CameraImageProvider(
                    xrSession,
                    glContext,
                    xrRefSpace,
                    aframeCameraEl,
                    providerOptions
                );

                if (potentialProvider.activeApiName || potentialProvider.captureHelper) {
                    this.providerInstance = potentialProvider;
                    this.isProviderInitialized = true; // Mark as initialized
                    console.log(
                        `CameraImageProvider System: Provider instance successfully created. Active API: ${this.providerInstance.activeApiName || 'N/A (using helper)'}.`
                    );
                    this.el.emit('camera-provider-initialized', { provider: this.providerInstance }, false);
                    this._flushPendingProcessors(); // Register any queued processors now
                } else {
                    const reason =
                        'Provider class created, but no suitable camera API was found/initialized internally.';
                    console.error(`CameraImageProvider System: ${reason}`);
                    potentialProvider.destroy(); // Clean up partially initialized provider
                    this.el.emit('camera-provider-failed', { reason }, false);
                    this.isProviderInitialized = false; // Explicitly false
                }
            } catch (error) {
                const reason = error.message || 'Provider class instantiation error';
                console.error(`CameraImageProvider System: Failed to instantiate CameraImageProvider class.`, error);
                this.providerInstance = null;
                this.el.emit('camera-provider-failed', { reason }, false);
                this.isProviderInitialized = false; // Explicitly false
            }
        } else {
            this._destroyProviderInstance(); // Not AR mode or no session
        }
    },

    _flushPendingProcessors() {
        if (this.providerInstance && this.pendingProcessors.size > 0) {
            console.log(`CameraImageProvider System: Flushing ${this.pendingProcessors.size} pending processors.`);
            this.pendingProcessors.forEach((processor) => {
                this.providerInstance.registerProcessor(processor);
            });
            this.pendingProcessors.clear();
        }
    },

    _onExitVR() {
        this._destroyProviderInstance();
        this.isProviderInitialized = false; // Reset initialization state
    },

    remove() {
        const { sceneEl } = this;
        this._destroyProviderInstance();
        sceneEl.removeEventListener('enter-vr', this._onEnterVR);
        sceneEl.removeEventListener('exit-vr', this._onExitVR);
        this.pendingProcessors.clear();
        this.isProviderInitialized = false;
    },

    _destroyProviderInstance() {
        if (this.providerInstance) {
            console.log('CameraImageProvider System: Destroying provider instance.');
            this.providerInstance.destroy();
            this.providerInstance = null;
            // Don't clear pendingProcessors here, they might be for a future session if the system isn't removed.
            // isProviderInitialized is reset in onExitVR or remove.
            this.el.emit('camera-provider-destroyed', {}, false);
        }
    },

    registerProcessor(processor) {
        if (!processor || typeof processor.processImage !== 'function') {
            console.error('CameraImageProvider System: Attempted to register invalid processor.', processor);
            return;
        }

        if (this.providerInstance && this.isProviderInitialized) {
            // Provider is ready, register directly
            console.log('CameraImageProvider System: Provider active, registering processor directly.');
            this.providerInstance.registerProcessor(processor);
        } else {
            // Provider not ready, queue the processor
            console.log('CameraImageProvider System: Provider not active/initialized. Queuing processor.');
            this.pendingProcessors.add(processor);
        }
    },

    unregisterProcessor(processor) {
        if (this.pendingProcessors.has(processor)) {
            this.pendingProcessors.delete(processor);
            console.log('CameraImageProvider System: Unregistered processor from pending queue.');
        }

        if (this.providerInstance) {
            this.providerInstance.unregisterProcessor(processor);
        }
    },

    getProviderInstance() {
        return this.providerInstance;
    },
});
