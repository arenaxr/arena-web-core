// Pass scene query param through to the lite iframe
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get('scene') || '';
    const frame = document.getElementById('lite-frame');
    frame.src = `lite.html?scene=${encodeURIComponent(scene)}`;
    if (scene) {
        document.title = `ARENA Lite — ${scene}`;
    }
});
