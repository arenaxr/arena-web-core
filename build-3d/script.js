$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');

    let build3dframe = document.getElementById('build3dframe');
    const build3dUrl = `./scene.html${window.parent.location.search}`;
    console.log(build3dUrl);
    build3dframe.src = build3dUrl;
});
