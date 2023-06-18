/**
 * @fileoverview Handles getUserMedia video source
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2022, The CONIX Research Center. All rights reserved.
 * @date 2022
 */

export default class GetUserMediaARSource {
    constructor(options) {
        this.options = {
            cameraFacingMode: 'environment',
            width: 1280,
            height: 720,
        };
        this.setOptions(options);

        this.video = document.createElement('video');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('muted', '');
        this.video.setAttribute('playsinline', '');
        this.video.style.width = `${this.options.width}px`;
        this.video.style.height = `${this.options.height}px`;

        this.video.style.position = 'absolute';
        this.video.style.top = '0px';
        this.video.style.left = '0px';
        this.video.style.zIndex = '-1';
    }

    setOptions(options) {
        if (options) {
            this.options = Object.assign(this.options, options);
        }
    }

    resize(width, height) {
        const screenWidth = width;
        const screenHeight = height;

        const sourceWidth = this.video.videoWidth;
        const sourceHeight = this.video.videoHeight;

        const sourceAspect = sourceWidth / sourceHeight;
        const screenAspect = screenWidth / screenHeight;

        if (screenAspect < sourceAspect) {
            const newWidth = sourceAspect * screenHeight;
            this.video.style.width = `${newWidth}px`;
            this.video.style.marginLeft = `${-(newWidth - screenWidth) / 2}px`;

            this.video.style.height = `${screenHeight}px`;
            this.video.style.marginTop = '0px';
        } else {
            const newHeight = 1 / (sourceAspect / screenWidth);
            this.video.style.height = `${newHeight}px`;
            this.video.style.marginTop = `${-(newHeight - screenHeight) / 2}px`;

            this.video.style.width = `${screenWidth}px`;
            this.video.style.marginLeft = '0px';
        }
    }

    copyDimensionsTo(elem) {
        /* eslint-disable no-param-reassign */
        elem.style.width = this.video.style.width;
        elem.style.height = this.video.style.height;
        elem.style.marginLeft = this.video.style.marginLeft;
        elem.style.marginTop = this.video.style.marginTop;
        /* eslint-enable no-param-reassign */
    }

    init() {
        return new Promise((resolve, reject) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                reject();
            }

            navigator.mediaDevices
                .getUserMedia({
                    audio: false,
                    video: {
                        facingMode: this.options.cameraFacingMode,
                        width: { ideal: this.options.width },
                        height: { ideal: this.options.height },
                    },
                })
                .then((stream) => {
                    this.video.srcObject = stream;
                    this.video.onloadedmetadata = () => {
                        this.video.play().then(() => {
                            resolve(this.video);
                        });
                    };
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
