/** Class encapsulating an EventTarget for ARENA events. */
class ARENAEventEmitter {

    /**
     * Definitions of events and documentation of callbacks
     */      
    static events = {
        /**
         * Indicates we joined a jitsi conference (also on reconnect),
         * provides a list of current users/participants:
         * @typedef {Object} UserData
         * @param id {string} the ARENA id of the user 
         * @param dn {string} the display name of the user
         * @param cn {string} the camera name of the user
         *
         * The following parameters are passed to listeners (event.detail object):
         * @callback jitsiConnectCallback
         * @param scene {string} the scene
         * @param pl {[]} participant list; array of {UserData} objects
         */   
        JITSI_CONNECT: 'jitsi_connect',

        /**
         * Indicates a user joined. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback userJoinCallback
         * @param id {string} the ARENA id of the user 
         * @param dn {string} the display name of the user
         * @param cn {string} the camera name of the user
         * @param scene {string} the scene
         * @param src {string} the source of the event (see ARENAEventEmitter.sources below)
         */   
        USER_JOINED: 'user_joined',

        /**
         * Indicates a user joined. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback userLeftCallback
         * @param id {string} the ARENA id of the user 
         * @param src {string} the source of the event (see ARENAEventEmitter.sources below)
         */   
        USER_LEFT: 'user_left'
    };

    /**
     * Modules that are possible event sources
     * Used for events where the source is relevant/needed: {jitsiConnectCallback|userJoinCallback|userLeftCallback|...}
     *
     */   
    static sources = {
        JITSI: 'jitsi',
        CHAT: 'chat'
    };

    /**
     * Create an event emitter.
     */    
    constructor() {
        this._target = new EventTarget();
    }

    /**
     * Add a listner
     * 
     * Ussage example:
     * 
     *  on(ARENAEventEmitter.events.USER_JOINED, userJoinCallback);
     *  
     *  Will register 'userJoinCallback' to be called when a USER_JOINED event is dispatched; userJoinCallback might look like:
     *  
     *    userJoinCallback(e) {
     *      // event type should match, unless this function is registered as a callback for several different events
     *      if (e.type !==  ARENAEventEmitter.events.USER_JOINED) return; 
     *      const args = e.detail; // receive arguments as defined by {userJoinCallback}
     *      console.log("User join: ", args.id, args.dn, args.cn, args.scene, args.src); 
     *    }
     * 
     * @param eventName {string} name of the event
     * @param listner {jitsiConnectCallback|userJoinCallback|userLeftCallback|...} callback
     */    
    on(eventName, listener) {
        return this._target.addEventListener(eventName, listener);
    }

    /**
     * Event listner that is removed after being called once
     * 
     * @param eventName {string} name of the event
     * @param listner {jitsiConnectCallback|userJoinCallback|userLeftCallback|...} callback
     */    
    once(eventName, listener) {
        return this._target.addEventListener(eventName, listener, {once: true});
    }

    /**
     * Remove listner
     * 
     * @param eventName {string} name of the event
     * @param listner {jitsiConnectCallback|userJoinCallback|userLeftCallback|...} callback
     */    
    off(eventName, listener) {
        return this._target.removeEventListener(eventName, listener);
    }

    /**
     * Emit event
     * 
     * Usage example:
     *  emit(ARENAEventEmitter.events.USER_JOINED, {id: '1356_X', dn: 'User X', cn: 'camera_1356_X', scene: 'ascene', src: ARENAEventEmitter.sources.JITSI});
     * 
     *  Emits a USER_JOINED event, with the defined custom callback arguments: id, dn, cn, scene and src (see {userJoinCallback})
     * 
     * @param eventName {string} name of the event
     * @param detail {Object} custom event properties
     */    
    emit(eventName, detail) {
        //console.info("EVENT:", eventName, detail);
        return this._target.dispatchEvent(
            new CustomEvent(eventName, {detail, cancelable: true}),
        );
    }
}

//export default ARENAEventEmitter