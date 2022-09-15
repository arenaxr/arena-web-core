AFRAME.registerComponent('remote-render', {
    schema: {
    },

    init: function() {
    },

    update: function() {
        this.el.object3D.visible = !this.data;
    },
});
