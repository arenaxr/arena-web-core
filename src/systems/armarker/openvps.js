/* global AFRAME, ARENA, Swal, THREE */

import { ARENA_EVENTS } from '../../constants';

AFRAME.registerComponent('openvps', {
    schema: {
        enabled: { type: 'boolean', default: false },
        imageUrl: { type: 'string', default: '' },
        meshUrl: { type: 'string', default: '' },
        interval: { type: 'number', default: 5000 },
        confirmed: { type: 'boolean', default: false },
        imgQuality: { type: 'number', default: 0.8 },
        imgType: { type: 'string', default: 'image/png' },
    },
    init() {
        const { el: sceneEl } = this;
        // Check localStorage if always-allowed to use OpenVPS for this URL
        this.openvpsAllowedList = JSON.parse(localStorage.getItem('openvpsAllowedList')) || [];
        if (!this.openvpsAllowedList.includes(this.data.imageUrl)) {
            this.confirmPermission();
        } else {
            this.data.enabled = true;
        }

        this.webXRSessionStarted = this.webXRSessionStarted.bind(this);
        this.webXrSessionEnded = this.webXrSessionEnded.bind(this);
        sceneEl.addEventListener('enter-vr', this.webXRSessionStarted);
        sceneEl.addEventListener('exit-vr', this.webXrSessionEnded);

        this.tick = AFRAME.utils.throttleTick(this.tick, this.data.interval, this);

        // Set ccwebxr needOffscreenCanvas to true
        this.updateCaptureCanvas = undefined;
        ARENA.events.addEventListener(ARENA_EVENTS.CV_INITIALIZED, () => {
            const cameracapture = sceneEl.systems.armarker?.cameraCapture;
            this.updateCaptureCanvas = cameracapture?.updateOffscreenCanvas;
        });

        this.cameraCanvas = undefined;
        this.cameraEl = document.getElementById('my-camera');
        this.webxrActive = false;
        // Use offscreen canvas to flip the camera image, not mutate original canvas
        this.flipOffscreenCanvas = new OffscreenCanvas(1, 1);
        this.flipHorizontal = false;
        this.flipVertical = false;
        this.origRigMatrix = new THREE.Matrix4();
        this.solutionMatrix = new THREE.Matrix4();
        this.newRigMatrix = new THREE.Matrix4();
        this.scaleVector = new THREE.Vector3(1, 1, 1);
    },

    webXRSessionStarted() {
        this.webxrActive = true;
        this.sessionMaxConfidence = 0;
    },

    webXrSessionEnded() {
        this.webxrActive = false;
    },

    tick() {
        if (!this.data.enabled || !this.data.imageUrl || !this.webxrActive) return;
        this.uploadImage().then(() => {
            // Some indicator?
        });
    },

    confirmPermission() {
        const { el: sceneEl, data, openvpsAllowedList } = this;
        Swal.fire({
            title: 'OpenVPS',
            html: `This scene is requesting to use OpenVPS to localize your position to see AR content. This will
                   <strong>capture and send camera images from your phone</strong> to the OpenVPS server:<br/>
                   ${data.imageUrl}.`,
            icon: 'question',
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'Allow',
            cancelButtonText: 'Deny',
            input: 'checkbox',
            inputPlaceholder: 'Always trust and allow for this server URL.',
        }).then((result) => {
            if (result.isConfirmed) {
                if (result.value) {
                    // Save this URL to localStorage
                    this.openvpsAllowedList.push(this.data.imageUrl);
                    localStorage.setItem('openvpsAllowedList', JSON.stringify(openvpsAllowedList));
                }
                this.data.confirmed = true;
            } else if (result.isDenied) {
                sceneEl.removeAttribute('openvps');
            }
        });
    },
    async uploadImage() {
        const { data, cameraEl, flipOffscreenCanvas, flipHorizontal, flipVertical } = this;

        const rig = document.getElementById('cameraRig').object3D;
        const spinner = document.getElementById('cameraSpinner').object3D;
        this.origRigMatrix.compose(rig.position, spinner.quaternion, this.scaleVector);

        // Call canvas update if exists
        if (this.updateCaptureCanvas) {
            if (!this.updateCaptureCanvas()) {
                console.error('Error updating captureCanvas canvas');
                return;
            }
        }
        const cameraCanvas = this.getCanvas();
        if (!cameraCanvas) {
            console.error('No camera image canvas found');
            return;
        }

        cameraEl.object3D.updateMatrixWorld(true);
        const matrixArray = cameraEl.object3D.matrixWorld.toArray(); // Do this close as possible to canvas image set

        flipOffscreenCanvas.width = cameraCanvas.width;
        flipOffscreenCanvas.height = cameraCanvas.height;
        const flipCtx = flipOffscreenCanvas.getContext('2d');
        flipCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1); // Flip the image horizontally and/or vertically

        flipCtx.drawImage(
            cameraCanvas,
            (flipHorizontal ? -1 : 0) * cameraCanvas.width, // Offset by -1 * width if flipHorizontal, otherwise 0
            (flipVertical ? -1 : 0) * cameraCanvas.height // Offset by -1 * height if flipVertical, otherwise 0
        );

        const imageBlob = await flipOffscreenCanvas.convertToBlob({ type: data.imgType, quality: data.imgQuality });

        const formData = new FormData();
        formData.append('image', imageBlob, 'image.jpeg');
        formData.append('aframe_camera_matrix_world', matrixArray);

        fetch(data.imageUrl, {
            method: 'POST',
            mode: 'cors',
            body: formData,
        })
            .then(async (response) => {
                if (!response.ok) {
                    console.error(`openVPS Server error response: ${response.status}`);
                } else {
                    const resJson = await response.json();
                    const now = new Date();
                    ARENA.debugXR(`New vps solution at ${now.toISOString()}, confidence: ${resJson.confidence}`);
                    if (resJson.confidence < this.sessionMaxConfidence) {
                        ARENA.debugXR('| Worse, ignoring', false);
                        return;
                    }
                    ARENA.debugXR('| Higher, relocalizing', false);
                    this.sessionMaxConfidence = resJson.confidence;
                    this.solutionMatrix.fromArray(resJson.arscene_pose).invert();
                    this.newRigMatrix.multiplyMatrices(this.solutionMatrix, this.origRigMatrix);
                    rig.position.setFromMatrixPosition(this.newRigMatrix);
                    spinner.quaternion.setFromRotationMatrix(this.newRigMatrix);
                }
            })
            .catch((error) => {
                console.error(`Error getting pose from openVPS server: ${error.message}. ImageBlob: ${imageBlob.size}`);
            });
    },
    getCanvas() {
        if (this.cameraCanvas) {
            return this.cameraCanvas;
        }
        // ccwebxr, xrbrowser,  arheadset, spotar canvases
        const cameraCapture = this.el.systems.armarker?.cameraCapture;
        if (cameraCapture?.canvas) {
            this.cameraCanvas = cameraCapture.canvas;
            this.flipVertical = !!cameraCapture.cvFlipVertical; // TODO: determine if we need horiz flip anywhere
            return this.cameraCanvas;
        }

        return undefined;
    },
});
