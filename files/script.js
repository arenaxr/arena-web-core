/**
 * Script to connect to filestore auth endpoint and then load filestore proxy when fs auth completes.
 */

/* global ARENAAUTH $ */

/**
 * Connection to get the filestore proxy url served base html template into the iframe.
 * @param {*} authToken The auth token from filestore. 'None' when not authorized.
 */
function loadStoreFront(authToken) {
    const frame = document.getElementById('storeframe');
    try {
        // determine the token is formatted well
        ARENAAUTH.parseJwt(authToken);
        localStorage.setItem('jwt', authToken);
        frame.setAttribute('src', '/storemng');

        // Since filebrowser load will overwrite some style, after fs load, force any style we require
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'style.css';
        document.getElementsByTagName('head')[0].appendChild(link);
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
                Swal.fire({
                    icon: 'error',
                    text: fsErrorMsg,
                    allowEscapeKey: false,
                    allowOutsideClick: false,
                }).then((result) => {
                    ARENAAUTH.signOut();
                });
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
    await ARENAAUTH.makeUserRequest('GET', '/user/v2/storelogin');
    const authToken = ARENAAUTH.getCookie('auth');
    loadStoreFront(authToken);
});
