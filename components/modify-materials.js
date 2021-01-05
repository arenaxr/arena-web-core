AFRAME.registerComponent('modify-materials', {
    dependencies: ['material'],
    schema: {
        url: {
            default: '',
        }, // http:// style url
    },
    init: function() {
        const object = this.el.getObject3D('mesh');

        const texture = THREE.ImageUtils.loadTexture(this.data.url);

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        texture.offset.set(4, 4);

        // texture.repeat.x = 1;
        // texture.repeat.y = 1;

        // Wait for model to load.
        this.el.addEventListener('model-loaded', () => {
            // Grab the mesh / scene.
            const obj = this.el.getObject3D('mesh');
            // Go over the submeshes and modify materials we want.
            obj.traverse((node) => {
                node.material = new THREE.MeshLambertMaterial({
                    map: texture,
                    //          needsUpdate: true
                });
                ;
            });
        });
    },
});
