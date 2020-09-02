import MQTTChat from './mqtt-chat.js';

window.addEventListener('onauth', function (e) {
//    window.addEventListener('load', (event) => {
        console.log("Loading MQTTChat");
        let mqttChat = new MQTTChat({
            cameraid: window.globals.camName,
            username: window.globals.userParam,
            realm: "realm",
            scene: window.globals.scenenameParam,
            ping_interval_ms: 30000,
            mqtt_host: window.globals.mqttParam,
            mqtt_username: e.detail.mqtt_username,
            mqtt_token: e.detail.mqtt_token,
        });
    
        mqttChat.connect();
//    });
});
