/**
 * The main user's camera. Abstraction for a variety of camera operations.
 */
class MyCamera {
    /**
     * Constructor
     * @param {string} name name of camera
     */
    constructor(name) {
        this.name = name;

        this.camEl = document.getElementById('my-camera');
        this.rig = document.getElementById('CameraRig'); // this is an <a-entity>
        this.spinner = document.getElementById('CameraSpinner'); // this is an <a-entity>

        this.color = '#' + Math.floor(Math.random() * 16777215).toString(16); // random color

        this.rotation = new THREE.Quaternion();
        this.position = new THREE.Vector3();

        this.vioRotation = new THREE.Quaternion();
        this.vioPosition = new THREE.Vector3();
        this.vioMatrix = new THREE.Matrix4();
    }

    /**
     * Converts camera attributes to ARENA camera message
     * @return {Object} JSON representing camera state
     */
    json() {
        const x = this.camEl.object3D.position.x;
        const y = this.camEl.object3D.position.y;
        const z = this.camEl.object3D.position.z;

        const _x = this.camEl.object3D.position.x;
        const _y = this.camEl.object3D.position.y;
        const _z = this.camEl.object3D.position.z;
        const _w = this.camEl.object3D.position.w;

        const json = {
            object_id: this.name,
            data: {
                object_type: 'camera',
                position: {
                    x: x,
                    y: y,
                    z: z,
                },
                rotation: {
                    x: _x,
                    y: _y,
                    z: _z,
                    w: _w,
                },
                color: color,
            },
        };
        return json;
    }
}
