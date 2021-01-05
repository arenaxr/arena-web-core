AFRAME.registerComponent('points', {
    dependencies: ['material'],
    schema: {
        toggled: {
            type: 'boolean',
            default: true,
        },
    },
    init: function() {
        const self = this;
        const el = this.el;
        const data = this.data;
        const object = this.el.getObject3D('mesh');
        const material = this.material;

        el.addEventListener('mousedown', function(evt) {
            if (!evt.detail.clicker) { // local browser generated
                if (object) {
                    const geometry = object.geometry.clone();
                    const material = new THREE.PointsMaterial({
                        color: 0xFFFFFF,
                        size: 0.01,
                    });
                    const mesh = new THREE.Points(geometry, material);
                    el.setObject3D('points', mesh);
                    el.removeObject3D('mesh');

                    //          object.traverse(function (node) {
                    //          if (node.isMesh)
                    //              node.material.wireframe = data.toggled;
                    //          });
                }

                el.setAttribute('points', {
                    'toggled': !data.toggled,
                });
            }
        });
    },
});
