AFRAME.registerComponent('wireframe', {
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
                    object.traverse(function(node) {
                        if (node.isMesh) {
                            node.material.wireframe = data.toggled;
                        }
                    });
                }

                el.setAttribute('wireframe', {
                    'toggled': !data.toggled,
                });
            }
        });
    },
});
