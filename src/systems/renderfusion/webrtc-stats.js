const info = AFRAME.utils.debug('ARENA:webrtc-stats:info');

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
                    info(`Codec: ${codec.mimeType}`);

                    if (codec.payloadType) {
                        info(`payloadType=${codec.payloadType}`);
                    }

                    if (codec.clockRate) {
                        info(`clockRate=${codec.clockRate}`);
                    }

                    if (codec.channels) {
                        info(`channels=${codec.channels}`);
                    }
                }

                if (stat.kind === 'video') {
                    info(`Decoder: ${stat.decoderImplementation}`);
                    info(`Resolution: ${stat.frameWidth}x${stat.frameHeight}`);
                    info(`Framerate: ${stat.framesPerSecond}`);

                    if (this.lastReport && this.lastReport.has(stat.id)) {
                        const lastStats = this.lastReport.get(stat.id);
                        if (stat.totalDecodeTime) {
                            info(`Decode Time: ${(stat.totalDecodeTime - lastStats.totalDecodeTime).toFixed(3)}`);
                        }

                        if (stat.totalInterFrameDelay) {
                            info(
                                `InterFrame Delay: ${(
                                    stat.totalInterFrameDelay - lastStats.totalInterFrameDelay
                                ).toFixed(3)}`
                            );
                        }

                        if (stat.jitterBufferDelay) {
                            info(
                                `Jitter Buffer Delay: ${(stat.jitterBufferDelay - lastStats.jitterBufferDelay).toFixed(
                                    3
                                )}`
                            );
                            info(
                                `Avg Jitter Buffer Delay: ${(
                                    stat.jitterBufferDelay / stat.jitterBufferEmittedCount
                                ).toFixed(3)}`
                            );
                        }

                        if (stat.totalProcessingDelay) {
                            info(
                                `Total Delay: ${(stat.totalProcessingDelay - lastStats.totalProcessingDelay).toFixed(
                                    3
                                )}`
                            );
                            info(`Avg Delay: ${(stat.totalProcessingDelay / stat.framesDecoded).toFixed(3)}`);
                        }
                    }
                }

                if (this.lastReport && this.lastReport.has(stat.id)) {
                    // calculate bitrate
                    const lastStats = this.lastReport.get(stat.id);
                    const duration = (stat.timestamp - lastStats.timestamp) / 1000;
                    const bitrate = (8 * (stat.bytesReceived - lastStats.bytesReceived)) / duration / 1000;
                    info(`Bitrate: ${bitrate.toFixed(3)} kbit/sec`);

                    // eslint-disable-next-line no-param-reassign
                    stat.bitrate = bitrate;
                }
            }

            Object.keys(additionalStats).forEach((key) => {
                // eslint-disable-next-line no-param-reassign
                stat[key] = additionalStats[key];
            });

            if (stat.latency) {
                info(`E2E Latency: ${stat.latency} ms`);
            }

            this.signaler.sendStats(stat); // TODO (elu2): causing some disconnects for renderfusion when heartbeats not high enough
        });

        this.lastReport = report;
    }
}
