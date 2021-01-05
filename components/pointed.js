AFRAME.registerComponent('pointed', {
    dependencies: ['material'],
    init: function() {
        const self = this;
        const el = this.el;
        const data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        if (object) {
            const geometry = object.geometry.clone();
            const material = new THREE.PointsMaterial({
                color: 0xFFFFFF,
                size: 0.01,
            });
            const mesh = new THREE.Points(geometry, material);
            el.setObject3D('pointed', mesh);
            el.removeObject3D('mesh');
        }
    },
});
