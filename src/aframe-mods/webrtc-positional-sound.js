/**
 * @fileoverview Allows for positional audio in AFRAME sound component.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

const warn = AFRAME.utils.debug('components:sound:warn');

AFRAME.components.sound.schema.src.parse = function assetParse(value) {
    let el;

    // If an element was provided (e.g. canvas or video), just return it.
    if (typeof value !== 'string') {
        return value;
    }

    // Wrapped `url()` in case of data URI.
    const parsedUrl = value.match(/\url\((.+)\)/);
    if (parsedUrl) {
        return parsedUrl[1];
    }

    // ID.
    if (value.charAt(0) === '#') {
        el = document.getElementById(value.substring(1));
        if (el) {
            // Pass through media elements. If we have the elements, we don't have to call
            // three.js loaders which would re-request the assets.
            if (['CANVAS', 'VIDEO', 'IMG', 'AUDIO'].indexOf(el.tagName) >= 0) {
                return el;
            }
            return el.getAttribute('src');
        }
        warn(`"${value}" asset not found.`);
        return null;
    }

    // Non-wrapped url().
    return value;
};

const Sound = AFRAME.components.sound.Component;
Sound.prototype.update = function update(oldData) {
    const { data } = this;
    const srcChanged = data.src !== oldData.src;
    // Create new sound if not yet created or changing `src`.
    if (srcChanged) {
        if (!data.src) {
            warn('Audio source was not specified with `src`');
            return;
        }
        this.setupSound();
    }

    this.pool.children.forEach((sound) => {
        if (data.positional) {
            sound.setDistanceModel(data.distanceModel);
            sound.setMaxDistance(data.maxDistance);
            sound.setRefDistance(data.refDistance);
            sound.setRolloffFactor(data.rolloffFactor);
        }
        sound.setLoop(data.loop);
        sound.setVolume(data.volume);
        // eslint-disable-next-line no-param-reassign
        sound.isPaused = false;
    });

    if (data.on !== oldData.on) {
        this.updateEventListener(oldData.on);
    }
    // All sound values set. Load in `src`.
    if (srcChanged) {
        const self = this;

        if (window.MediaStream) {
            const isStream = data.src.srcObject instanceof window.MediaStream;

            if (isStream) {
                const stream = data.src.srcObject;
                self.pool.children.forEach((sound) => {
                    sound.setNodeSource(sound.context.createMediaStreamSource(stream));
                });
                self.loaded = true;
                self.el.emit('sound-loaded');
                return;
            }
        }

        const { src } = data;
        this.loaded = false;
        this.audioLoader.load(src, (buffer) => {
            self.pool.children.forEach((sound) => {
                sound.setBuffer(buffer);
            });
            self.loaded = true;

            // Remove this key from cache, otherwise we can't play it again
            AFRAME.THREE.Cache.remove(src);
            if (self.data.autoplay || self.mustPlay) {
                self.playSound();
            }
            self.el.emit('sound-loaded');
        });
    }
};
