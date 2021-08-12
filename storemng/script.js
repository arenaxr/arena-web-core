/* eslint-disable require-jsdoc */

$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');

    // TODO(mwfarb): remove debug serving store below...
    // $.ajax({
    //     url: '/storesrv',
    //     // url: 'http://127.0.0.1:8080',
    //     type: 'GET',
    //     beforeSend: function(xhr) {
    //         xhr.setRequestHeader('X-Filebrowser-Auth', 'testusername1');
    //     },
    //     crossDomain: true,
    //     success: function(response) {
    //         console.log('Success!');
    //         document.storeIframe.document.body.innerHTML = response;
    //     },
    // });
});
