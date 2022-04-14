// update auth state in nav bar
$(document).ready(function() {
    fetch('/user/user_state')
        .then((response) => response.json())
        .then((data) => {
            const host = `${window.location.protocol}//${window.location.host}`;
            if (data.authenticated) {
                $('#auth-dropdown').html(`${data.username} <b class='caret'></b>`);
                $('#auth-dropdown').attr('class', 'dropdown-toggle');
                $('#auth-dropdown').attr('data-toggle', 'dropdown');
                $('#auth-dropdown').after(
                    '<ul class=\'dropdown-menu\' role=\'menu\' aria-labelledby=\'dropdownMenu\'></ul>');
                $('ul .dropdown-menu').append(`<li><a href="${host}/user/profile">Profile</a></li>`);
                const win = window;
                const frame = document.getElementsByTagName('iframe');
                if (frame && frame.length < 0) win = document.getElementsByTagName('iframe')[0].contentWindow;
                if (typeof win.showPerms !== 'undefined') {
                    $('ul .dropdown-menu').append(`<li><a id="show_perms" href="#">MQTT Permissions</a></li>`);
                    $('#show_perms').on('click', function() {
                        win.showPerms();
                    });
                }
                $('ul .dropdown-menu').append(`<li><a href="${host}/user/logout">Logout</a></li>`);
            } else {
                $('#auth-dropdown').html('Login').on('click', function(e) {
                    localStorage.setItem('request_uri', location.href);
                });
                $('#auth-dropdown').attr('href', `${host}/user/login`);
            }
        });

    // highlight active page in navbar
    $('.nav-item a').filter(function() {
        const link = new URL(this.href).pathname.replace(/^\/+|\/+$/g, '');
        const loc = location.pathname.replace(/^\/+|\/+$/g, '');
        if (loc == 'files') {
            $('#btn-copy-store-path').show();
        } else {
            $('#btn-copy-store-path').hide();
        }
        return link == loc;
    }).parent().addClass('active');

    // copy the file store public path
    $('#btn-copy-store-path').on('click', function(e) {
        e.preventDefault();
        let storePath = getStorePath();
        if (storePath.startsWith('/storemng/files')) {
            storePath = storePath.replace('/storemng/files', '/store');
            const fullPath = `${window.location.protocol}//${window.location.host}${storePath}`;
            navigator.clipboard.writeText(fullPath);
            Swal.fire('Copied!', fullPath, 'success');
        } else {
            Swal.fire('Invalid path', 'Please navigate to another File Store file or folder', 'warning');
        }
    });

    $('.coming-soon').on('click', function(e) {
        e.preventDefault();
        alert('COMING SOON');
    });
});
