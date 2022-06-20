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

document.addEventListener('DOMContentLoaded', function () {   // document.ready() equiv

    // Rudimentary routing based on location hash
    window.addEventListener('hashchange', function () {
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

    $('select').each(function () {
        $(this).select2({
            theme: 'bootstrap4',
            width: $(this).data('width') ? $(this).data('width') : $(this).hasClass('w-100') ? '100%' : 'style',
            placeholder: $(this).data('placeholder'),
            allowClear: Boolean($(this).data('allow-clear')),
            closeOnSelect: !$(this).attr('multiple'),
        });
    });
    $('select').val(null).trigger('change');

    const publicSceneSelect = document.getElementById('publicSceneSelect');
    const publicSceneUrl = document.getElementById('publicSceneUrl');

    const enterPublicSceneBtn = document.getElementById('enterPublicSceneBtn');

    window.userSceneId = '';
    window.publicSceneId = '';
    window.cloneSceneId = '';

    window.publicButtons.push(enterPublicSceneBtn); // just one, for anon case
    const togglePublicSceneButtons = (toggle) => {
        publicButtons.forEach((btn) => {
            toggle ? btn.classList.remove('disabled') : btn.classList.add('disabled')
        })
    }

    $(publicSceneSelect).on('select2:select', checkPublicSceneSelect);

    function checkPublicSceneSelect(e) {
        if (e.target.value ) {
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




    window.dispatchEvent(new Event('hashchange')); // Manually trigger initial hash routing
});
