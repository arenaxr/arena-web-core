export class WebRTCStatsLogger {
    constructor(peerConnection, signaler) {
        this.peerConnection = peerConnection;
        this.signaler = signaler;

        this.lastReport = null;
    }

    async getStats() {
        const report = await this.peerConnection.getStats();
        this.handleReport(report);
    }

    handleReport(report) {
        report.forEach((stat) => {
            if (stat.type !== 'inbound-rtp') {
                return;
            }

            const clientStats = {};

            if (stat.codecId != undefined) {
                const codec = report.get(stat.codecId);
                console.log(`Codec: ${codec.mimeType}`);
                clientStats['codec'] = codec.mimeType;

                if (codec.payloadType) {
                    console.log(`payloadType=${codec.payloadType}`);
                }

                if (codec.clockRate) {
                    console.log(`clockRate=${codec.clockRate}`);
                }

                if (codec.channels) {
                    console.log(`channels=${codec.channels}`);
                }
            }

            if (stat.kind == 'video') {
                console.log(`Decoder: ${stat.decoderImplementation}`);
                console.log(`Resolution: ${stat.frameWidth}x${stat.frameHeight}`);
                console.log(`Framerate: ${stat.framesPerSecond}`);

                clientStats['decoder'] = stat.decoderImplementation;
                clientStats['frameWidth'] = stat.frameWidth;
                clientStats['frameHeight'] = stat.frameHeight;
                clientStats['framerate'] = stat.framesPerSecond;

                if (stat.totalDecodeTime) {
                    console.log(`Decode Time: ${stat.totalDecodeTime.toFixed(3)}`);
                    clientStats['totalDecodeTime'] = stat.totalDecodeTime.toFixed(3);
                }

                if (stat.totalInterFrameDelay) {
                    console.log(`InterFrame Delay: ${stat.totalInterFrameDelay.toFixed(3)}`);
                    clientStats['totalInterFrameDelay'] = stat.totalInterFrameDelay.toFixed(3);
                }

                if (stat.jitterBufferDelay) {
                    console.log(`Jitter Buffer Delay: ${stat.jitterBufferDelay.toFixed(3)}`);
                    clientStats['jitterBufferDelay'] = stat.jitterBufferDelay.toFixed(3);
                }
            }

            if (this.lastReport && this.lastReport.has(stat.id)) {
                // calculate bitrate
                const lastStats = this.lastReport.get(stat.id);
                const duration = (stat.timestamp - lastStats.timestamp) / 1000;
                const bitrate = (8 * (stat.bytesReceived - lastStats.bytesReceived) / duration) / 1000;
                console.log(`Bitrate: ${bitrate.toFixed(3)} kbit/sec`);

                clientStats['bitrate'] = bitrate.toFixed(3);
            }

            this.signaler.sendStats(clientStats);
        });

        this.lastReport = report;
    }
}
