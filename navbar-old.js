$(document).ready(function() {
    // add page header
    $('#header').load('/header-old.html', function() {
        // update auth state in nav bar
        fetch('/user/user_state')
            .then((response) => response.json())
            .then((data) => {
                $('#auth-dropdown').attr('class', 'dropdown-toggle');
                $('#auth-dropdown').attr('data-toggle', 'dropdown');
                $('#auth-dropdown').after(
                    '<ul class=\'dropdown-menu\' role=\'menu\' aria-labelledby=\'dropdownMenu\'></ul>');
                $('ul .dropdown-menu').append('<li><a href="/conf/versions.html">Version</a></li>');
                if (data.authenticated) {
                    $('#auth-dropdown').html(`${data.username} <b class="caret"></b>`);
                    $('ul .dropdown-menu').append('<li><a href="/user/profile">Profile</a></li>');
                    $('ul .dropdown-menu').append('<li><a id="show_perms" href="#">Permissions</a></li>');
                    $('#show_perms').on('click', function() {
                        const frame = document.getElementsByTagName('iframe');
                        const win = (frame && frame.length > 0) ? frame[0].contentWindow : window;
                        if (typeof win.ARENAAUTH.showPerms !== 'undefined') {
                            win.ARENAAUTH.showPerms();
                        } else {
                            alert('No MQTT permissions');
                        }
                    });
                    $('ul .dropdown-menu').append('<li><a href="/user/logout">Logout</a></li>');
                } else {
                    $('#auth-dropdown').html('Login <b class="caret"></b>');
                    $('ul .dropdown-menu').append('<li><a href="/user/login">Login</a></li>')
                        .on('click', function(e) {
                            localStorage.setItem('request_uri', location.href);
                        });
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
});
