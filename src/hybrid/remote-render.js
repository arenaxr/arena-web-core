AFRAME.registerComponent('remote-render', {
    schema: {
        enabled: {type: 'boolean', default: false},
    },

    init: function() {
        const el = this.el;

        this.getObjectStats = this.getObjectStats.bind(this);

        /* if (el.hasAttribute('gltf-model')) {
         *     el.addEventListener('model-loaded', this.getObjectStats);
         * } else {
         *     this.getObjectStats();
         * } */
    },

    getObjectStats: function() {
        const el = this.el;
        const sceneEl = el.sceneEl;

        const camera = sceneEl.camera;

        var object = el.getObject3D('mesh');

        var triangleCount = 0;
        object.traverse(function (node) {
            if (node.isMesh) {
                triangleCount += node.geometry.attributes.position.count / 3;
            }
        });

        console.log('Triangle count:', el.id, triangleCount);
    },

    update: function(oldData) {
        console.log('[render-client]', this.el.id, this.data.enabled);

        if (oldData.enabled !== this.data.enabled) {
            this.el.object3D.visible = !this.data.enabled;
        }
    },
});
