AFRAME.registerComponent('prompt-box', {
    schema: {
        on: {
            default: '',
        }, // event to listen 'on'
        prompt: {
            default: '',
        }, // http:// style url
    },

    multiple: true,

    init: function() {
        const self = this;
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        const data = this.data; // Component property values.
        const el = this.el; // Reference to the component's entity.

        if (data.on) { // we have an event?
            console.log('adding prompt event listener');
            el.addEventListener(data.on, function(evt) {
                if (!evt.detail.clicker) { // local event, not from MQTT
                    console.log('called prompt listener');
                    const person = prompt(data.prompt, '');
                    let txt = '';
                    if (person == null || person == '') {
                        txt = '';
                    } else {
                        txt = person;
                    }
                    const coordsData = setCoordsData(evt);
                    const thisMsg = {
                        object_id: this.id,
                        action: 'clientEvent',
                        type: 'prompt-data',
                        data: {
                            text: txt,
                            source: this.id,
                            position: coordsData,
                        },
                    };
                    publish(globals.outputTopic + this.id, thisMsg);

                    console.log('prompt-box data: ' + txt);
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
