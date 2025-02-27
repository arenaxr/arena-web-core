AFRAME.registerSystem('replay-ui', {
    schema: {
        htmlSrc: { type: 'string', default: 'static/html/media-controller.html' },
        totalDuration: { type: 'number', default: 123 },
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
        this.totalDurationDisplay = document.getElementById('total-duration');

        this.isPlaying = false;
        this.currentTime = 0;

        this.setupListeners();
        this.updateCurrentTimeDisplay = this.updateCurrentTimeDisplay.bind(this);
        this.updateTotalDurationDisplay = this.updateTotalDurationDisplay.bind(this);
        this.updatePlayIcon = this.updatePlayIcon.bind(this);

        this.updateTotalDurationDisplay();
    },
    update(oldData) {
        if (oldData.totalDuration !== this.data.totalDuration) {
            this.updateTotalDurationDisplay();
        }
    },
    updateTotalDurationDisplay() {
        if (!this.totalDurationDisplay) return;
        const minutes = Math.floor(this.data.totalDuration / 60);
        const seconds = Math.floor(this.data.totalDuration % 60)
            .toString()
            .padStart(2, '0');
        this.totalDurationDisplay.textContent = `${minutes}:${seconds}`;
    },
    updateCurrentTimeDisplay(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60)
            .toString()
            .padStart(2, '0');
        this.currentTimeDisplay.textContent = `${minutes}:${seconds}`;
        this.progressBar.value = Math.round((time * 100) / this.data.totalDuration);
    },
    updatePlayIcon() {
        if (this.isPlaying) {
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
        } else {
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
        }
    },
    setupListeners() {
        this.playPauseButton.addEventListener('click', () => {
            if (this.isPlaying) {
                clearInterval(this.intervalId);
            } else {
                if (this.currentTime >= this.data.totalDuration) {
                    this.currentTime = 0;
                }
                this.intervalId = setInterval(() => {
                    if (this.currentTime < this.data.totalDuration) {
                        this.currentTime++;
                        this.updateCurrentTimeDisplay(this.currentTime);
                    } else {
                        clearInterval(this.intervalId);
                        this.isPlaying = false;
                        this.updatePlayIcon();
                    }
                }, 1000);
            }
            this.isPlaying = !this.isPlaying;
            this.updatePlayIcon();
        });
        this.restartButton.addEventListener('click', () => {
            clearInterval(this.intervalId);
            this.currentTime = 0;
            this.updateCurrentTimeDisplay(this.currentTime);
            this.isPlaying = false;
            this.updatePlayIcon();
        });

        this.progressBar.addEventListener('input', (event) => {
            this.currentTime = parseInt(event.target.value, 10);
            this.updateCurrentTimeDisplay(this.currentTime);
        });
    },
});
