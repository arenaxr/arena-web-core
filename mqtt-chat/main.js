import MQTTChat from '/mqtt-chat/mqtt-chat.js';

window.addEventListener('load', (event) => {
    console.log("Loading MQTTChat");
    let mqttChat = new MQTTChat({
        cameraid: window.globals.camName,
        username: window.globals.userParam,
        realm: "realm",
        scene: window.globals.scenenameParam,
        ping_interval_ms: 30000,
        mqtt_host: window.globals.mqttParam,
    });

    mqttChat.connect();
});
