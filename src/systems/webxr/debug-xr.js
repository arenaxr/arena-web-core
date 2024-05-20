/* global AFRAME, ARENA */

import { ARENA_EVENTS } from '../../constants';

AFRAME.registerSystem('debug-ui', {
    init() {
        ARENA.events.addEventListener(ARENA_EVENTS.ARENA_LOADED, this.setup.bind(this));
    },
    setup() {
        if (ARENA.params.debugUI) {
            const debugCard = document.createElement('a-entity');
            debugCard.setAttribute('arenaui-card', {
                title: 'Debug',
                body: '',
                fontSize: 0.018,
                widthScale: '0.5',
            });
            debugCard.setAttribute('position', { x: 0, y: 0.2, z: -1 });
            document.getElementById('my-camera').appendChild(debugCard);
            ARENA.debugXR = (text, newline = true) => {
                const prevText = debugCard.getAttribute('arenaui-card').body;
                if (text === undefined) {
                    debugCard.setAttribute('arenaui-card', { body: '' });
                } else {
                    const n = newline ? '\n' : '';
                    debugCard.setAttribute('arenaui-card', { body: `${prevText}${n}${text}` });
                }
            };
        } else {
            ARENA.debugXR = () => {};
        }
    },
});
