import MQTTChat from './mqtt-chat.js';

window.addEventListener('onauth', (e) => {
    //    window.addEventListener('load', (event) => {
    console.log("Loading MQTTChat");
    let mqttChat = new MQTTChat({
        // TODO(mwfarb): should all user-presence use the same ID? uuidv4() or globals.idTag?
        //userid: window.globals.idTag,
        cameraid: window.globals.camName,
        username: window.globals.displayName,
        realm: "realm",
        scene: window.globals.scenenameParam,
        persist_uri: "https://" + defaults.persistHost + defaults.persistPath,
        keepalive_interval_ms: 30000,
        mqtt_host: window.globals.mqttParam,
        mqtt_username: e.detail.mqtt_username,
        mqtt_token: e.detail.mqtt_token,
    });

    mqttChat.start();

});
