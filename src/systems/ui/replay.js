AFRAME.registerSystem('replay-ui', {
    schema: {
        htmlSrc: { type: 'string', default: 'static/html/media-controller.html' },
        totalDuration: { type: 'number', default: 100 },
    },
    async init() {
        // TODO: dynamically load this, for now just always display
        try {
            const htmlRes = await fetch(this.data.htmlSrc);
            const html = await htmlRes.text();
            document.body.insertAdjacentHTML('afterbegin', html);
        } catch (e) {
            console.error('Failed to load replay UI', e);
            return;
        }

        this.playPauseButton = document.getElementById('play-pause-button');
        this.playIcon = document.getElementById('play-icon');
        this.restartButton = document.getElementById('restart-button');
        this.pauseIcon = document.getElementById('pause-icon');
        this.progressBar = document.getElementById('progress-bar');
        this.currentTimeDisplay = document.getElementById('current-time');

        this.isPlaying = false;
        this.currentTime = 0;

        this.setupListeners();
        this.updateTimeDisplay = this.updateTimeDisplay.bind(this);
    },
    updateTimeDisplay(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60)
            .toString()
            .padStart(2, '0');
        this.currentTimeDisplay.textContent = `${minutes}:${seconds}`;
        this.progressBar.value = time;
    },
    setupListeners() {
        this.playPauseButton.addEventListener('click', () => {
            if (this.isPlaying) {
                clearInterval(this.intervalId);
                this.playIcon.style.display = 'block';
                this.pauseIcon.style.display = 'none';
            } else {
                this.intervalId = setInterval(() => {
                    if (this.currentTime < this.data.totalDuration) {
                        this.currentTime++;
                        this.updateTimeDisplay(this.currentTime);
                    } else {
                        clearInterval(this.intervalId);
                    }
                }, 1000);
                this.playIcon.style.display = 'none';
                this.pauseIcon.style.display = 'block';
            }
            this.isPlaying = !this.isPlaying;
        });
        this.restartButton.addEventListener('click', () => {
            clearInterval(this.intervalId);
            this.currentTime = 0;
            this.updateTimeDisplay(this.currentTime);
            this.isPlaying = false;
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
        });

        this.progressBar.addEventListener('input', (event) => {
            this.currentTime = parseInt(event.target.value, 10);
            this.updateTimeDisplay(this.currentTime);
        });
    },
});
