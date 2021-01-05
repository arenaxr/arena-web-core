AFRAME.registerComponent('video-control', {
    // e.g. <a-entity video-control="videoName: superVideo" ...>
    schema: {
        videoPath: {
            type: 'string',
            default: '',
        },
    },
    multiple: true,

    init: function() {
        const data = this.data;
        const theID = data.video_object;
        const videoPath = data.video_path;
        const anyoneClicks = data.anyone_clicks;
        const videoLoop = data.video_loop;
        let frameSrc = 'images/conix-face.white.jpg'; // default
        if (data.frame_object) {
            frameSrc = data.frame_object;
        }

        const thePlayer = document.getElementById(theID);
        const theAssets = $('a-assets');
        const whoVideo = document.getElementById(videoPath);

        this.videoNum = this.el.id;
        const videoId = this.videoNum + '_videoId';
        ;
        theAssets.append(
            `<video id='${videoId}' src='${videoPath}' autoplay loop='${videoLoop}'/>`,
            // `<a-entity id='${videoId}' src='${videoPath}' muted='true' loop='false'/>`
        );

        const frameId = this.videoNum + '_frameId';
        ;
        theAssets.append(
            `<image id='${frameId}' src='${frameSrc}'/>`,
        );

        thePlayer.setAttribute('material', 'src', `#${frameId}`);

        // save the video or frozen frame URL as 'frameSrc'
        thePlayer.setAttribute('arenaVideo', frameSrc);
        thePlayer.setAttribute('videoId', videoId);
        thePlayer.setAttribute('frameId', frameId);

        const thevideo = document.getElementById(videoId);
        thevideo.pause(); // start the video as paused initially or else audio will play when video is not shown!

        this.el.addEventListener('mousedown', function(evt) {
            if (evt.detail.clicker == globals.camName || anyoneClicks && evt.detail.clicker && (evt.detail.clicker != globals.camName)) {
                const theSource = thePlayer.getAttribute('arenaVideo');
                const theVideoId = thePlayer.getAttribute('videoId');
                const theFrameId = thePlayer.getAttribute('frameId');
                // console.log(theSource)

                if (theSource != frameSrc) {
                    // FRAME
                    thevideo.pause(); // pause the html video elem ==> pause aframe video elem

                    // thePlayer.setAttribute('material', 'src', `#${frameId}`);
                    thePlayer.setAttribute('material', 'src', `#${theFrameId}`);

                    thePlayer.setAttribute('arenaVideo', frameSrc);
                } else {
                    // VIDEO
                    // thePlayer.setAttribute('material', 'src', `#${videoId}`);
                    thePlayer.setAttribute('material', 'src', `#${theVideoId}`);

                    thePlayer.setAttribute('arenaVideo', videoPath);
                    thevideo.volume = 1; // default is 1; this just demonstrates how to change

                    thevideo.play(); // play the html video elem ==> play aframe video elem
                }
            }
        });
    },

    update: function(oldData) {
        // this in fact only gets called when the component that it is - gets updated
        // unlike the update method in Unity that gets called every frame
        const data = this.data; // Component property values.
        const el = this.el; // Reference to the component's entity.
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
