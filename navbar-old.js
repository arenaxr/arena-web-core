/* global getStorePath, Swal, $ */

$(document).ready(() => {
    // add page header
    $('#header').load('/header-old.html', () => {
        // update auth state in nav bar
        fetch('/user/user_state')
            .then((response) => response.json())
            .then((data) => {
                const authDrop = $('#auth-dropdown');
                authDrop.attr('class', 'dropdown-toggle');
                authDrop.attr('data-toggle', 'dropdown');
                authDrop.after("<ul class='dropdown-menu' role='menu' aria-labelledby='dropdownMenu'></ul>");
                const dropdownMenu = $('ul .dropdown-menu');
                dropdownMenu.append('<li><a href="/conf/versions.html">Version</a></li>');
                if (data.authenticated) {
                    authDrop.html(`${data.username} <b class='caret'></b>`);
                    dropdownMenu.append('<li><a href="/user/profile">Profile</a></li>');
                    dropdownMenu.append('<li><a id="show_perms" href="#">Permissions</a></li>');
                    $('#show_perms').on('click', () => {
                        const frame = document.getElementsByTagName('iframe');
                        const win = frame && frame.length > 0 ? frame[0].contentWindow : window;
                        if (typeof win.ARENAAUTH.showPerms !== 'undefined') {
                            win.ARENAAUTH.showPerms();
                        } else {
                            alert('No MQTT permissions');
                        }
                    });
                    dropdownMenu.append('<li><a href="/user/logout">Logout</a></li>');
                } else {
                    authDrop.html('Login <b class="caret"></b>');
                    dropdownMenu.append('<li><a href="/user/login">Login</a></li>').on('click', (e) => {
                        localStorage.setItem('request_uri', window.location.href);
                    });
                }
            });

        // highlight active page in navbar
        $('.nav-item a')
            .filter(function checkActiveURL() {
                const link = new URL(this.href).pathname.replace(/^\/+|\/+$/g, '');
                const loc = window.location.pathname.replace(/^\/+|\/+$/g, '');
                if (loc === 'files') {
                    $('#btn-copy-store-path').show();
                } else {
                    $('#btn-copy-store-path').hide();
                }
                return link === loc;
            })
            .parent()
            .addClass('active');

        // copy the file store public path
        $('#btn-copy-store-path').on('click', (e) => {
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

        $('.coming-soon').on('click', (e) => {
            e.preventDefault();
            alert('COMING SOON');
        });
    });
});
