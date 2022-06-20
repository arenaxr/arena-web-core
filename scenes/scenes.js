/**
 * scenes-user.js - Scene Landing Full User handler
 */

'use strict';

// document.addEventListener('DOMContentLoaded', function() { // document.ready() equiv
window.addEventListener('onauth', async function(e) {
    const username = e.detail.mqtt_username;
    const mqttToken = e.detail.mqtt_token;
    const auth = getAuthStatus();
    window.username = auth.username;
    // auth.authenticated
    // authType.textContent = auth.type;
    // authUsername.textContent = auth.username;
    // authFullname.textContent = auth.fullname;
    // authEmail.textContent = auth.email;

    const usernameSelect = document.getElementById('username');
    $(usernameSelect).text(username);

    const userSceneSelect = document.getElementById('userSceneSelect');
    const userSceneUrl = document.getElementById('userSceneUrl');

    const enterUserSceneBtn = document.getElementById('enterUserSceneBtn');
    const cloneUserSceneBtn = document.getElementById('cloneUserSceneBtn');
    const deleteUserSceneBtn = document.getElementById('deleteUserSceneBtn');
    const copyUserSceneUrlBtn = document.getElementById('copyUserSceneUrlBtn')

    const clonePublicSceneBtn = document.getElementById('clonePublicSceneBtn');

    const toggleUserSceneButtons = (toggle) => {
        [enterUserSceneBtn, cloneUserSceneBtn, deleteUserSceneBtn, copyUserSceneUrlBtn].forEach((btn) => {
            toggle ? btn.classList.remove('disabled') : btn.classList.add('disabled')
        })
    }

    $(userSceneSelect).on('select2:select', checkUserSceneSelect);

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

    copyUserSceneUrlBtn.addEventListener('click', () => {
        userSceneUrl.select();
        userSceneUrl.setSelectionRange(0, 99999); /* For mobile devices */
        document.execCommand("copy");
    })
    enterUserSceneBtn.addEventListener('click', () =>
        window.location = userSceneUrl.value
    )

    deleteUserSceneBtn.addEventListener('click', () => {
        const csrfmiddlewaretoken = document.getElementsByName("csrfmiddlewaretoken")[0].value
        if (confirm(`Are you sure you want to delete ${deleteUserSceneBtn.value}?`)) {
            const deletes = [
                axios.delete(`scenes/${deleteUserSceneBtn.value}`, {
                    headers: {
                        'X-CSRFToken': csrfmiddlewaretoken
                    },
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
                Swal.fire('Scene Delete Failed!', `Something went wrong!`, 'warning');
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

    if (auth.authenticated) {
        window.publicButtons.push(clonePublicSceneBtn); // add clone option for full user
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
            Swal.fire('Scene Clone Failed!', `Something went wrong!`, 'warning');
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
        Swal.fire('My Scene Load Failed!', `Something went wrong!`, 'warning');
        console.log(err);
    });

    // Request public scenes...
    axios.get('/persist/public/all', {
        withCredentials: true
    }).then((res) => {
        res.data.forEach(ns => {
            userSceneSelect.options.add(new Option(ns.name, ns.name));
        });
    }).catch((err) => {
        Swal.fire('Public Scene Load Failed!', `Something went wrong!`, 'warning');
        console.log(err);
    });
});
