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
                    '<ul class=\'dropdown-menu dropdown-menu-end\' role=\'menu\' aria-labelledby=\'auth-dropdow\'></ul>');
                $('ul .dropdown-menu').append(`<li><a class="dropdown-item" href="${host}/user/profile">Profile</a></li>`);
                if (typeof window.showPerms !== 'undefined') {
                    $('ul .dropdown-menu').append(`<li><a class="dropdown-item" id="show_perms" href="#">MQTT Permissions</a></li>`);
                    $('#show_perms').on('click', function() {
                        window.showPerms();
                    });
                }
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
        return link == loc;
    }).parent().addClass('active');

    $('.coming-soon').on('click', function(e) {
        e.preventDefault();
        alert('COMING SOON');
    });
});
