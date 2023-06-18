export default class WebRTCStatsLogger {
    constructor(peerConnection, signaler, logToConsole = true) {
        this.peerConnection = peerConnection;
        this.signaler = signaler;
        this.logToConsole = logToConsole;

        this.lastReport = null;
    }

    async getStats(additionalStats) {
        const report = await this.peerConnection.getStats();
        this.handleReport(report, additionalStats);
    }

    handleReport(report, additionalStats) {
        report.forEach((stat) => {
            if (stat.type !== 'inbound-rtp') {
                return;
            }

            if (this.logToConsole) {
                if (stat.codecId !== undefined) {
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

                if (stat.kind === 'video') {
                    console.log(`Decoder: ${stat.decoderImplementation}`);
                    console.log(`Resolution: ${stat.frameWidth}x${stat.frameHeight}`);
                    console.log(`Framerate: ${stat.framesPerSecond}`);

                    if (this.lastReport && this.lastReport.has(stat.id)) {
                        const lastStats = this.lastReport.get(stat.id);
                        if (stat.totalDecodeTime) {
                            console.log(
                                `Decode Time: ${(stat.totalDecodeTime - lastStats.totalDecodeTime).toFixed(3)}`
                            );
                        }

                        if (stat.totalInterFrameDelay) {
                            console.log(
                                `InterFrame Delay: ${(
                                    stat.totalInterFrameDelay - lastStats.totalInterFrameDelay
                                ).toFixed(3)}`
                            );
                        }

                        if (stat.jitterBufferDelay) {
                            console.log(
                                `Jitter Buffer Delay: ${(stat.jitterBufferDelay - lastStats.jitterBufferDelay).toFixed(
                                    3
                                )}`
                            );
                            console.log(
                                `Avg Jitter Buffer Delay: ${(
                                    stat.jitterBufferDelay / stat.jitterBufferEmittedCount
                                ).toFixed(3)}`
                            );
                        }

                        if (stat.totalProcessingDelay) {
                            console.log(
                                `Total Delay: ${(stat.totalProcessingDelay - lastStats.totalProcessingDelay).toFixed(
                                    3
                                )}`
                            );
                            console.log(`Avg Delay: ${(stat.totalProcessingDelay / stat.framesDecoded).toFixed(3)}`);
                        }
                    }
                }

                if (this.lastReport && this.lastReport.has(stat.id)) {
                    // calculate bitrate
                    const lastStats = this.lastReport.get(stat.id);
                    const duration = (stat.timestamp - lastStats.timestamp) / 1000;
                    const bitrate = (8 * (stat.bytesReceived - lastStats.bytesReceived)) / duration / 1000;
                    console.log(`Bitrate: ${bitrate.toFixed(3)} kbit/sec`);

                    // eslint-disable-next-line no-param-reassign
                    stat.bitrate = bitrate;
                }
            }

            Object.keys(additionalStats).forEach((key) => {
                // eslint-disable-next-line no-param-reassign
                stat[key] = additionalStats[key];
            });

            if (stat.latency) {
                console.log(`Latency: ${stat.latency} ms`);
            }

            this.signaler.sendStats(stat);
        });

        this.lastReport = report;
    }
}
