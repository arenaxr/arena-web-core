/* eslint-disable camelcase */

/**
 * @fileoverview Runtime message factory (create/delete runtimes, modules)
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2021, The CONIX Research Center. All rights reserved.
 * @date 2022
 */
import { UUID } from 'uuidjs';

/**
 * Create runtime message requests for orchestrator
 */
export default class RuntimeMsgs {
    /* singleton instance */
    static instance = null;

    /* runtime instance */
    rt;

    /* debug flag */
    debug;

    /* message actions */
    static Action = {
        create: 'create',
        delete: 'delete',
    };

    /* message object types */
    static ObjType = {
        rt: 'runtime',
        mod: 'module',
    };

    /* message types */
    static Type = {
        req: 'req',
        resp: 'resp',
    };

    /* file types */
    static FileType = {
        wasm: 'WA',
        python: 'PY',
    };

    /* message result */
    static Result = {
        ok: 'ok',
        err: 'error',
    };

    static Apis = {
        wasm: ['wasm:unstable'],
        python: ['python:python3'],
    };

    /* our runtime type */
    static RuntimeType = 'browser';

    /**
     * Create the factory
     * @param {object} rt - runtime instance
     * @param {boolean} debug - debug messages on/off
     */
    constructor(rt, debug = false) {
        // singleton
        if (RuntimeMsgs.instance) {
            return RuntimeMsgs.instance;
        }
        RuntimeMsgs.instance = this;

        this.rt = rt;
        this.debug = debug;
    }

    /**
     * Base message definition
     * @param {string} msgAction - message action ("create"/"delete")
     */
    req(msgAction) {
        return {
            object_id: UUID.generate(), // random uuid used as a transaction id
            action: msgAction,
            type: RuntimeMsgs.Type.req,
        };
    }

    /**
     * Register/delete (according to msgAction; create=register) runtime message
     * For internal (class) use
     * @param {string} [msgAction="create"] - message action ("create"/"delete")
     */
    createDeleteRuntime(msgAction) {
        const msg = this.req(msgAction);

        msg.data = {
            type: RuntimeMsgs.ObjType.rt,
            uuid: this.rt.getUuid(),
            name: this.rt.getName(),
            max_nmodules: this.rt.getMaxNmodules(),
            apis: this.rt.getApis(),
            runtime_type: RuntimeMsgs.RuntimeType,
        };
        return msg;
    }

    /**
     * Register runtime message
     */
    registerRuntime() {
        return this.createDeleteRuntime(RuntimeMsgs.Action.create);
    }

    /**
     * Delete runtime message
     */
    deleteRuntime() {
        return this.createDeleteRuntime(RuntimeMsgs.Action.delete);
    }

    /**
     * Create/delete module message (according to msgAction)
     * For internal (class) use
     * @param {object} modAttrs - module attributes to include (uuid, name, ...)
     * @param {string} [msgAction="create"] - message action ("create"/"delete")
     */
    createDeleteModule(
        {
            uuid = UUID.generate(),
            name = `mod-${Math.round(Math.random() * 10000)}@${navigator.product}`,
            parent = undefined,
            file = undefined,
            location = undefined,
            fileid = undefined,
            filetype = RuntimeMsgs.FileType.wasm,
            env = [],
            args = [],
            channels = [],
            apis = [],
            wait_state = undefined,
            memory = undefined,
        },
        msgAction = RuntimeMsgs.Action.create
    ) {
        const msg = this.req(msgAction);

        msg.data = {
            type: RuntimeMsgs.ObjType.mod,
            uuid,
            name,
            parent,
            file,
            location,
            fileid,
            filetype,
            env,
            args,
            channels,
            apis,
            wait_state,
            memory,
        };

        return msg;
    }

    /**
     * Delete module message
     * @param {object} delModuleAttrs - module attributes to include (uuid, name, ...)
     */
    deleteModule(delModuleAttrs) {
        return this.createDeleteModule(delModuleAttrs, RuntimeMsgs.Action.delete);
    }

