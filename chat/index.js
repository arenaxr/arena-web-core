import ARENAChat from './arena-chat.js';

var arenaChat;

ARENA.Chat = {
  init: async function init(chat_settings) {
    console.log("Loading Chat");
    arenaChat = new ARENAChat({
        userid: globals.idTag,
        cameraid: globals.camName,
        username: globals.displayName,
        realm: defaults.realm,
        scene: globals.scenenameParam,
        persist_uri: "https://" + defaults.persistHost + defaults.persistPath,
        keepalive_interval_ms: 30000,
        mqtt_host: globals.mqttParam,
        mqtt_username: globals.username,
        mqtt_token: globals.mqttToken
    });
    arenaChat.start();
  },
  userList: function init(chat_settings) {
    return arenaChat.getUserList();
  }
}
