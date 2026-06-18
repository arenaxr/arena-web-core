/**
 * @fileoverview Model loading progress system. Manage model load messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Display and update an alert with load info; Used by the model loading progress system.
 * @private
 */

class LoadAlertTable {
    constructor(maxRows = 10, errorsOnTop = true, timeoutMs = 4000, rowTimeout = 2000) {
        this.maxRows = maxRows;
        this.errorsOnTop = errorsOnTop;
        this.timeMs = timeoutMs;
        this.rowTimeout = rowTimeout;
        this.alertBox = document.createElement('div');
        this.alertBox.className = 'alert-box';
        document.body.appendChild(this.alertBox);

        this.titleSpan = document.createElement('span');
        this.titleSpan.className = 'alert-title';
        this.alertBox.appendChild(this.titleSpan);

        this.bodySpan = document.createElement('div');
        this.bodySpan.className = 'alert-body';
        this.alertBox.appendChild(this.bodySpan);

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'alert-progress';
        this.alertBox.appendChild(this.progressBar);

        this.timeoutBar = document.createElement('div');
        this.timeoutBar.className = 'alert-timeout';
        this.alertBox.appendChild(this.timeoutBar);
    }

    parseTableRows(rows) {
        let tableHTML = "<table class='alert-table'>";
        if (this.errorsOnTop) {
            // bring errors to the top lines
            rows.sort((a, b) => {
                if (a.isError === true && b.isError === false) return -1;
                if (a.isError === false && b.isError === true) return 1;
                return 0;
            });
        }
        let nCols = 0;
        if (rows.length > 0) nCols = rows[0].cols.length; // assume the smae number of columns in all lines
        let i;
        for (i = 0; i < Math.min(this.maxRows, rows.length); i++) {
            let lineClass = 'normal';
            if (rows[i].isError) lineClass = 'error';
            tableHTML += `
                <tr><td class='alert-table ${lineClass}'><span>${rows[i].cols.join(`</span></td>
                <td class='alert-table ${lineClass}'><span>`)}</span></td></tr>`;
            nCols++;
        }
        if (i > this.maxRows) tableHTML += `<tr><td colspan='${nCols}'>(more not shown...)</td></tr>`;
        tableHTML += '</table>';

        return tableHTML;
    }

    _display() {
        this.titleSpan.innerText = `${this.title}`;
        this.bodySpan.innerHTML = `${this.tableHTML}`;
        this.alertBox.style.display = 'block';
        this.progressBar.style.width = `${this.progress}%`;

        clearInterval(this.timeoutBarTimer);
        clearTimeout(this.timeout);

        let count = 0;
        this.timeoutBarTimer = setInterval(() => {
            this.timeoutBar.style.width = `${100 - count++}%`;
        }, this.timeMs / 100);

        this.timeout = setTimeout(() => {
            clearInterval(this.timeoutBarTimer);
            this.alertBox.style.display = 'none';
        }, this.timeMs);
    }

    display(title, rows, progress = 0) {
        this.title = title;
        this.progress = progress;
        if (rows) this.tableHTML = this.parseTableRows(rows);
        this._display();
    }
}

/**
 * Model loading progress system. Manage model load messages.
 * @module model-progress
 */
AFRAME.registerSystem('model-progress', {
    ALERT_TIMEOUT: 500,
    ALERT_MAX_ROWS: 1,
    FN_MAX_LENGTH: 50,
    schema: {},
    /**
     * Init system
     * @alias module:model-progress
     */
    init() {
        this.loadProgress = {};
        this.loadAlert = new LoadAlertTable(this.ALERT_MAX_ROWS, true, this.ALERT_TIMEOUT, this.ALERT_TIMEOUT / 2);
    },
    /**
     * Register model to deal with load events
     * @param {object} el - The a-frame element to register.
     * @param {object} src - the model source
     * @alias module:model-progress
     */
    registerModel(el, src) {
        const { demoMode } = ARENA.params;
        if (!AFRAME.THREE.Cache.files[src]) {
            this.loadProgress[src] = {
                done: false,
                failed: false,
                loaded: 0,
                total: 0,
            };
            const _this = this;
            // add load event listeners, only if not already cached
            el.addEventListener('model-progress', (evt) => {
                if (!demoMode) {
                    // Silence model loading progress popup in demo mode
                    _this.updateProgress(false, evt);
                }
            });
            el.addEventListener('model-error', (evt) => {
                _this.updateProgress(true, evt);
            });
        }
    },
    /**
     * Unregister a model
     * @param {object} src - the model source
     * @alias module:model-progress
     */
    unregisterModelBySrc(src) {
        delete this.loadProgress[src];
    },
    /**
     * Updates Model Progress
     * @param {boolean} failed whether or not download was successful
     * @param {object} evt model event
     * @alias module:model-progress
     */
    updateProgress(failed, evt) {
        const thisProgress = this.loadProgress[evt.detail.src];
        if (thisProgress) {
            thisProgress.failed = failed;
            thisProgress.loaded = evt.detail.loaded;
            thisProgress.total = evt.detail.total;

            if (failed || evt.detail.total === 0) {
                if (thisProgress.done === false) {
                    thisProgress.done = true;
                }
                // remove from list after a timeout
                setTimeout(() => {
                    this.unregisterModelBySrc(evt.detail.src);
                }, this.rowTimeout);
            } else if (evt.detail.loaded === evt.detail.total) {
                thisProgress.done = true;
                // Remove from done after a short timeout as well
                setTimeout(() => {
                    this.unregisterModelBySrc(evt.detail.src);
                }, this.rowTimeout);
            }
        }

        let pSum = 0;
        let doneCount = 0;
        const files = [];
        let errors = 0;
        let title;
        let percent;
        const progressEntries = Object.entries(this.loadProgress);
        if (progressEntries.length > 0) {
            progressEntries.forEach(([src, lp]) => {
                const filename = decodeURIComponent(src)
                    .replace(/^.*[\\/]/, '')
                    .split('?')[0];
                const shortName =
                    filename.length < this.FN_MAX_LENGTH
                        ? filename
                        : `…${filename.substring(filename.length - this.FN_MAX_LENGTH)}`;

                let progressStr = '';
                if (lp.failed === false) {
                    if (lp.total > 0) {
                        const progress = (lp.loaded / lp.total) * 100;
                        progressStr = `${parseFloat(progress.toFixed(1))}%`;
                        pSum += progress;
                    } else {
                        pSum += 100;
                        progressStr = `n.a.`;
                    }
                } else {
                    progressStr = 'failed';
                    pSum += 100;
                    errors++;
                }
                if (lp.done) doneCount++;
                files.push({ cols: [shortName, progressStr], isError: lp.failed });
            });
            percent = (pSum / progressEntries.length).toFixed(1);
            title = `Loading : ${percent}% (${doneCount}/${progressEntries.length}`;
            if (errors > 0) {
                title += `; failed ${errors}`;
            }
            title += `)`;
        } else {
            title = 'Loading...';
            percent = 100;
        }

        this.loadAlert.display(title, files, percent);
    },
});
