AFRAME.registerComponent('click-toggle', {
    schema: {
        toggled: {
            type: 'boolean',
            default: false,
        },
    },
    init: function() {
        const self = this;
        const el = this.el;
        const data = this.data;

        el.addEventListener('mousedown', function(evt) {
            const dummy = 1;
            el.setAttribute('click-toggle', {
                'toggled': !data.toggled,
            });
        });
    },
});
