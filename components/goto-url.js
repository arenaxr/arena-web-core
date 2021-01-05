AFRAME.registerComponent('goto-url', {
    // load new URL if clicked
    schema: {
        on: {
            default: '',
        }, // event to listen 'on'
        url: {
            default: '',
        }, // http:// style url
        dest: {
            default: 'sametab',
        }, // newtab
    },

    multiple: true,

    init: function() {
        const self = this;
    },

    update: function() {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        const data = this.data; // Component property values.
        const el = this.el; // Reference to the component's entity.
        let fired = false;
        if (data.on && data.url) { // we have an event?
            el.addEventListener(data.on, function(evt) {
                // console.log("goto-url url=" + data.url);
                if (!fired) {
                    fired = true;
                    swal({
                        title: 'You clicked on a URL!',
                        text: 'Are you sure you want to open \n[' + data.url + ']?',
                        buttons: ['Cancel', 'Yes'],
                    })
                        .then((confirmed) => {
                            if (confirmed) {
                                switch (data.dest) {
                                case 'popup':
                                    window.open(data.url, 'popup', 'width=500,height=500');
                                    break;
                                case 'newtab':
                                    window.open(data.url, '_blank');
                                    break;
                                case 'sametab':
                                default:
                                    window.location.href = data.url;
                                    break;
                                }
                            }
                        });
                    window.setTimeout(() => { // prevents event from firing twice after one event
                        fired = false;
                    }, 100);
                }
            });
        } else {
            // `event` not specified, just log the message.
            console.log(data);
        }
    },

    pause: function() {
        // this.removeEventListeners()
    },
    play: function() {
        // this.addEventListeners()
    },
    // handle component removal (why can't it just go away?)
    remove: function() {
        const data = this.data;
        const el = this.el;

        // remove event listener
        if (data.event) {
            el.removeEventListener(data.event, this.eventHandlerFn);
        }
    },
});
