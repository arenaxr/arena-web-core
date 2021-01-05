/**
 * Material extras component.
 * Allows to set extra material properties, namely texture encodind
 */
AFRAME.registerComponent('material-extras', {
    dependencies: ['material'],
    schema: {
        encoding: {default: 'sRGBEncoding', oneOf: [
            'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding',
            'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking']},
        needsUpdate: {default: false},
    },
    init: function() {
        this.update();
    },
    update: function() {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) console.error("could not find mesh!");
        if (mesh.material) {
            if (mesh.material.map) {
                mesh.material.map.encoding = THREE[this.data.encoding];
                mesh.material.needsUpdate = this.data.needsUpdate;
            }
        }
    },
});
