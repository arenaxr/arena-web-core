AFRAME.registerComponent('panel', {
    schema: {
        width: { default: 1 },
        height: { default: 1 },
        depth: { default: 0.05 },
    },
    init() {
        this.el.setAttribute('geometry', {
            primitive: 'roundedbox',
            width: this.data.width,
            height: this.data.height,
            depth: this.data.depth,
        });
        this.el.setAttribute('material', {
            color: '#424470',
            opacity: 0.9,
        });
    },
});
