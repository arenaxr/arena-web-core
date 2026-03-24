import axios from 'axios';

// The Replay System
AFRAME.registerSystem('arena-replay', {
    init: function () {
        console.log('ARENA 3D Replay System Initialized');
        
        this.messages = [];
        this.playhead = 0;
        this.isPlaying = false;
        
        this.setupUI();
        this.fetchRecordingsList();
    },
    
    setupUI: function() {
        const playBtn = document.getElementById('playBtn');
        const timeline = document.getElementById('timeline');
        const recordingSelect = document.getElementById('recordingSelect');
        
        if (!playBtn || !timeline || !recordingSelect) return;
        
        playBtn.addEventListener('click', () => {
            if (this.messages.length > 0) {
                this.isPlaying = !this.isPlaying;
            }
        });
        
        timeline.addEventListener('input', (e) => {
            const pct = e.target.value / 100;
            if (this.messages.length > 0) {
                this.playhead = Math.floor(pct * this.messages.length);
                this.fastForwardTo(this.playhead);
            }
        });

        recordingSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.fetchReplayData(e.target.value);
            }
        });
    },

    fetchRecordingsList: async function() {
        try {
            const res = await axios.get('/recorder/list', { withCredentials: true });
            const select = document.getElementById('recordingSelect');
            if (res.data && res.data.length > 0) {
                res.data.forEach(rec => {
                    const opt = document.createElement('option');
                    opt.value = rec.filename;
                    const date = new Date(parseInt(rec.timestamp) * 1000).toLocaleString();
                    opt.text = `${rec.name} (${date})`;
                    select.appendChild(opt);
                });
            }
        } catch(e) {
            console.error("Failed to fetch recordings list", e);
        }
    },
    
    fetchReplayData: async function(filename) {
        this.isPlaying = false;
        this.messages = [];
        this.playhead = 0;
        document.getElementById('timeline').value = 0;

        try {
            const res = await axios.get(`/recorder/files/${filename}`, { withCredentials: true });
            const data = typeof res.data === 'string' ? res.data.split('\n').filter(l => l.trim()).map(JSON.parse) : res.data;
            this.messages = data;
            console.log(`Loaded ${this.messages.length} frames.`);
            
            // Reconstruct the start frame
            this.fastForwardTo(0);
        } catch(e) {
            console.error("Failed to fetch replay data", e);
        }
    },
    
    applyMessage: function(msg) {
        const scene = this.el;
        if (!msg.object_id) return;
        
        let el = document.getElementById(msg.object_id);
        
        if (msg.action === 'delete') {
            if (el) el.parentNode.removeChild(el);
            return;
        }

        if (!el) {
            if (msg.action === 'update') return;
            
            // Most objects in ARENA are a-entity
            let type = 'a-entity';
            if (msg.type && ['camera', 'light'].includes(msg.type)) {
                type = `a-${msg.type}`;
            }
            
            el = document.createElement(type);
            el.setAttribute('id', msg.object_id);
            // In ARENA, type might need to be set as a component if it's text etc
            if (msg.type && type === 'a-entity') {
                if (msg.type === 'gltf-model') {
                    // special handling not strictly needed if data has gltf-model URI
                }
            }
            scene.appendChild(el);
        }

        if (msg.data) {
            for (const [key, val] of Object.entries(msg.data)) {
                // Ignore type and object_id inside data
                if (key === 'object_id') continue;
                
                // Set A-Frame attribute
                if (typeof val === 'object' && val !== null) {
                    el.setAttribute(key, val);
                } else {
                    // direct primitive
                    el.setAttribute(key, val);
                }
            }
        }
    },

    fastForwardTo: function(targetIndex) {
        // clear scene objects (keep camera Rig)
        const scene = this.el;
        const entities = scene.querySelectorAll('a-entity, a-box, a-gltf-model, a-sphere, a-cylinder, a-plane');
        for (let i = 0; i < entities.length; i++) {
            if (entities[i].id !== 'cameraRig' && entities[i].id !== 'my-camera') {
                entities[i].parentNode.removeChild(entities[i]);
            }
        }

        console.log("Seeking to index", targetIndex);
        for (let i = 0; i <= targetIndex; i++) {
            if (i < this.messages.length) {
                this.applyMessage(this.messages[i]);
            }
        }
    },
    
    tick: function (time, timeDelta) {
        if (this.isPlaying && this.messages.length > 0 && this.playhead < this.messages.length) {
            const msg = this.messages[this.playhead];
            this.applyMessage(msg);
            
            this.playhead++;
            
            const timeline = document.getElementById('timeline');
            if (timeline) {
                timeline.value = (this.playhead / this.messages.length) * 100;
            }
        } else if (this.isPlaying && this.messages.length > 0 && this.playhead >= this.messages.length) {
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
