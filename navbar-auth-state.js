// update auth state in nav bar
$(document).ready(function() {
    fetch('/user/user_state')
        .then((response) => response.json())
        .then((data) => {
            const host = `${window.location.protocol}//${window.location.host}`;
            if (data.authenticated) {
                const authDrop = $('#auth-dropdown');
                authDrop.html(`${data.username}`);
                authDrop.addClass('dropdown-toggle');
                authDrop.attr('data-bs-toggle', 'dropdown');
                authDrop.attr('aria-haspopup', 'true');
                authDrop.attr('aria-expanded', 'false');
                $('#auth-dropdown').after(
                    '<ul class=\'dropdown-menu dropdown-menu-end\' role=\'menu\' aria-labelledby=\'auth-dropdown\'></ul>');
                $('ul .dropdown-menu').append(`<li><a class="dropdown-item" href="${host}/user/profile">Profile</a></li>`);
                $('ul .dropdown-menu').append(`<li><a class="dropdown-item" id="show_perms" href="#">MQTT Permissions</a></li>`);
                $('#show_perms').on('click', function() {
                    const frame = document.getElementsByTagName('iframe');
                    const win = (frame && frame.length > 0) ? frame[0].contentWindow : window;
                    if (typeof win.showPerms !== 'undefined') {
                        win.showPerms();
                    } else {
                        alert('No MQTT permissions');
                    }
                });
                $('ul .dropdown-menu').append(`<li><a class="dropdown-item" href="${host}/user/logout">Logout</a></li>`);
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
        console.warn(link, loc);
        return link == loc;
    }).addClass('active');

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
