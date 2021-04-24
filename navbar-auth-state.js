    // update auth state in nav bar
    $(document).ready(function() {
        fetch('/user/user_state')
            .then(response => response.json())
            .then(data => {
                const host = `${window.location.protocol}//${window.location.host}`;
                if (data.authenticated) {
                    $("#auth-dropdown").html(`${data.username} <b class='caret'></b>`);
                    $("#auth-dropdown").attr("class", "dropdown-toggle");
                    $("#auth-dropdown").attr("data-toggle", "dropdown");
                    $("#auth-dropdown").after(
                        "<ul class='dropdown-menu' role='menu' aria-labelledby='dropdownMenu'></ul>")
                    $("ul .dropdown-menu").append(`<li><a href="${host}/user/profile">Profile</a></li>`);
                    $("ul .dropdown-menu").append(
                        `<li><a href="#" onclick="window.showPerms();">MQTT Permissions</a></li>`);
                    $("ul .dropdown-menu").append(`<li><a href="${host}/user/logout">Logout</a></li>`);
                } else {
                    $("#auth-dropdown").html("Login");
                    $("#auth-dropdown").attr("href", `${host}/user/login`);
                }
            });
    });
