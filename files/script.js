/**
 * Script to connect to filestore auth endpoint and then load filestore proxy when fs auth completes.
 */
$(document).ready(function() {
    updateStoreLogin();
});

/**
 * Connection to arena-account endpoint to request filestore auth token.
 */
function updateStoreLogin() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/user/storelogin');
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send();
    xhr.onload = () => {
        if (xhr.status == 200) {
            const authToken = getCookie('auth');
            loadStoreFront(authToken);
        } else {
            loadStoreFront();
        }
    };
}

/**
 * Connection to get the filestore proxy url served base html template into the iframe.
 * @param {*} authToken The auth token from filestore. 'None' when not authorized.
 */
function loadStoreFront(authToken) {
    try {
        // determine the token is formatted well
        parseJwt(authToken);
        localStorage.setItem('jwt', authToken);
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', '/storemng');
        xhr.send();
        xhr.onload = () => {
            if (xhr.status == 200) {
                loadHtmlToFrame(xhr.response);
            }
        };
    } catch (err) {
        console.warn(err);
        localStorage.setItem('jwt', null);
        loadHtmlToFrame('<div style="text-align:center;">Login with a user account to manage files.</div>');
    }
}

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
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'style.css';
    document.getElementsByTagName('head')[0].appendChild(link);
}

/**
 * Get the path location of the iframe for filebrowser
 * @return {string} path
 */
function getStorePath() {
    const loc = document.getElementById('storeframe').contentWindow.location.pathname;
    return loc;
}

/**
 *
 * @param {*} jwt The JWT
 * @return {Object} the JSON payload
 */
function parseJwt(jwt) {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
        throw new Error('filestore jwt invalid');
    }
    const tokenObj = KJUR.jws.JWS.parse(jwt);
    return tokenObj.payloadObj;
}

/**
 * Utility function to get cookie value
 * @param {string} name cookie name
 * @return {string} cookie value
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
