'use strict';

window.publicButtons = []; // 1 or 2 buttons depending on auth

function showEl(el, flex = false) {
    const showClass = flex ? 'd-flex' : 'd-block';
    el.classList.add(showClass);
    el.classList.remove('d-none');
}

function hideEls(els, flex = false) {
    const showClass = flex ? 'd-flex' : 'd-block';
    for (let el of els) {
        el.classList.add('d-none');
        el.classList.remove(showClass);
    }
}

function changePage(page = 'sceneSelect') {
    if (window.location.hash !== page) {
        window.location.hash = page;
    }
}

// document.addEventListener('DOMContentLoaded', function() { // document.ready() equiv
window.addEventListener('onauth', async function(e) {
    const username = e.detail.mqtt_username;
    const mqttToken = e.detail.mqtt_token;
    const auth = getAuthStatus();
    window.username = auth.username;

    // Rudimentary routing based on location hash
    window.addEventListener('hashchange', function() {
        const validRoutes = [
            '#sceneSelect',
            '#cloneScene',
        ];
        const routePage = validRoutes.includes(window.location.hash) ? window.location.hash : '#sceneSelect';
        const pageEl = document.querySelector(routePage);
        hideEls(document.querySelectorAll(`.routePage:not(${routePage})`));
        showEl(pageEl, true);
        pageEl.dispatchEvent(new Event('routePageLoaded'));
    }, false);

    document.getElementById('closeCloneScene').addEventListener('click', () => {
        changePage('#sceneSelect');
    })

    $('select').each(function() {
        $(this).select2({
            theme: 'bootstrap4',
            width: $(this).data('width') ? $(this).data('width') : $(this).hasClass('w-100') ? '100%' : 'style',
            placeholder: $(this).data('placeholder'),
            allowClear: Boolean($(this).data('allow-clear')),
            closeOnSelect: !$(this).attr('multiple'),
        });
    });
    $('select').val(null).trigger('change');

    const usernameSelect = document.getElementById('username');
    $(usernameSelect).text(username);

    const userSceneSelect = document.getElementById('userSceneSelect');
    const userSceneUrl = document.getElementById('userSceneUrl');

    const enterUserSceneBtn = document.getElementById('enterUserSceneBtn');
    const cloneUserSceneBtn = document.getElementById('cloneUserSceneBtn');
    const deleteUserSceneBtn = document.getElementById('deleteUserSceneBtn');
    const copyUserSceneUrlBtn = document.getElementById('copyUserSceneUrlBtn')

    const clonePublicSceneBtn = document.getElementById('clonePublicSceneBtn');
    const publicSceneSelect = document.getElementById('publicSceneSelect');
    const publicSceneUrl = document.getElementById('publicSceneUrl');

    const enterPublicSceneBtn = document.getElementById('enterPublicSceneBtn');

    const userNoteSpan = document.getElementById('userNoteSpan');
    const tabMyScenes = document.getElementById('myscenes-tab');

    const toggleUserSceneButtons = (toggle) => {
        [enterUserSceneBtn, cloneUserSceneBtn, deleteUserSceneBtn, copyUserSceneUrlBtn].forEach((btn) => {
            toggle ? btn.classList.remove('disabled') : btn.classList.add('disabled')
        })
    }

    $(userSceneSelect).on('select2:select', checkUserSceneSelect);
    $(publicSceneSelect).on('select2:select', checkPublicSceneSelect);

    function checkUserSceneSelect(e) {
        if (e.target.value) {
            window.userSceneId = e.target.value;
            userSceneUrl.value = `${window.location.origin}/${e.target.value}`
            deleteUserSceneBtn.value = e.target.value;
            toggleUserSceneButtons(true);
        } else {
            window.userSceneId = '';
            userSceneUrl.value = 'No valid scene selected';
            toggleUserSceneButtons(false);
        }
    }

    function checkPublicSceneSelect(e) {
        if (e.target.value) {
            window.publicSceneId = e.target.value;
            publicSceneUrl.value = `${window.location.origin}/${e.target.value}`
            togglePublicSceneButtons(true);
            console.log("valid public", e.target.value)
        } else {
            window.publicSceneId = '';
            publicSceneUrl.value = '';
            togglePublicSceneButtons(false);
            console.log("invalid public", e.target.value)
        }
    }
    enterPublicSceneBtn.addEventListener('click', () =>
        window.location = publicSceneUrl.value
    )
    copyUserSceneUrlBtn.addEventListener('click', () => {
        userSceneUrl.select();
        userSceneUrl.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
    })
    enterUserSceneBtn.addEventListener('click', () =>
        window.location = userSceneUrl.value
    )

    deleteUserSceneBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${deleteUserSceneBtn.value}?`)) {
            const deletes = [
                axios.delete(`scenes/${deleteUserSceneBtn.value}`, {
                    withCredentials: true
                }),
                axios.delete(`/persist/${deleteUserSceneBtn.value}`)
            ]
            axios.all(deletes).then(() => {
                Swal.fire({
                    title: 'Delete success!',
                    html: `${deleteUserSceneBtn.value} has been deleted.`,
                    icon: 'info',
                    willClose: () => {
                        location.reload();
                    }
                });
            }).catch((err) => {
                Swal.fire('Scene Delete Failed!', err.response.data, 'warning');
                console.log(err);
            });
        }
    })

    cloneUserSceneBtn.addEventListener('click', () => {
        window.cloneSceneId = window.userSceneId;
        resetCloneScene();
        changePage('cloneScene');
    });

    clonePublicSceneBtn.addEventListener('click', () => {
        window.cloneSceneId = window.publicSceneId;
        resetCloneScene();
        changePage('cloneScene');
    });

    window.userSceneId = '';
    window.publicSceneId = '';
    window.cloneSceneId = '';

    if (auth.authenticated) {
        window.publicButtons.push(clonePublicSceneBtn); // add clone option for full user
        //tabMyScenes.parentElement.style.display = 'inline-block';
    } else {
        tabMyScenes.parentElement.style.display = 'none'; // anon users may not edit scenes
        userNoteSpan.textContent = 'To create or clone scenes, please login with an authenticated account.';
    }

    /*  *********************** */

    const newSceneNameInput = document.getElementById('newSceneNameInput');
    const doCloneSceneBtn = document.getElementById('doCloneSceneBtn');
    const cloneSceneUrl = document.getElementById('cloneSceneUrl');
    const sourceScene = document.getElementById('sourceScene');

    function resetCloneScene() {
        sourceScene.value = window.cloneSceneId;
        newSceneNameInput.value = "";
        document.getElementById('cloneSceneCreated').classList.add('d-none');
        document.getElementById('doCloneSceneContainer').classList.remove('d-none');
    }

    newSceneNameInput.addEventListener('keyup', (e) => {
        if (e.target.value) {
            doCloneSceneBtn.classList.remove('disabled');
        } else {
            doCloneSceneBtn.classList.add('disabled');
        }
    })

    document.getElementById('doCloneSceneBtn').addEventListener('click', () => {
        const [namespace, sceneId] = sourceScene.value.split("/")
        axios.post(`/persist/${window.username}/${newSceneNameInput.value}`, {
            action: 'clone',
            namespace,
            sceneId,
        }).then((res) => {
            Swal.fire('Clone success!', `${res.data.objectsCloned} objects cloned into new scene`, 'success');
            cloneSceneUrl.value = `${window.location.origin}/${window.username}/${newSceneNameInput.value}`
            document.getElementById('doCloneSceneContainer').classList.add('d-none');
            document.getElementById('cloneSceneCreated').classList.remove('d-none');
            newSceneNameInput.setAttribute('readonly', 'readonly')
        }).catch((err) => {
            Swal.fire('Scene Clone Failed!', err.response.data, 'warning');
            console.log(err);
        });
    })

    const copyCloneSceneUrlBtn = document.getElementById('copyCloneSceneUrlBtn')
    copyCloneSceneUrlBtn.addEventListener('click', () => {
        cloneSceneUrl.select();
        cloneSceneUrl.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
    })

    document.getElementById('enterCloneSceneBtn').addEventListener('click', () => {
        window.location = cloneSceneUrl.value;
    })

    // Request editable scenes...
    // my_scenes may include 'public' namespaces for staff
    // my_scenes may include other editor namespaces that have been granted
    axios.get('/user/my_scenes', {
        withCredentials: true
    }).then((res) => {
        res.data.forEach(ns => {
            userSceneSelect.options.add(new Option(ns.name, ns.name));
        });
    }).catch((err) => {
        Swal.fire('My Scene Load Failed!', err.response.data, 'warning');
        console.log(err);
    });

    // Request public scenes...
    axios.get('/persist/public/!allscenes', {
        withCredentials: true
    }).then((res) => {
        res.data.forEach(ns => {
            userSceneSelect.options.add(new Option(ns.name, ns.name));
        });
    }).catch((err) => {
        Swal.fire('Public Scene Load Failed!', err.response.data, 'warning');
        console.log(err);
    });

    if (!auth.authenticated) {
        window.dispatchEvent(new Event('hashchange')); // Manually trigger initial hash routing
    }
});
