/* global getStorePath, Swal */

document.addEventListener('DOMContentLoaded', () => {
    // load header into #header
    const headerEl = document.getElementById('header');
    if (headerEl) {
        fetch('/header.html')
            .then((res) => res.text())
            .then((html) => {
                headerEl.innerHTML = html;
                initNavbarBehavior();
            })
            .catch((err) => console.error('Failed to load header:', err));
    } else {
        // if there's no header placeholder, still try to init
        initNavbarBehavior();
    }
});

function initNavbarBehavior() {
    // fetch auth state and populate dropdown
    fetch('/user/v2/user_state')
        .then((r) => r.json())
        .then((data) => {
            window.auth = data;
            const authDrop = document.getElementById('auth-dropdown');
            if (!authDrop) return;

            authDrop.classList.add('dropdown-toggle');
            authDrop.setAttribute('data-bs-toggle', 'dropdown');
            authDrop.setAttribute('aria-haspopup', 'true');
            authDrop.setAttribute('aria-expanded', 'false');

            const ul = document.createElement('ul');
            ul.className = 'dropdown-menu dropdown-menu-end';
            ul.setAttribute('role', 'menu');
            ul.setAttribute('aria-labelledby', 'auth-dropdown');

            const addItem = (html) => {
                const li = document.createElement('li');
                li.innerHTML = html;
                ul.appendChild(li);
                return li;
            };

            addItem('<a class="dropdown-item" href="/conf/versions.html">Version</a>');

            if (window.auth && window.auth.authenticated) {
                authDrop.textContent = window.auth.username;
                addItem('<a class="dropdown-item" href="/user/v2/profile">Profile</a>');
                const permsLi = addItem('<a class="dropdown-item" id="show_perms" href="#">Permissions</a>');
                const permsA = permsLi.querySelector('#show_perms');
                if (permsA) {
                    permsA.addEventListener('click', (e) => {
                        e.preventDefault();
                        const frame = document.getElementsByTagName('iframe');
                        const win = frame && frame.length > 0 ? frame[0].contentWindow : window;
                        if (typeof win.ARENAAUTH !== 'undefined' && typeof win.ARENAAUTH.showPerms !== 'undefined') {
                            win.ARENAAUTH.showPerms();
                        } else {
                            window.alert('No MQTT permissions');
                        }
                    });
                }
                addItem('<a class="dropdown-item" href="/user/v2/logout">Logout</a>');
            } else {
                authDrop.textContent = 'Login';
                const loginLi = addItem('<a class="dropdown-item" href="/user/v2/login">Login</a>');
                const loginA = loginLi.querySelector('a');
                if (loginA) {
                    loginA.addEventListener('click', () => {
                        localStorage.setItem('request_uri', window.location.href);
                    });
                }
            }

            // insert menu after the auth dropdown element
            authDrop.parentNode && authDrop.parentNode.insertBefore(ul, authDrop.nextSibling);
        })
        .catch((err) => console.error('Failed to fetch auth state:', err));

    // copy/store button and active nav highlighting
    const btnCopyStorePath = document.getElementById('btn-copy-store-path');
    const navLinks = Array.from(document.querySelectorAll('.nav-item a'));
    const loc = window.location.pathname.replace(/^\/+|\/+$/g, '');

    navLinks.forEach((a) => {
        try {
            const link = new URL(a.href, window.location.origin).pathname.replace(/^\/+|\/+$/g, '');
            if (loc === 'files') {
                if (btnCopyStorePath) btnCopyStorePath.style.display = '';
            } else {
                if (btnCopyStorePath) btnCopyStorePath.style.display = 'none';
            }
            if (link === loc) {
                a.classList.add('active');
            }
        } catch (e) {
            // ignore malformed hrefs
        }
    });

    // copy the file store public path
    if (btnCopyStorePath) {
        btnCopyStorePath.addEventListener('click', (e) => {
            e.preventDefault();
            let storePath = '';
            try {
                storePath = getStorePath();
            } catch (err) {
                console.error('getStorePath not available', err);
            }
            if (typeof storePath === 'string' && storePath.startsWith('/storemng/files')) {
                storePath = storePath.replace('/storemng/files', '');
                const storeUnscopedPrefix = window.auth && window.auth.is_staff ? '' : `/users/${window.auth && window.auth.username}`;
                const fullPath = `${window.location.protocol}//${window.location.host}/store${storeUnscopedPrefix}${storePath}`;
                navigator.clipboard.writeText(fullPath).then(() => {
                    Swal.fire('Copied!', fullPath, 'success');
                }).catch(() => {
                    Swal.fire('Copied!', fullPath, 'success');
                });
            } else {
                Swal.fire('Invalid path', 'Please navigate to another File Store file or folder', 'warning');
            }
        });
    }

    // coming soon handlers
    document.querySelectorAll('.coming-soon').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            alert('COMING SOON');
        });
    });
}
