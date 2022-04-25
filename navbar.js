$(document).ready(function() {
    // update auth state in nav bar
    fetch('/user/user_state')
        .then((response) => response.json())
        .then((data) => {
            const authDrop = $('#auth-dropdown');
            authDrop.addClass('dropdown-toggle');
            authDrop.attr('data-bs-toggle', 'dropdown');
            authDrop.attr('aria-haspopup', 'true');
            authDrop.attr('aria-expanded', 'false');
            $('#auth-dropdown').after(
                '<ul class=\'dropdown-menu dropdown-menu-end\' role=\'menu\' aria-labelledby=\'auth-dropdown\'></ul>');
            $('ul .dropdown-menu').append('<li><a class="dropdown-item" href="/conf/versions.html">Version</a></li>');
            if (data.authenticated) {
                authDrop.html(data.username);
                $('ul .dropdown-menu').append('<li><a class="dropdown-item" href="/user/profile">Profile</a></li>');
                $('ul .dropdown-menu').append('<li><a class="dropdown-item" id="show_perms" href="#">MQTT Permissions</a></li>');
                $('#show_perms').on('click', function() {
                    const frame = document.getElementsByTagName('iframe');
                    const win = (frame && frame.length > 0) ? frame[0].contentWindow : window;
                    if (typeof win.showPerms !== 'undefined') {
                        win.showPerms();
                    } else {
                        alert('No MQTT permissions');
                    }
                });
                $('ul .dropdown-menu').append('<li><a class="dropdown-item" href="/user/logout">Logout</a></li>');
            } else {
                authDrop.html('Login');
                $('ul .dropdown-menu').append('<li><a class="dropdown-item" href="/user/login">Login</a></li>')
                    .on('click', function(e) {
                        localStorage.setItem('request_uri', location.href);
                    });
            }
        });

    // add page header
    $('#header').load('/header.html', function() {
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
});