    /**
     * Create module message from persist object
     * @param {object} persistObj - module persist data (See example)
     * @param {object} extraVars - dictionary of extra variables to replace (e.g. {scene: "ascene"})
     */
    createModuleFromPersistObj(persistObj, extraVars = {}) {
        const pdata = persistObj.attributes;

        // replaces variables given a dictionary of replacements; e.g:
        // replaceVars('SCENE=${userid}', { userid: '1479408135_nuno' }) returns 'SCENE=1479408135_nuno'
        const replaceVars = (tplText, args) => tplText.replace(/\${(\w+)}/g, (_, v) => args[v]);

        let muuid = UUID.generate(); // for per client, create a random uuid;
        // check if instantiate is "single"
        if (pdata.instantiate === 'single') {
            // object_id in persist obj is used as the uuid, if it is a valid uuid
            const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuid_regex.test(persistObj.object_id)) muuid = persistObj.object_id;
            else {
                console.error('Error! Object id must be a valid uuid (for instantiate=single)!');
            }
        }

        // get query string dictionary
        const { searchParams } = new URL(document.location);
        const qstring = Object.fromEntries(searchParams.entries());

        // variables we replace
        const rvars = {
            runtimeid: this.rt.getUuid(),
            moduleid: muuid,
            ...extraVars, // extra vars passed by argument
            ...qstring, // add all url params
        };

        // replace variables in args and env
        let args;
        let env;
        if (pdata.args) args = pdata.args.map((_arg) => replaceVars(_arg, rvars));
        if (pdata.env) env = pdata.env.map((_env) => replaceVars(_env, rvars));

        // replace variables in channel path and params
        if (pdata.channels) {
            for (let i = 0; i < pdata.channels.length; i++) {
                pdata.channels[i].path = replaceVars(pdata.channels[i].path, rvars);
                pdata.channels[i].params.topic = replaceVars(pdata.channels[i].params.topic, rvars);
            }
        }

        /*
        let fn;
        if (pdata.filetype === RuntimeMsgs.FileType.wasm) {
            // full filename using file store location, name (in the form namespace/program-folder), entry filename

        fn = [this.rt.getFSLocation(), pdata.name, pdata.filename].join('/').replace(/([^:])(\/\/+)/g, '$1/');
        } else fn = pdata.file; // just the filename
         */
        const fn = pdata.file !== undefined ? pdata.file : pdata.filename; // support both filename and file

        // check apis
        let apis = [];
        if (pdata.apis !== undefined) apis = pdata.apis;
        else {
            if (pdata.filetype === RuntimeMsgs.FileType.wasm) apis = RuntimeMsgs.Apis.wasm;
            if (pdata.filetype === RuntimeMsgs.FileType.python) apis = RuntimeMsgs.Apis.python;
        }

        // create new ARTS message using persist obj data
        const modCreateMsg = this.createDeleteModule(
            {
                name: pdata.name,
                uuid: muuid,
                // parent is this runtime if affinity is client; otherwise, from request parent which can be undefined to let orchestrator decide
                parent: pdata.affinity === 'client' ? { uuid: this.rt.getUuid() } : pdata.parent,
                file: fn,
                location: pdata.location === undefined ? '' : pdata.location,
                filetype: pdata.filetype,
                channels: pdata.channels,
                env,
                apis,
                args,
            },
            RuntimeMsgs.Action.create
        );

        // check affinity
        if (pdata.affinity === 'single') {
            // object_id in persist obj is used as the uuid, if it is a valid uuid
            const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (regex.test(persistObj.object_id)) {
                modCreateMsg.data.uuid = persistObj.object_id;
            } else console.error('Error! Object id must be a valid uuid!');
        } // nothing to do for multiple; a random uuid is created in ARTSMessages.mod(undefined, ARTSMessages.Action.create);

        return modCreateMsg;
    }
}
