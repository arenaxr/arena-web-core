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
        colorWrite: {default: true},
        renderOrder: {default: 1},
        transparentOccluder: {default: false},
        defaultRenderOrder: {default: 1},
    },
    retryTimeouts: [1000, 2000, 5000, 10000],
    init: function() {
        this.update();
    },
    update: function(oldData) {
        this.retryIndex = 0;

        let transparentOccluder = false;
        if (oldData) transparentOccluder = oldData.transparentOccluder;

        if (transparentOccluder !== this.data.transparentOccluder) {
            // a transparent occluder has renderOrder=0 and colorWrite=false
            if (this.data.transparentOccluder == true) {
                this.data.renderOrder = 0;
                this.data.colorWrite = false;
            } else {
                this.data.renderOrder = this.data.defaultRenderOrder; // default renderOrder used in the arena
                this.data.colorWrite = true; // default colorWrite
            }
        }
        this.el.object3D.renderOrder=this.data.renderOrder;
        // do a retry scheme to apply material properties (waiting on events did not seem to work for all cases)
        this.updateMaterial();
    },
    updateMaterial: function() {
        const mesh = this.el.getObject3D('mesh');

        if (!mesh) {
            console.error('could not find mesh!');
            this.retryUpdateMaterial();
        }

        if (mesh.material) {
            mesh.material.needsUpdate = this.data.needsUpdate;
            mesh.material.colorWrite = this.data.colorWrite;
            if (mesh.material.map) {
                mesh.material.map.encoding = THREE[this.data.encoding];
            } else this.retryUpdateMaterial();
        } else this.retryUpdateMaterial();
    },
    retryUpdateMaterial() {
        if (this.retryIndex < this.retryTimeouts.length) {
            setTimeout(async () => {
                //console.log('retry!');
                this.retryIndex++;
                this.updateMaterial();
            }, this.retryTimeouts[this.retryIndex]); // try again in a bit
        }
    },
});
