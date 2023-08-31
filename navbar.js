/* global getStorePath, Swal, $ */

$(document).ready(() => {
    // add page header
    $('#header').load('/header.html', () => {
        // update auth state in nav bar
        let auth = null;
        fetch('/user/user_state')
            .then((response) => response.json())
            .then((data) => {
                auth = data;
                const authDrop = $('#auth-dropdown');
                authDrop.addClass('dropdown-toggle');
                authDrop.attr('data-bs-toggle', 'dropdown');
                authDrop.attr('aria-haspopup', 'true');
                authDrop.attr('aria-expanded', 'false');
                authDrop.after(
                    "<ul class='dropdown-menu dropdown-menu-end' role='menu' aria-labelledby='auth-dropdown'></ul>"
                );
                const dropdownMenu = $('ul .dropdown-menu');
                dropdownMenu.append('<li><a class="dropdown-item" href="/conf/versions.html">Version</a></li>');
                if (data.authenticated) {
                    authDrop.html(data.username);
                    dropdownMenu.append('<li><a class="dropdown-item" href="/user/profile">Profile</a></li>');
                    dropdownMenu.append('<li><a class="dropdown-item" id="show_perms" href="#">Permissions</a></li>');
                    $('#show_perms').on('click', () => {
                        const frame = document.getElementsByTagName('iframe');
                        const win = frame && frame.length > 0 ? frame[0].contentWindow : window;
                        if (typeof win.ARENAAUTH.showPerms !== 'undefined') {
                            win.ARENAAUTH.showPerms();
                        } else {
                            window.alert('No MQTT permissions');
                        }
                    });
                    dropdownMenu.append('<li><a class="dropdown-item" href="/user/logout">Logout</a></li>');
                } else {
                    authDrop.html('Login');
                    dropdownMenu
                        .append('<li><a class="dropdown-item" href="/user/login">Login</a></li>')
                        .on('click', (e) => {
                            localStorage.setItem('request_uri', window.location.href);
                        });
                }
            });

        const btnCopyStorePath = $('#btn-copy-store-path');
        // highlight active page in navbar
        $('.nav-item a')
            .filter(function checkActiveURL() {
                const link = new URL(this.href).pathname.replace(/^\/+|\/+$/g, '');
                const loc = window.location.pathname.replace(/^\/+|\/+$/g, '');
                if (loc === 'files') {
                    btnCopyStorePath.show();
                } else {
                    btnCopyStorePath.hide();
                }
                return link === loc;
            })
            .addClass('active');

        // copy the file store public path
        btnCopyStorePath.on('click', (e) => {
            e.preventDefault();
            let storePath = getStorePath();
            if (storePath.startsWith('/storemng/files')) {
                storePath = storePath.replace('/storemng/files', '');
                const storeUnscopedPrefix = auth.is_staff ? '' : `/users/${auth.username}`;
                const fullPath = `${window.location.protocol}//${window.location.host}/store${storeUnscopedPrefix}${storePath}`;
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
