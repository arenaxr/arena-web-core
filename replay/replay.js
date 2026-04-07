// Position the title overlay just below the navbar once it renders
window.addEventListener('load', () => {
    const header = document.getElementById('header');
    const title = document.getElementById('replay-title');
    if (header && title) {
        title.style.top = `${header.offsetHeight + 10}px`;
    }
});
