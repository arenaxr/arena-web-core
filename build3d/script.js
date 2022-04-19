$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');

    // pass url params to iframe
    let build3dframe = document.getElementById('build3dframe');
    const build3dUrl = `./scene.html${window.parent.location.search}`;
    build3dframe.src = build3dUrl;
});
