/* eslint-disable require-jsdoc */

$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');


    $.ajax({
        url: '/storesrv',
        // url: 'http://127.0.0.1:8080',
        // data: {
        //     username: 'mwfarb',
        // },
        type: 'GET',
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-Filebrowser-Auth', 'mwfarb');
        },
        crossDomain: true,
        success: function(response) {
            console.log('Success!');
            // console.log(response);
            document.myIframe.document.body.innerHTML = response;
        },
    });
});
