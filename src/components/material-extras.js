/* global AFRAME */

/**
 * Material extras component.
 * Allows to set extra material properties, namely texture encoding
 * Timeout scheme in lack of better understanding of what causes/events to listen to
 * be ensure properties are available
 */
AFRAME.registerComponent('material-extras', {
    dependencies: ['material'],
    schema: {
        encoding: {default: 'sRGBEncoding', oneOf: [
            'LinearEncoding', 'sRGBEncoding', 'GammaEncoding', 'RGBEEncoding', 'LogLuvEncoding',
            'RGBM7Encoding', 'RGBM16Encoding', 'RGBDEncoding', 'BasicDepthPacking', 'RGBADepthPacking']},
        needsUpdate: {default: false},
    },
    retryTimeouts: [1000, 2000, 5000, 10000],
    init: function() {
        this.update();
    },
    update: function() {
        this.retryIndex = 0;
        this.doUpdate();
    },
    doUpdate: function() {
        const mesh = this.el.getObject3D('mesh');

        if (!mesh) {
            console.error("could not find mesh!");
            this.retryUpdate();
        }

        if (mesh.material) {
            if (mesh.material.map) {
                mesh.material.map.encoding = THREE[this.data.encoding];
                mesh.material.needsUpdate = this.data.needsUpdate;
            } else this.retryUpdate();
        } else this.retryUpdate();
    },
    retryUpdate() {
        if (this.retryIndex < this.retryTimeouts.length) {
            setTimeout(async () => {
                console.log("retry!");
                this.retryIndex++;
                this.doUpdate();
            }, this.retryTimeouts[this.retryIndex]); // try again in a bit
        }
    },
});
