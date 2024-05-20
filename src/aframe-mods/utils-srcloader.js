/**
 * @fileoverview Monkeypatched AFRAME utils.srcLoader to skip HTTP content-type check
 *               when extension matches known image types.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2023
 */

/* global AFRAME */

const IMG_EXTENSIONS = ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff'];

function checkIsImageFallback(src, onResult) {
    function onLoad() {
        onResult(true);
    }

    function onError() {
        onResult(false);
    }

    const tester = new Image();
    tester.addEventListener('load', onLoad);

    tester.addEventListener('error', onError);

    tester.src = src;
}

/**
 * Call back whether `src` is an image.
 *
 * @param {string|Element} src - URL or element that will be tested.
 * @param {function} onResult - Callback with whether `src` is an image.
 */
function checkIsImage(src, onResult) {
    if (src.tagName) {
        onResult(src.tagName === 'IMG');
        return;
    }

    // Skip network request from utils.validateSrc
    // WARNING: Will obviously produce incorrect behavior if file is not correctly named
    try {
        const pathSplit = new URL(src, window.location.origin).pathname.split('.');
        const srcExt = pathSplit[pathSplit.length - 1];
        if (IMG_EXTENSIONS.includes(srcExt.toLowerCase())) {
            onResult(true);
            return;
        }
    } catch {
        // empty
    }

    const request = new XMLHttpRequest();

    // Try to send HEAD request to check if image first.
    request.open('HEAD', src);
    request.addEventListener('load', () => {
        let contentType;
        if (request.status >= 200 && request.status < 300) {
            contentType = request.getResponseHeader('Content-Type');
            if (contentType == null) {
                checkIsImageFallback(src, onResult);
            } else if (contentType.startsWith('image')) {
                onResult(true);
            } else {
                onResult(false);
            }
        } else {
            checkIsImageFallback(src, onResult);
        }
        request.abort();
    });
    request.send();
}

/**
 * Validate a texture, either as a selector or as a URL.
 * Detects whether `src` is pointing to an image or video and invokes the appropriate
 * callback.
 *
 * `src` will be passed into the callback
 *
 * @params {string|Element} src - URL or media element.
 * @params {function} isImageCb - callback if texture is an image.
 * @params {function} isVideoCb - callback if texture is a video.
 */
function validateSrc(src, isImageCb, isVideoCb) {
    checkIsImage(src, (isImage) => {
        if (isImage) {
            isImageCb(src);
            return;
        }
        isVideoCb(src);
    });
}

// AFRAME Monkeypatch (src/utils/src-loader.js)
AFRAME.utils.srcLoader.validateSrc = validateSrc;
