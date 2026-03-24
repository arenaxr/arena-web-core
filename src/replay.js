import 'aframe';
import axios from 'axios';

// The Replay System
AFRAME.registerSystem('arena-replay', {
    init: function () {
        console.log('ARENA 3D Replay System Initialized');
        
        this.messages = [];
        this.playhead = 0;
        this.isPlaying = false;
        
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.namespace = urlParams.get('namespace');
        this.sceneId = urlParams.get('sceneId');
        this.session = urlParams.get('session');
        
        this.setupUI();
        this.fetchReplayData();
    },
    
    setupUI: function() {
        const playBtn = document.getElementById('playBtn');
        const timeline = document.getElementById('timeline');
        
        if (!playBtn || !timeline) return;
        
        playBtn.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
        });
        
        timeline.addEventListener('input', (e) => {
            // Seek playhead based on percentage
            const pct = e.target.value / 100;
            if (this.messages.length > 0) {
                this.playhead = Math.floor(pct * this.messages.length);
                this.fastForwardTo(this.playhead);
            }
        });
    },
    
    fetchReplayData: async function() {
        if (!this.namespace || !this.sceneId || !this.session) {
            console.error("Missing Replay URL parameters.");
            return;
        }
        
        try {
            // Call arena-recorder REST API
            const res = await axios.get(`/recorder/api/v1/replay?namespace=${this.namespace}&sceneId=${this.sceneId}&session=${this.session}`);
            
            // Assume the response is an array of MQTT payloads or NDJSON that we split
            const data = typeof res.data === 'string' ? res.data.split('\n').filter(l => l.trim()).map(JSON.parse) : res.data;
            this.messages = data;
            
            console.log(`Loaded ${this.messages.length} frames.`);
        } catch(e) {
            console.error("Failed to fetch replay data", e);
        }
    },
    
    fastForwardTo: function(targetIndex) {
        // clear scene and reconstruct state rapidly up to targetIndex
        console.log("Seeking to index", targetIndex);
    },
    
    tick: function (time, timeDelta) {
        if (this.isPlaying && this.messages.length > 0 && this.playhead < this.messages.length) {
            // Pump message locally
            const msg = this.messages[this.playhead];
            
            // In a fully integrated version, we push this msg to the existing ARENA.core.mqttMessage handler.
            console.debug("Pump frame:", msg);
            
            this.playhead++;
            
            const timeline = document.getElementById('timeline');
            if (timeline) {
                timeline.value = (this.playhead / this.messages.length) * 100;
            }
        } else if (this.isPlaying && this.messages.length > 0 && this.playhead >= this.messages.length) {
            // Reached the end
            this.isPlaying = false;
        }
    }
});

// Attach system manually to scene when loaded
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.setAttribute('arena-replay', '');
    }
});
