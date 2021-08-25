/* eslint-disable require-jsdoc */

$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');

    // TODO(mwfarb): remove debug serving store below...
    // $.ajax({
    //     url: '/storemng',
    //     type: 'GET',
    //     beforeSend: function(xhr) {
    //         xhr.setRequestHeader('X-Filebrowser-Auth', 'testuser1');
    //     },
    //     crossDomain: true,
    //     success: function(response) {
    //         console.log('Success!');
    //         document.storeIframe.document.body.innerHTML = response;
    //     },
    // });
});
