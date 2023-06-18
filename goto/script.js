(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sceneConfig = urlParams.get('scene');
    urlParams.delete('scene');
    try {
        const config = JSON.parse(atob(sceneConfig));
        // {n:'namespace', s: 'sceneId',r: 4}
        const sceneKey = `${config.n}/${config.s}`;
        const sceneHist = JSON.parse(localStorage.getItem('sceneHistory')) || {};
        let randomSceneNum = sceneHist[sceneKey]?.lastRandom;
        if (!randomSceneNum) {
            randomSceneNum = Math.floor(Math.random() * config.r + 1);
            sceneHist[sceneKey] = { ...sceneHist[sceneKey], lastRandom: randomSceneNum };
            localStorage.setItem('sceneHistory', JSON.stringify(sceneHist));
        }
        const sceneUrl = `/${config.n}/${config.s}_${randomSceneNum}?${urlParams.toString()}`;
        window.location.replace(sceneUrl);
    } catch (e) {
        console.log(e);
        window.location.replace('/');
    }
})();
