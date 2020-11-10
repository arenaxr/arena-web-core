import ARENAChat from './arena-chat.js';

var arenaChat;

ARENA.Chat = {
  init: async function(chat_settings) {
    console.log("Loading Chat");
    arenaChat = new ARENAChat(chat_settings);
    arenaChat.start();
  },
  userList: function() {
    return arenaChat.getUserList();
  }
}
