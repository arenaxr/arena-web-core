/* global AFRAME */
import he from 'he';
import Swal from 'sweetalert2';
import './gltf-progress-style.css';

/**
 * @fileoverview GLTF model loading progress system. Manage GLTF load messages.
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

/**
 * Display and update an alert with load info; Used by the GLTF model loading progress system. 
 * @private
 */
 class LoadAlertTable {
    constructor(maxRows=10, errorsOnTop=true, timeoutMs=5000) {
      this.maxRows = maxRows;
      this.errorsOnTop = errorsOnTop;
      this.timeMs = timeoutMs;
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
      let outHTML='' 
      let tableHTML='<table class="alert-table">';
      if (this.errorsOnTop) { // bring errors to the top lines
        rows.sort((a, b) => { 
          if (a.isError == true && b.isError == false) return -1;
          if (a.isError == false && b.isError == true) return 1;
          return 0;        
        })
      }
      let nCols=0;
      if (rows.length > 0) nCols=rows[0].cols.length; // assume the smae number of columns in all lines
      for (var i=0; i<Math.min(this.maxRows, rows.length); i++) {
        let lineClass='normal';
        if (rows[i].isError) lineClass = 'error';
        tableHTML += `<tr><td class="alert-table ${lineClass}"><span>${rows[i].cols.join(`</span></td><td class="alert-table ${lineClass}"><span>`)}</span></td></tr>`;
        nCols
      }
      if (i > this.maxRows) tableHTML += `<tr><td colspan=${nCols}>(more not shown...)</td></tr>`;
      tableHTML+='</table>';
  
      return tableHTML;
    }
    
    _display() {
            this.titleSpan.innerText = `${this.title}`;
            this.bodySpan.innerHTML = `${this.tableHTML}`;
            this.alertBox.style.display = 'block';
            this.progressBar.style.width = `${this.progress}%`;
      
            clearInterval(this.timeoutBarTimer);
            clearTimeout(this.timeout);
      
            let count = 1;
            this.timeoutBarTimer = setInterval(() => {
                this.timeoutBar.style.width = `${100-count}%`;
                count = count + 1;
            }, this.timeMs/100);
  
            this.timeout = setTimeout(() => {
                clearInterval(this.timeoutBarTimer);
                this.alertBox.style.display = 'none';
            }, this.timeMs);    
    }
    
    display(title, rows, progress=0) {
            this.title = title;
            this.progress = progress;
            if (rows) this.tableHTML = this.parseTableRows(rows);
            this._display();          
    }  
 }

/**
 * GLTF model loading progress system. Manage GLTF load messages.
 * @module gltf-model-progress
 */
 AFRAME.registerSystem("gltf-model-progress", {
    ALERT_TIMEOUT: 5000,
    ALERT_MAX_ROWS: 10,
    FN_MAX_LENGTH: 50,
    schema: {},
    /**
     * Init system
     * @alias module:gltf-model-progress
     */     
    init: function() {
      this.loadProgress = {};
      this.loadAlert = new LoadAlertTable(this.ALERT_MAX_ROWS, true, this.ALERT_TIMEOUT);
    },
    /**
     * Register a gltf-model to deal with load events
     * @param {object} el - The a-frame element to register.
     * @alias module:gltf-model-progress
     */
    registerGltf: function(el) {
      const src = el.getAttribute("gltf-model");
      if (!AFRAME.THREE.Cache.files[src]) {
        this.loadProgress[src] = {
          done: false,
          failed: false,
          progress: 0
        };
        const _this = this;
        // add load event listeners, only if not already cached
        el.addEventListener("model-progress", evt => {
          _this.updateProgress(false, evt);
        });
        el.addEventListener("model-error", evt => {
          _this.updateProgress(true, evt);
        });
      }
    },
    /**
     * Unregister a gltf-model
     * @param {object} el - The a-frame element.
     * @alias module:gltf-model-progress
     */
    unregisterGltfBySrc: function(src) {
      delete this.loadProgress[src];
    },
    /**
     * Updates GLTF Progress
     * @param {boolean} failed whether or not download was successful
     * @param {object} evt gltf event
     * @alias module:gltf-model-progress
     */
    updateProgress: function(failed, evt) {
      this.loadProgress[evt.detail.src].failed = failed;
      this.loadProgress[evt.detail.src].progress = evt.detail.progress;

      //console.log(failed, evt.detail.progress == Infinity, evt.detail.progress == 100);
      if (failed || evt.detail.progress == Infinity || evt.detail.progress == 100) {
        if (this.loadProgress[evt.detail.src].done == false) {
          this.loadProgress[evt.detail.src].done = true;
        }
        // remove from list after a timeout
        setTimeout(() => {
          this.unregisterGltfBySrc(evt.detail.src);
        }, this.ALERT_TIMEOUT*2);
      }

      let pSum = 0;
      let doneCount = 0;
      let files = [];
      let errors = 0;
      for (const [src, lp] of Object.entries(this.loadProgress)) {
        var filename = decodeURIComponent(src).replace(/^.*[\\\/]/, "").split("?")[0];
        const shortName = filename.length < this.FN_MAX_LENGTH ? filename : `…${filename.substring(filename.length - this.FN_MAX_LENGTH)}`;
        
        let progessStr = "";
        if (lp.failed == false) {
          if (lp.progress !== Infinity && lp.progress !== undefined) {
            progessStr = `${parseFloat(lp.progress.toFixed(1))}%`;
            pSum += lp.progress;
          } else {
            pSum += 100;
            progessStr = `n.a.`;
          }
        } else {
          progessStr = "failed";
          pSum += 100;
          errors++;
        }
        if (lp.done) doneCount++;
        files.push({cols:[shortName,progessStr], isError:lp.failed});
      }
      let percent = (pSum / Object.keys(this.loadProgress).length).toFixed(1);
      let title = `Loading GLTF: ${parseFloat((pSum / Object.keys(this.loadProgress).length).toFixed(1))}% (${doneCount}/${Object.keys(this.loadProgress).length}`;
      if (errors > 0) {
        title += `; failed ${errors}`;
      }
      title += `)`;

      this.loadAlert.display(title, files, percent);
    }
    
  });

