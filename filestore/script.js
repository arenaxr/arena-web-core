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
    if (jwt && jwt.length !== 0) {
        localStorage.setItem('jwt', jwt);
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('GET', '/storemng');
        xhr.send();
        xhr.onload = () => {
            if (xhr.status == 200) {
                document.getElementById('storeIframe').contentWindow.document.write(xhr.response);
            }
        };
    } else {
        localStorage.removeItem('jwt');
        document.getElementById('storeIframe').contentWindow.document.write(
            '<div style="text-align:center;">Login with a user account to manage files.</div>');
    }
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
