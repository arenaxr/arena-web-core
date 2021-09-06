/* eslint-disable require-jsdoc */

$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');
    updateStoreLogin();
});

function updateStoreLogin() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/user/storelogin');
    const csrftoken = getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.send();
    xhr.onload = () => {
        if (xhr.status == 200) {
            const jwt = getCookie('auth');
            loadStoreFront(jwt);
        } else {
            loadStoreFront();
        }
    };
}

function loadStoreFront(jwt) {
    try {
        parseToken(jwt);
        localStorage.setItem('jwt', jwt);
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', '/storemng');
        xhr.send();
        xhr.onload = () => {
            if (xhr.status == 200) {
                const doc = document.getElementById('storeframe').contentWindow.document;
                doc.open();
                doc.write(xhr.response);
                doc.close();
            }
        };
    } catch (err) {
        console.warn(err);
        localStorage.setItem('jwt', null);
        const doc = document.getElementById('storeframe').contentWindow.document;
        doc.open();
        doc.write('<div style="text-align:center;">Login with a user account to manage files.</div>');
        doc.close();
    }
}

function parseToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('filestore jwt invalid');
    }
    const tokenObj = KJUR.jws.JWS.parse(token);
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
