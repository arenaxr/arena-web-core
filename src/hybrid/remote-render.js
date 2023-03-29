AFRAME.registerComponent('remote-render', {
    schema: {
        enabled: {type: 'boolean', default: false},
    },

    init: function() {
    },

    update: function(oldData) {
        // console.log('render-client', this.el.id, this.data.enabled);

        if (oldData.enabled !== this.data.enabled) {
            this.el.object3D.visible = !this.data.enabled;

            const remoteRender = new CustomEvent('hybrid-onremoterender', {
                detail: {
                    object_id: this.el.id,
                    remoteRendered: this.data.enabled,
                },
            });
            window.dispatchEvent(remoteRender);
        }
    },
});
