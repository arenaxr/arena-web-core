/**
 * @fileoverview Emit model onProgress (loading) event for gaussian splat models; save model.asset
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2023, The CONIX Research Center. All rights reserved.
 * @date 2025
 */

// AFRAME Monkeypatch (src/components/vendor/aframe-gaussian-splatting-component.min.js)
AFRAME.components.gaussian_splatting.Component.prototype.loadData = function loadData(camera, object, renderer, src) {
    const { el } = this;

    // register with model-progress system to handle model loading events
    document.querySelector('a-scene').systems['model-progress'].registerModel(el, src);

    this.camera = camera;
    this.object = object;
    this.renderer = renderer;
    this.loadedVertexCount = 0;
    this.rowLength = 3 * 4 + 3 * 4 + 4 + 4;

    this.worker = new Worker(
        URL.createObjectURL(
            new Blob(['(', this.createWorker.toString(), ')(self)'], {
                type: 'application/javascript',
            })
        )
    );
    this.worker.postMessage({ method: 'clear' });

    fetch(src).then(async (data) => {
        const reader = data.body.getReader();

        let glInitialized = false;
        let bytesDownloaded = 0;
        let bytesProcesses = 0;
        const _totalDownloadBytes = data.headers.get('Content-Length');
        const totalDownloadBytes = _totalDownloadBytes ? parseInt(_totalDownloadBytes) : undefined;

        if (totalDownloadBytes != undefined) {
            const numVertexes = Math.floor(totalDownloadBytes / this.rowLength);
            await this.initGL(numVertexes);
            glInitialized = true;
        }

        const chunks = [];
        const start = Date.now();
        let lastReportedProgress = 0;
        const isPly = src.endsWith('.ply');

        while (true) {
            try {
                const { value, done } = await reader.read();
                if (done) {
                    // console.log('Completed download.');
                    el.emit('model-loaded', { format: 'splat', model: self.model }); // mwfarb: Added Monkeypatch here.
                    break;
                }
                bytesDownloaded += value.length;
                if (totalDownloadBytes != undefined) {
                    const mbps = bytesDownloaded / 1024 / 1024 / ((Date.now() - start) / 1000);
                    const percent = (bytesDownloaded / totalDownloadBytes) * 100;
                    if (percent - lastReportedProgress > 1) {
                        // console.log('download progress:', `${percent.toFixed(2)}%`, `${mbps.toFixed(2)} Mbps`);
                        el.emit('model-progress', { src, loaded: bytesDownloaded, total: totalDownloadBytes }); // mwfarb: Added Monkeypatch here.
                        lastReportedProgress = percent;
                    }
                } else {
                    // console.log('download progress:', bytesDownloaded, ', unknown total');
                    el.emit('model-progress', { src, loaded: bytesDownloaded, total: totalDownloadBytes }); // mwfarb: Added Monkeypatch here.
                }
                chunks.push(value);

                const bytesRemains = bytesDownloaded - bytesProcesses;
                if (!isPly && totalDownloadBytes != undefined && bytesRemains > this.rowLength) {
                    const vertexCount = Math.floor(bytesRemains / this.rowLength);
                    const concatenatedChunksbuffer = new Uint8Array(bytesRemains);
                    let offset = 0;
                    for (const chunk of chunks) {
                        concatenatedChunksbuffer.set(chunk, offset);
                        offset += chunk.length;
                    }
                    chunks.length = 0;
                    if (bytesRemains > vertexCount * this.rowLength) {
                        const extra_data = new Uint8Array(bytesRemains - vertexCount * this.rowLength);
                        extra_data.set(
                            concatenatedChunksbuffer.subarray(bytesRemains - extra_data.length, bytesRemains),
                            0
                        );
                        chunks.push(extra_data);
                    }
                    const buffer = new Uint8Array(vertexCount * this.rowLength);
                    buffer.set(concatenatedChunksbuffer.subarray(0, buffer.byteLength), 0);
                    this.pushDataBuffer(buffer.buffer, vertexCount);
                    bytesProcesses += vertexCount * this.rowLength;
                }
            } catch (error) {
                console.error(error);
                el.emit('model-error', { format: 'splat', src }); // mwfarb: Added Monkeypatch here.
                break;
            }
        }

        if (bytesDownloaded - bytesProcesses > 0) {
            // Concatenate the chunks into a single Uint8Array
            let concatenatedChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                concatenatedChunks.set(chunk, offset);
                offset += chunk.length;
            }
            if (isPly) {
                concatenatedChunks = new Uint8Array(this.processPlyBuffer(concatenatedChunks.buffer));
            }

            const numVertexes = Math.floor(concatenatedChunks.byteLength / this.rowLength);
            if (!glInitialized) {
                await this.initGL(numVertexes);
                glInitialized = true;
            }
            this.pushDataBuffer(concatenatedChunks.buffer, numVertexes);
        }
    });
};
