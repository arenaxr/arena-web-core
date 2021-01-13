/* global AFRAME */

// emit model onProgress (loading) event for gltf models
AFRAME.components['gltf-model'].Component.prototype.update = function() {
    const self = this;
    const el = this.el;
    const src = this.data;

    if (!src) {
        return;
    }

    this.remove();

    this.loader.load(src, function gltfLoaded(gltfModel) {
        self.model = gltfModel.scene || gltfModel.scenes[0];
        self.model.animations = gltfModel.animations;
        el.setObject3D('mesh', self.model);
        el.emit('model-loaded', {format: 'gltf', model: self.model});
    }, function gltfProgress(xhr) {
        el.emit('model-progress', {src: src, progress: (xhr.loaded / xhr.total * 100)});
    }, function gltfFailed(error) {
        const message = (error && error.message) ? error.message : 'Failed to load glTF model';
        console.error(message);
        el.emit('model-error', {format: 'gltf', src: src});
    });
};
