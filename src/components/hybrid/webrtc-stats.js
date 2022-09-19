export class WebRTCStatsLogger {
    constructor(peerConnection, updateInterval) {
        this.peerConnection = peerConnection;
        this.updateInterval = updateInterval;

        this.lastReport = null;

        this.startLogging();
    }

    startLogging() {
        window.setInterval(this.getStats.bind(this), this.updateInterval);
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

            if (stat.codecId != undefined) {
                const codec = report.get(stat.codecId);
                console.log(`Codec: ${codec.mimeType}`);

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

            if (stat.kind == "video") {
                console.log(`Decoder: ${stat.decoderImplementation}`);
                console.log(`Resolution: ${stat.frameWidth}x${stat.frameHeight}`);
                console.log(`Framerate: ${stat.framesPerSecond}`);
            }

            if (this.lastReport && this.lastReport.has(stat.id)) {
                // calculate bitrate
                const lastStats = this.lastReport.get(stat.id);
                const duration = (stat.timestamp - lastStats.timestamp) / 1000;
                const bitrate = (8 * (stat.bytesReceived - lastStats.bytesReceived) / duration) / 1000;
                console.log(`Bitrate: ${bitrate.toFixed(2)} kbit/sec`);
            }
        });

        this.lastReport = report;
    }
}
