/**
 * Script to connect to filestore auth endpoint and then load filestore proxy when fs auth completes.
 */

/* global ARENAAUTH $ */

/**
 * Loads the html into the page iframe to completion.
 * @param {*} html The HTML code to apply into the iframe.
 */
async function loadHtmlToFrame(html) {
    const doc = document.getElementById('storeframe').contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Since filebrowser load will overwrite some style, after fs load, force any style we require
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'style.css';
    document.getElementsByTagName('head')[0].appendChild(link);
}

/**
 * Connection to get the filestore proxy url served base html template into the iframe.
 * @param {*} authToken The auth token from filestore. 'None' when not authorized.
 */
function loadStoreFront(authToken) {
    try {
        // determine the token is formatted well
        ARENAAUTH.parseJwt(authToken);
        localStorage.setItem('jwt', authToken);
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', '/storemng');
        xhr.send();
        xhr.onload = () => {
            if (xhr.status === 200) {
                loadHtmlToFrame(xhr.response);
            }
        };
    } catch (err) {
        console.warn(err);
        localStorage.setItem('jwt', null);
        let fsErrorMsg = 'Login with a user account to manage files.';
        const interval = setInterval(() => {
            if (window.auth) {
                clearInterval(interval);
                if (window.auth.authenticated) {
                    fsErrorMsg = `Invalid file store auth token for user "${window.auth.username}".`;
                }
                loadHtmlToFrame(`<div style="text-align:center;">${fsErrorMsg}</div>`);
            }
        }, 250);
    }
}

/**
 * Get the path location of the iframe for filebrowser
 * @return {string} path
 */
function getStorePath() {
    const loc = document.getElementById('storeframe').contentWindow.location.pathname;
    return loc;
}

window.addEventListener('onauth', async (e) => {
    await ARENAAUTH.makeUserRequest('GET', '/user/storelogin');
    const authToken = ARENAAUTH.getCookie('auth');
    loadStoreFront(authToken);
});
