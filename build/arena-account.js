/**
 * @fileoverview Interact with user account service
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/* global ARENAAUTH, ARENADefaults */

/**
 * Wrapper class to perform requests to arena account
 */
export default class ARENAUserAccount {
    /**
     * Internal call to perform xhr request
     */
    static _makeRequest(method, url, params = undefined, contentType = undefined) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            const csrftoken = ARENAAUTH.getCookie('csrftoken');
            xhr.setRequestHeader('X-CSRFToken', csrftoken);
            if (contentType) xhr.setRequestHeader('Content-Type', contentType);
            xhr.responseType = 'json';
            xhr.onload = function onload() {
                if (this.status >= 200 && this.status < 300) {
                    // 200-299 expected success range
                    resolve(xhr.response);
                } else if (this.status === 404 && method === 'DELETE') {
                    // 404 acceptable for DELETE ops
                    resolve(xhr.response);
                } else {
                    reject(
                        new Error({
                            status: this.status,
                            statusText: xhr.statusText,
                        })
                    );
                }
            };
            xhr.onerror = function onerror() {
                reject(
                    new Error({
                        status: this.status,
                        statusText: xhr.statusText,
                    })
                );
            };
            xhr.send(params);
        });
    }

    /**
     * @typedef {Object} UserAccountData
     * @param authenticated {boolean} is the user authenticated
     * @param type {string} auth type
     * @param username {string} user's name
     * @param fullname {string} user's full name
     * @param email {string} user's email
     */

    /**
     * Request user state data for client-side state management
     * @return {UserAccountData} object with user account data
     */
    static async userAuthState() {
        return ARENAUserAccount._makeRequest('GET', `/user/v2/user_state`);
    }

    /**
     * Request scene names which the user has permission to from user database
     * @return {[string]} list of scene names
     */
    static async userScenes() {
        return ARENAUserAccount._makeRequest('GET', '/user/v2/my_scenes');
    }

    /**
     * Request a scene is added to the user database.
     * @param {string} sceneNamespace name of the scene without namespace
     * @param {boolean} isPublic true when 'public' namespace is used, false for user namespace
     */
    static async requestUserNewScene(sceneNamespace, isPublic = false) {
        const params = new FormData();
        // TODO: add public parameter
        return ARENAUserAccount._makeRequest('POST', `/user/v2/scenes/${sceneNamespace}`);
    }

    /**
     * Request to delete scene permissions from user db
     * @param {string} sceneNamespace name of the scene without namespace
     */
    static async requestDeleteUserScene(sceneNamespace) {
        return ARENAUserAccount._makeRequest('DELETE', `/user/v2/scenes/${sceneNamespace}`);
    }

    /**
     * Request to delete scene permissions from user db
     * @param authType
     * @param mqttUsername
     * @param namespacedScene
     */
    static async refreshAuthToken(authType, mqttUsername, namespacedScene) {
        let params = `username=${mqttUsername}`;
        params += `&id_auth=${authType}`;
        params += `&client=${'webBuild'}`;
        params += `&realm=${ARENADefaults ? ARENADefaults.realm : 'realm'}`;
        params += `&scene=${namespacedScene}`; // use ns/sn when possible to reduce potential token size
        const result = await ARENAUserAccount._makeRequest(
            'POST',
            `/user/v2/mqtt_auth`,
            params,
            'application/x-www-form-urlencoded'
        );
        ARENAAUTH.user_type = authType;
        ARENAAUTH.user_username = result.username;
        // keep payload for later viewing
        ARENAAUTH.token_payload = ARENAAUTH.parseJwt(result.token);
        return { mqtt_username: result.username, mqtt_token: result.token };
    }
}
