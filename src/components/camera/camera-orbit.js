import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { ARENAUtils } from '../../utils';

AFRAME.registerComponent('camera-orbit', {
    schema: {
        enabled: { type: 'boolean', default: true },
        distance: { type: 'number', default: -1 },
        target: { type: 'selector' },
        rotateSpeed: { type: 'number', default: 1 },
    },
    init() {
        if (!this.data.target) {
            console.error('camera-orbit: target not defined');
            return;
        }
        this.setDistance = this.setDistance.bind(this);
        if (this.data.distance === -1) {
            // Automatically determine distance from target based on target's bounding box.
            this.bbox = new THREE.Box3();
            this.bbox.setFromObject(this.data.target.object3D);
            this.size = new THREE.Vector3();
            this.bbox.getSize(this.size);
            // If there is no primitive geometry, defer distance calc until model-loaded
            if (this.size.length() === 0) {
                this.data.target.addEventListener('model-loaded', this.setDistance);
            } else {
                this.setDistance();
            }
        } else {
            this.attachCamera();
        }
    },
    setDistance() {
        this.bbox.setFromObject(this.data.target.object3D);
        this.bbox.getSize(this.size);
        if (this.size.length() !== 0) {
            // If still none, give up
            const largestDimension = Math.max(this.size.x, this.size.y, this.size.z);
            const { camera } = AFRAME.scenes[0];
            const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
            const distance = largestDimension / 2 / Math.tan(fovInRadians / 2);
            this.data.distance = distance / (window.innerWidth / window.innerHeight);
        }
        this.attachCamera();
    },
    attachCamera() {
        const {
            sceneEl: { camera },
            sceneEl,
        } = this.el;

        this.controls = new OrbitControls(camera, sceneEl.renderer.domElement);
        this.controls.enableDamping = true; // Smooth motion
        this.controls.autoRotate = true; // Enable auto-rotation
        this.controls.autoRotateSpeed = this.data.rotateSpeed; // Rotation speed

        const targetPos = new THREE.Vector3();
        targetPos.setFromMatrixPosition(this.data.target.object3D.matrixWorld);

        this.controls.target.copy(targetPos);

        targetPos.y += this.size.y / 2; // Center on top of target
        targetPos.z += this.data.distance;
        camera.position.copy(targetPos);
        camera.updateMatrixWorld();

        this.attached = true;
    },
    tick() {
        if (this.data.enabled && this.attached) {
            this.controls.update();
        }
    },
});
