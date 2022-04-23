/**
 * @fileoverview Register as a runtime; Send requests to orchestrator
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2022
 */
import UUID from "uuidjs";
import MQTTClient from "./mqtt-client.js";
import RuntimeMsgs from "./runtime-msgs.js";

/**
 * Send requests to orchestrator: register as a runtime, create modules from persist objects.
 * TODO: start modules on the browser
 * (code from https://github.com/SilverLineFramework/runtime-browser/)
 */
export class RuntimeMngr {
  /* singleton instance */
  static instance = null;
  /* @property {object} [mc=null] - mqtt client instance */
  mc;
  /* @property {string} [realm="realm"] - realm to use */
  realm;
  /* @property {string} [uuid=uuid4()] - runtime uuid */
  uuid;
  /* @property {string} [name="rt-XXXXX@Browser"] - runtime name */
  name;
  /* @property {number} [maxNmodules=10] - maximum number of modules */
  maxNmodules;
  /* @property {string[]} [apis=[]] - apis supported by the runtime (TODO: add apis once we support running modules) */
  apis;
  /* @property {string} [regTopic="realm/proc/reg"] - pubsub topic where the runtime sends register messages */
  regTopic;
  /*  @property {string} [ctlTopic="realm/proc/ctl"] - pubsub topic where the runtime listens for control messages (module create/delete) */
  ctlTopic;
  /* @property {string} [dbgTopic="realm/proc/debug"] - pubsub topic where the runtime sends/receives output (stdout/stdin) */
  dbgTopic;
  /* @property {number} [regTimeoutSeconds=30] - how long we wait for responses to register msgs */
  regTimeoutSeconds;
  /* @property {number} regRequestUuid - last registration request identifier; to check upon chegistration confirmation */
  regRequestUuid;
  /* @property {boolean} [isRegistered=false] - if true, indicates the runtime is already registered */
  isRegistered;
  /* @property {rtInitCallback} [onInitCallback] - callback when the runtime is done initializing/registering */
  onInitCallback;
  /* @property {string} [fsLocation="/store/users/"] - filestore location, for program files */
  fsLocation;
  /* @property {array} [modules=[]] - list of modules running */
  modules;
  /* @property {array} [pendingModulesArgs=[]] - list of create arguments for modules waiting to be started (waiting for runtime init) */
  pendingModulesArgs;
  /* @property {array} [clientModules=[]] - list of client modules that need to be deleted when the client finishes */
  clientModules;
  /* @property {boolean} [debug=false] - debug flag; more verbose console.log */
  debug;

  /**
   * Start runtime manager
   * @param {object} mc -  mqtt client object
   * @param {boolean} debug - debug messages on/off
   */
  constructor({
    mqttHost = "wss://arenaxr.org/mqtt/",
    mqttUsername = "noauth",
    mqttToken = "noauth",
    realm = "realm",
    uuid = UUID.generate(),
    name = `rt-${Math.round(Math.random() * 10000)}@${navigator.product}`,
    maxNmodules = 0, // TMP: cannot run any modules
    apis = [],
    regTopic = `${realm}/proc/reg`,
    ctlTopic = `${realm}/proc/control`,
    dbgTopic = `${realm}/proc/debug`,
    regTimeoutSeconds = 5,
    onInitCallback = null,
    fsLocation = "/store/users/",
    debug = false,
  }) {
    // singleton
    if (RuntimeMngr.instance) {
      return RuntimeMngr.instance;
    }
    RuntimeMngr.instance = this;

    this.mqttHost = mqttHost;
    this.mqttUsername = mqttUsername;
    this.mqttToken = mqttToken;
    this.realm = realm;
    this.uuid = uuid;
    this.name = name;
    this.maxNmodules = maxNmodules;
    this.apis = apis;
    this.regTopic = regTopic;
    this.ctlTopic = ctlTopic;
    this.dbgTopic = dbgTopic;
    this.regTimeoutSeconds = regTimeoutSeconds;
    this.onInitCallback = onInitCallback;
    this.fsLocation = fsLocation;
    this.debug = debug;

    this.modules = [];
    this.pendingModulesArgs = [];
    this.clientModules = [];
    this.isRegistered = false;

    // instanciate runtime messages factory
    this.rtMsgs = new RuntimeMsgs(this);
    
    // create a last will message (delete runtime)
    this.lastWillStringMsg = JSON.stringify(this.rtMsgs.deleteRuntime());

    // on unload, send delete client modules requests
    let rt = this;
    window.onbeforeunload = function () {
      rt.cleanup();
    };
  }

  setOptions({
    realm = this.realm,
    name = this.name,
    maxNmodules = this.maxNmodules,
    apis = this.apis,
    regTopic = this.regTopic,
    ctlTopic = this.ctlTopic,
    dbgTopic = this.dbgTopic,
    regTimeoutSeconds = this.regTimeoutSeconds,
    onInitCallback = this.onInitCallback,
    fsLocation = this.fsLocation,
    debug = this.debug,
  }) {
    // TODO: handle changes
    this.realm = realm;
    this.name = name;
    this.maxNmodules = maxNmodules;
    this.apis = apis;
    this.regTopic = regTopic;
    this.ctlTopic = ctlTopic;
    this.dbgTopic = dbgTopic;
    this.regTimeoutSeconds = regTimeoutSeconds;
    this.onInitCallback = onInitCallback;
    this.fsLocation = fsLocation;
    this.debug = debug;
  }

