/* global axios, ARENAAUTH, Swal, $ */

window.publicButtons = []; // 1 or 2 buttons depending on auth

function showEl(el, flex = false) {
    const showClass = flex ? 'd-flex' : 'd-block';
    el.classList.add(showClass);
    el.classList.remove('d-none');
}

function hideEls(els, flex = false) {
    const showClass = flex ? 'd-flex' : 'd-block';
    els.forEach((el) => {
        el.classList.add('d-none');
        el.classList.remove(showClass);
    });
}

function changePage(page = 'sceneSelect') {
    if (window.location.hash !== page) {
        window.location.hash = page;
    }
}

// document.addEventListener('DOMContentLoaded', function() { // document.ready() equiv
window.addEventListener('onauth', async (e) => {
    const username = e.detail.mqtt_username;
    const mqttToken = e.detail.mqtt_token;
    const auth = ARENAAUTH.getAuthStatus();

    // all auth types should have access to this page, even anonymous users should be able to read public scenes

    window.username = auth.username;

    // Rudimentary routing based on location hash
    window.addEventListener(
        'hashchange',
        () => {
            const validRoutes = ['#sceneSelect', '#cloneScene'];
            const routePage = validRoutes.includes(window.location.hash) ? window.location.hash : '#sceneSelect';
            const pageEl = document.querySelector(routePage);
            hideEls(document.querySelectorAll(`.routePage:not(${routePage})`));
            showEl(pageEl, true);
            pageEl.dispatchEvent(new Event('routePageLoaded'));
        },
        false
    );

    document.getElementById('closeCloneScene').addEventListener('click', () => {
        changePage('#sceneSelect');
    });

    const selectEl = $('select');
    selectEl.each(function selectEach() {
        $(this).select2({
            theme: 'bootstrap5',
            width: $(this).data('width') ? $(this).data('width') : $(this).hasClass('w-100') ? '100%' : 'style',
            placeholder: $(this).data('placeholder'),
            allowClear: Boolean($(this).data('allow-clear')),
            closeOnSelect: !$(this).attr('multiple'),
        });
    });
    selectEl.val(null).trigger('change');

    const usernameSelect = document.getElementById('username');
    if (usernameSelect) usernameSelect.textContent = username;

    const userSceneSelect = document.getElementById('userSceneSelect');
    const userSceneUrl = document.getElementById('userSceneUrl');

    const enterUserSceneBtn = document.getElementById('enterUserSceneBtn');
    const enterArUserSceneBtn = document.getElementById('enterArUserSceneBtn');
    const cloneUserSceneBtn = document.getElementById('cloneUserSceneBtn');
    const deleteUserSceneBtn = document.getElementById('deleteUserSceneBtn');
    const copyUserSceneUrlBtn = document.getElementById('copyUserSceneUrlBtn');
    const advancedLinksUserBtn = document.getElementById('advancedLinksUserBtn');

    const clonePublicSceneBtn = document.getElementById('clonePublicSceneBtn');
    const publicSceneSelect = document.getElementById('publicSceneSelect');
    const publicSceneUrl = document.getElementById('publicSceneUrl');

    const enterPublicSceneBtn = document.getElementById('enterPublicSceneBtn');
    const enterArPublicSceneBtn = document.getElementById('enterArPublicSceneBtn');

    const advancedLinksDiv = document.getElementById('uri-builder');
    const userNoteSpan = document.getElementById('userNoteSpan');
    const tabMyScenes = document.getElementById('myscenes-tab');
    const uriBuilderCheckboxes = document.querySelectorAll('input[type=checkbox][name=uri-builder]');
    const scenePermsLink = document.getElementById('scenePermsLink');

    window.publicButtons.push(enterPublicSceneBtn);
    window.publicButtons.push(enterArPublicSceneBtn);
    if (auth.authenticated) {
        window.publicButtons.push(clonePublicSceneBtn); // add clone option for full user
        tabMyScenes.parentElement.style.display = 'block';
    } else {
        tabMyScenes.parentElement.style.display = 'none'; // anon users may not edit scenes
        userNoteSpan.textContent = 'To create or clone scenes, please login with an authenticated account.';
    }

    const toggleUserSceneButtons = (toggle) => {
        [
            enterUserSceneBtn,
            enterArUserSceneBtn,
            cloneUserSceneBtn,
            deleteUserSceneBtn,
            copyUserSceneUrlBtn,
            advancedLinksUserBtn,
        ].forEach((btn) => {
            toggle ? btn.classList.remove('disabled') : btn.classList.add('disabled');
        });
    };

    const togglePublicSceneButtons = (toggle) => {
        window.publicButtons.forEach((btn) => {
            toggle ? btn.classList.remove('disabled') : btn.classList.add('disabled');
        });
    };

    function checkUserSceneSelect(_e) {
        if (_e.target.value) {
            window.userSceneId = _e.target.value;
            updateUriBuilderCheckboxes(true);
            updateUserSceneUrlBox(`${window.location.origin}/${_e.target.value}`);
            scenePermsLink.href = `${window.location.origin}/user/v2/profile/scenes/${_e.target.value}`;
            deleteUserSceneBtn.value = _e.target.value;
            toggleUserSceneButtons(true);
        } else {
            window.userSceneId = '';
            updateUserSceneUrlBox('No valid scene selected');
            toggleUserSceneButtons(false);
        }
    }

    function checkPublicSceneSelect(_e) {
        if (_e.target.value) {
            window.publicSceneId = _e.target.value;
            publicSceneUrl.value = `${window.location.origin}/${_e.target.value}`;
            togglePublicSceneButtons(true);
            console.log('valid public', _e.target.value);
        } else {
            window.publicSceneId = '';
            publicSceneUrl.value = '';
            togglePublicSceneButtons(false);
            console.log('invalid public', _e.target.value);
        }
    }

    $(userSceneSelect).on('select2:select', checkUserSceneSelect);
    $(publicSceneSelect).on('select2:select', checkPublicSceneSelect);

    enterPublicSceneBtn.addEventListener('click', () => (window.location = publicSceneUrl.value));
    enterArPublicSceneBtn.addEventListener('click', () => (window.location = `${publicSceneUrl.value}?armode=1`));
    copyUserSceneUrlBtn.addEventListener('click', () => {
        userSceneUrl.select();
        userSceneUrl.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand('copy');
    });
    enterUserSceneBtn.addEventListener('click', () => (window.location = userSceneUrl.value));
    enterArUserSceneBtn.addEventListener('click', () => (window.location = `${userSceneUrl.value}?armode=1`));

    // set listeners for advanced links URI-builder
    advancedLinksUserBtn.addEventListener('click', () => {
        advancedLinksDiv.hidden = !advancedLinksDiv.hidden;
        updateUriBuilderCheckboxes(advancedLinksDiv.hidden);
    });
    uriBuilderCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const uriSettings = [];
            uriBuilderCheckboxes.forEach((_checkbox) => {
                if (_checkbox.checked) {
                    uriSettings.push(_checkbox.id);
                }
            });
            const sceneUrl = new URL(`${window.location.origin}/${window.userSceneId}`);
            uriSettings.forEach((setting) => {
                switch (setting) {
                    case 'armodeCheck':
                        sceneUrl.searchParams.append('armode', '1');
                        break;
                    case 'vrCheck':
                        sceneUrl.searchParams.append('vr', '1');
                        break;
                    case 'startLastPosCheck':
                        sceneUrl.searchParams.append('startLastPos', '1');
                        break;
                    case 'noreticleCheck':
                        sceneUrl.searchParams.append('noreticle', '1');
                        break;
                    case 'nonameCheck':
                        sceneUrl.searchParams.append('noname', '1');
                        break;
                    case 'anonymousCheck':
                        sceneUrl.searchParams.append('auth', 'anonymous');
                        break;
                    case 'skipavCheck':
                        sceneUrl.searchParams.append('skipav', '1');
                        break;
                    case 'noavCheck':
                        sceneUrl.searchParams.append('noav', '1');
                        break;
                    case 'demoModeCheck':
                        sceneUrl.searchParams.append('demoMode', '1');
                        break;
                    default:
                    // skip
                }
            });
            updateUserSceneUrlBox(sceneUrl.href);
        });
    });

    function updateUriBuilderCheckboxes(clear) {
        if (clear) {
            uriBuilderCheckboxes.forEach((checkbox) => {
                checkbox.checked = false;
            });
        }
    }

    function updateUserSceneUrlBox(sceneUrl) {
        userSceneUrl.value = sceneUrl;
        // update scene url box height as it expands/shrinks
        userSceneUrl.style.overflow = 'hidden';
        userSceneUrl.style.height = 0;
        userSceneUrl.style.height = `${userSceneUrl.scrollHeight}px`;
    }

    deleteUserSceneBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${deleteUserSceneBtn.value}?`)) {
            const deletes = [
                axios.delete(`/user/v2/scenes/${deleteUserSceneBtn.value}`, {
                    withCredentials: true,
                }),
                axios.delete(`/persist/${deleteUserSceneBtn.value}`),
            ];
            axios
                .all(deletes)
                .then(() => {
                    Swal.fire({
                        title: 'Delete success!',
                        html: `${deleteUserSceneBtn.value} has been deleted.`,
                        icon: 'info',
                        willClose: () => {
                            window.location.reload();
                        },
                    });
                })
                .catch((err) => {
                    Swal.fire('Scene Delete Failed!', err.response.data, 'warning');
                    console.log(err);
                });
        }
    });

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

    /*  *********************** */

    const newSceneNameInput = document.getElementById('newSceneNameInput');
    const doCloneSceneBtn = document.getElementById('doCloneSceneBtn');
    const cloneSceneUrl = document.getElementById('cloneSceneUrl');
    const sourceScene = document.getElementById('sourceScene');

    function resetCloneScene() {
        sourceScene.value = window.cloneSceneId;
        newSceneNameInput.value = '';
        document.getElementById('cloneSceneCreated').classList.add('d-none');
        document.getElementById('doCloneSceneContainer').classList.remove('d-none');
    }

    newSceneNameInput.addEventListener('keyup', (_e) => {
        if (_e.target.value) {
            doCloneSceneBtn.classList.remove('disabled');
        } else {
            doCloneSceneBtn.classList.add('disabled');
        }
    });

    document.getElementById('doCloneSceneBtn').addEventListener('click', () => {
        const [namespace, sceneId] = sourceScene.value.split('/');
        axios
            .post(`/persist/${window.username}/${newSceneNameInput.value}`, {
                action: 'clone',
                namespace,
                sceneId,
            })
            .then((res) => {
                Swal.fire('Clone success!', `${res.data.objectsCloned} objects cloned into new scene`, 'success');
                cloneSceneUrl.value = `${window.location.origin}/${window.username}/${newSceneNameInput.value}`;
                document.getElementById('doCloneSceneContainer').classList.add('d-none');
                document.getElementById('cloneSceneCreated').classList.remove('d-none');
                newSceneNameInput.setAttribute('readonly', 'readonly');
            })
            .catch((err) => {
                Swal.fire('Scene Clone Failed!', err.response.data, 'warning');
                console.log(err);
            });
    });

    const copyCloneSceneUrlBtn = document.getElementById('copyCloneSceneUrlBtn');
    copyCloneSceneUrlBtn.addEventListener('click', () => {
        cloneSceneUrl.select();
        cloneSceneUrl.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand('copy');
    });

    document.getElementById('enterCloneSceneBtn').addEventListener('click', () => {
        window.location = cloneSceneUrl.value;
    });

    // Request editable scenes...
    // my_scenes may include 'public' namespaces for staff
    // my_scenes may include other editor namespaces that have been granted
    axios
        .get('/user/v2/my_scenes', {
            withCredentials: true,
        })
        .then((res) => {
            res.data.forEach((ns) => {
                userSceneSelect.options.add(new Option(ns.name, ns.name));
            });
        })
        .catch((err) => {
            Swal.fire('My Scene Load Failed!', err.response.data, 'warning');
            console.log(err);
        });

    // Request public scenes...
    axios
        .get('/persist/public/!allscenes', {
            withCredentials: true,
        })
        .then((res) => {
            res.data.forEach((ns) => {
                publicSceneSelect.options.add(new Option(ns, ns));
            });
        })
        .catch((err) => {
            Swal.fire('Public Scene Load Failed!', err.response.data, 'warning');
            console.log(err);
        });

    window.dispatchEvent(new Event('hashchange')); // Manually trigger initial hash routing
});
