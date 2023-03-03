if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

const ml = require('./lib/THREE.MeshLine');
THREE.MeshLine = ml.MeshLine;
THREE.MeshLineMaterial = ml.MeshLineMaterial;


const lineWidthStylers = {
    'grow': function(p) {
        return p;
    },
    'shrink': function(p) {
        return 1 - p;
    },
    'center-sharp': function(p) {
        return 1 - Math.abs(2 * p - 1);
    },
    'center-smooth': function(p) {
        Math.sin( p * 3.1415 );
    },
    'sine-wave': function(p) {
        return 0.5 + 0.5 * Math.sin( (p - 0.5) * 2 * 3.1415 * 10 );
    },
};


AFRAME.registerComponent('thickline', {
    schema: {
        color: {default: '#000'},
        lineWidth: {default: 10},
        lineWidthStyler: {default: ''}, // One of lineWidthStyles above
        sizeAttenuation: {default: 0},
        near: {default: 0.1},
        far: {default: 1000},
        path: {
            default: [
                {x: -0.5, y: 0, z: 0},
                {x: 0.5, y: 0, z: 0},
            ],
            // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
            parse: function(value) {
                return value.split(',').map(AFRAME.utils.coordinates.parse);
            },
            // Serialize array of vec3s in case someone does setAttribute('line', 'path', [...]).
            stringify: function(data) {
                return data.map(AFRAME.utils.coordinates.stringify).join(',');
            },
        },
    },

    init: function() {
        this.resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );

        const sceneEl = this.el.sceneEl;
        sceneEl.addEventListener( 'render-target-loaded', this.do_update.bind(this) );
        sceneEl.addEventListener( 'render-target-loaded', this.addlisteners.bind(this) );
    },

    addlisteners: function() {
    // canvas does not fire resize events, need window
        window.addEventListener( 'resize', this.do_update.bind(this) );
    },

    do_update: function() {
        const canvas = this.el.sceneEl.canvas;
        this.resolution.set( canvas.width, canvas.height );
        this.update();
    },

    update: function() {
    // cannot use canvas here because it is not created yet at init time
    // console.log("canvas res:");
    // console.log(this.resolution);
        const material = new THREE.MeshLineMaterial({
            color: new THREE.Color(this.data.color),
            resolution: this.resolution,
            sizeAttenuation: this.data.sizeAttenuation,
            lineWidth: this.data.lineWidth,
            near: this.data.near,
            far: this.data.far,
        });

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        this.data.path.forEach(function(vec3) {
            positions.push(vec3.x, vec3.y, vec3.z);
        });

        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

        const widthFn = lineWidthStylers[this.data.lineWidthStyler] ?? function() {
            return 1;
        };
        // ? try {var w = widthFn(0);} catch(e) {warn(e);}
        const line = new THREE.MeshLine();
        line.setGeometry( geometry, widthFn );

        this.el.setObject3D('mesh', new THREE.Mesh(line.geometry, material));
    },

    remove: function() {
        this.el.removeObject3D('mesh');
    },
});