  async init() {
    // mqtt connect; setup delete runtime msg as last will 
    let rtMngr = this;
    this.mc = new MQTTClient({
      mqtt_host: rtMngr.mqttHost,
      mqtt_username: rtMngr.mqttUsername,
      mqtt_token: rtMngr.mqttToken,
      onMessageCallback: rtMngr.onMqttMessage.bind(rtMngr),
      willMessage: rtMngr.lastWillStringMsg,
      willMessageTopic: rtMngr.regTopic,
    });

    await this.mc.connect();

    // subscribe to reg to receive registration confirmation
    this.mc.subscribe(this.regTopic);

    // registration
    this.register();
  }

  /**
   * Register runtime with orchestrator
   */
  register() {
    if (this.isRegistered == true) return;

    if (this.debug == true) console.info("Runtime-Mngr: Registering...");

    let regMsg = this.rtMsgs.registerRuntime();
    this.regRequestUuid = regMsg.object_id; // save message uuid for confirmation

    this.mc.publish(this.regTopic, JSON.stringify(regMsg));

    setTimeout(this.register.bind(this), this.regTimeoutSeconds * 1000); // try register again
  }

  onMqttMessage(message) {
    let msg;
    try {
      msg = JSON.parse(message.payloadString);
    } catch (err) {
      console.error(
        "Runtime-Mngr: Could not parse message: [" +
          message.destinationName +
          "==" +
          +"]",
        message.payloadString,
        err
      );
      return;
    }

    if (this.debug == true) console.info("Runtime-Mngr: rcv msg", msg);

    if (this.isRegistered == false) {
      // response from orchestrator
      if (msg.type === RuntimeMsgs.Type.resp) {
        // response to reg request ?
        if (this.regRequestUuid && msg.object_id == this.regRequestUuid) {
          // check if result was ok
          if (msg.data.result != RuntimeMsgs.Result.ok) {
            console.error("Error registering runtime:" + msg.data);
            return;
          }
          // finish up registration
          this.onRuntimeRegistered();
        }
      }
      // if we are not registered, nothing else to do
      return;
    }

    /***************
     * TODO: process module create/delete requests here
     * from: https://github.com/SilverLineFramework/runtime-browser
    ***************/

}

  /**
   * Called once the runtime is initialized; create modules requested meantime
   */
  onRuntimeRegistered() {
    this.isRegistered = true;

    console.info("Runtime-Mngr: Registered.");

    this.mc.unsubscribe(this.regTopic);
    // subscribe to ctl/runtime_uuid
    this.mc.subscribe(`${this.getRtCtlTopic()}/#`);

    // check if we have modules to start
    if (this.pendingModulesArgs.length > 0) {
      let rtMngr = this;
      this.pendingModulesArgs.forEach(function (args) {
        if (rtMngr.debug == true)
          console.info(
            "Runtime-Mngr: Starting module",
            args.persistObj
          );
        rtMngr.createModuleFromPersist(args.persistObj, args.replaceVars);
      });
    }
    this.pendingModulesArgs = [];

    // signal init is done and ready to roll
    if (this.onInitCallback != undefined) {
      this.onInitCallback();
    }
  }

  /**
   * Send create module message from persist object
   * @param {object} persistObj - module persist data (See example)
   * @param {object} replaceVars - dictionary of extra variables to replace (e.g. {scene: "ascene"})
   * @example Persisted module example
   *   {
   *     "object_id": "38bffa0e-b3ab-4f5b-854f-b9dc6b52ec0c",
   *     "action": "create",
   *     "persist": true,
   *     "type": "program",
   *     "attributes": {
   *       "name": "arena/py/moving-box",
   *       "instantiate": "client",
   *       "filename": "box.py",
   *       "filetype": "PY",
   *       "env": [
   *         "SCENE=${scene}",
   *         "MQTTH=${mqtth}",
   *         "REALM=realm",
   *         "NAMESPACE=${namespace}"
   *        ],
   *       "channels": []
   *     }
   *   }
   */
  createModuleFromPersist(persistObj, replaceVars = {}) {
    // if runtime is not registered yet, add to pending modules list so they are processed later
    if (!this.isRegistered) {
      this.pendingModulesArgs.push({
        persistObj: persistObj,
        replaceVars: replaceVars,
      });
      return;
    }

    // instanciate create module message
    let modCreateMsg = this.rtMsgs.createModuleFromPersistObj(
      persistObj,
      replaceVars
    );

    // if instantiate 'per client', save this module data to delete before exit
    if (persistObj.attributes.instantiate == "client") {
      this.clientModules.push(modCreateMsg.data);
    }

    // TODO: save pending req uuid and check orchestrator responses
    // NOTE: object_id in runtime messages are used as a transaction id
    // this.pendingReq.push(modCreateMsg.object_id); // pending_req is a list with object_id of requests waiting arts response

    console.info("Sending create module request:", modCreateMsg);
    this.mc.publish(this.ctlTopic, JSON.stringify(modCreateMsg));
  }

  /**
   * Send delete module messages for all 'per client' modules; called on 'before unload' event
   */
  cleanup() {
    this.clientModules.forEach((mod) => {
      let modDelMsg = this.rtMsgs.deleteModule(mod);
      this.mc.publish(this.ctlTopic, JSON.stringify(modDelMsg));
    });

    // sent in case last will fails (this will be a duplicate of last will)
    this.mc.publish(this.regTopic, lastWillStringMsg);
  }

  /* public getters */

  getUuid() {
    return this.uuid;
  }

  getName() {
    return this.name;
  }

  getMaxNmodules() {
    return this.maxNmodules;
  }

  getApis() {
    return this.apis;
  }

  getFSLocation() {
    return this.fsLocation;
  }

  getRtDbgTopic() {
    return `${this.dbgTopic}/${this.uuid}`;
  }  

  /* pubsub topic where the runtime sends unregister messages (ctl_topic+module uuid) */
  getRtCtlTopic() {
    return `${this.ctlTopic}/${this.uuid}`;
  }    
}
