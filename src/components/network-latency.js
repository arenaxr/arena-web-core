/* global AFRAME, ARENA */

/**
 * Publish with qos of 2 for network graph to update latency
 *
 */
AFRAME.registerComponent('network-latency', {
    // publish empty message with qos of 2 for network graph to update latency
    init: function() {
        this.UPDATE_INTERVAL_MS = 10000; // updates every 10s
        this.tick = AFRAME.utils.throttleTick(this.tick, this.UPDATE_INTERVAL_MS, this);
        this.message = new Paho.Message(''); // send blank message
        this.message.destinationName = ARENA.latencyTopic;
        this.message.qos = 2;
    },
    tick: (function(t, dt) {
        if (ARENA.mqttClient.isConnected()) {
            ARENA.mqttClient.send(this.message);
        }
    }),
});
