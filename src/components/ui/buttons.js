/* global AFRAME, ARENA, THREE */

import ThreeMeshUI from 'three-mesh-ui';
import { ARENAUtils } from '../../utils';
import { ARENAColors, EVENTS } from '../../systems/ui/constants';

// BUTTONS
const buttonOptions = {
    width: 'auto',
    height: 'auto',
    justifyContent: 'center',
    offset: 0.04,
    margin: 0.02,
    borderRadius: 0.075,
    textAlign: 'center',
    padding: [0.015, 0.075],
    backgroundOpacity: 0.9,
    fontSize: 0.075,
};

const buttonTextOptions = {
    offset: 0,
    padding: [0.005, 0],
    color: ARENAColors.buttonText,
};

const BUTTONSTATES = {
    default: {
        offset: 0.03,
        backgroundColor: ARENAColors.buttonBg,
    },
    hover: {
        offset: 0.03,
        backgroundColor: ARENAColors.buttonBgHover,
    },
    selected: {
        offset: 0.015,
        backgroundColor: ARENAColors.buttonBgSelected,
    },
};

const buttonBase = {
    buttonMap: undefined,
    object3DContainer: undefined,

    init() {
        this.buttonMap = {};
        this.object3DContainer = new THREE.Object3D();
        this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
        this.el.setAttribute('click-listener-local', 'enabled: true');
        this.registerListeners();
    },

    registerListeners() {
        this.el.addEventListener('mousedown', this.mouseDownHandler.bind(this));
        this.el.addEventListener('mouseup', this.mouseUpHandler.bind(this));
        this.el.addEventListener(EVENTS.INTERSECT, this.mouseEnterHandler.bind(this));
        this.el.addEventListener(EVENTS.INTERSECT_CLEAR, this.mouseLeaveHandler.bind(this));
    },

    unregisterListeners() {
        this.el.removeEventListener('mousedown', this.mouseDownHandler);
        this.el.removeEventListener('mouseup', this.mouseUpHandler);
        this.el.removeEventListener(EVENTS.INTERSECT, this.mouseEnterHandler);
        this.el.removeEventListener(EVENTS.INTERSECT_CLEAR, this.mouseLeaveHandler);
    },

    mouseEnterHandler(evt) {
        if ('UIEl' in evt.detail) {
            const hoveredButton = this.buttonMap[evt.detail.UIEl];
            if (hoveredButton) {
                hoveredButton.el.set(BUTTONSTATES.hover);
                hoveredButton.prevState = 'default';
                hoveredButton.state = 'hover';
            }
        }
    },

    mouseLeaveHandler(evt) {
        evt.detail.clearedUIEls?.forEach((el) => {
            const hoveredButton = this.buttonMap[el.parent.name];
            if (hoveredButton) {
                hoveredButton.el.set(BUTTONSTATES.default); // Force default state
                hoveredButton.prevState = 'default';
                hoveredButton.state = 'default';
            }
        });
    },

    mouseDownHandler(evt) {
        if ('cursorEl' in evt.detail) {
            const selectedButton = this.buttonMap[evt.detail.intersection?.object.parent.name];
            if (selectedButton) {
                selectedButton.el.set(BUTTONSTATES.selected);
                selectedButton.prevState = selectedButton.state; // Probably hover but may be default w/ touchscreen
                selectedButton.state = 'selected';
                selectedButton.selector = evt.detail.cursorEl;
            }
        }
    },
    mouseUpHandler(evt) {
        if ('cursorEl' in evt.detail) {
            const curSelectedButton = this.buttonMap[evt.detail.intersection?.object.parent.name];
            // If this is the same button we clicked on, then call its function
            if (curSelectedButton && curSelectedButton.selector === evt.detail.cursorEl) {
                curSelectedButton.clickFn(evt.detail);
            }
            // Clear previously selected button from this cursor in any case
            const prevSelectedButton = Object.values(this.buttonMap).find((b) => b.selector === evt.detail.cursorEl);
            if (prevSelectedButton) {
                prevSelectedButton.el.set(BUTTONSTATES[prevSelectedButton.prevState]);
                prevSelectedButton.prevState = 'default';
                prevSelectedButton.state = 'default';
                prevSelectedButton.selector = undefined;
            }
        }
    },

    createButton(buttonName, clickFn) {
        const button = new ThreeMeshUI.Block({ ...buttonOptions, name: buttonName });
        button.isMeshUIButton = true;
        button.add(new ThreeMeshUI.Text({ ...buttonTextOptions, name: buttonName, textContent: buttonName }));
        button.set(BUTTONSTATES.default);
        this.buttonMap[buttonName] = {
            el: button,
            state: 'default',
            clickFn:
                clickFn ??
                ((evtDetail) => {
                    const { position } = document.getElementById('my-camera').components['arena-camera'].data;
                    const clickPos = ARENAUtils.vec3ToObject(position);
                    const coordsData = ARENAUtils.setClickData({ detail: evtDetail });
                    const thisMsg = {
                        object_id: this.el.id,
                        action: 'clientEvent',
                        type: 'buttonClick',
                        data: {
                            clickPos,
                            buttonName,
                            position: coordsData,
                            source: ARENA.camName,
                        },
                    };
                    if (!this.el.getAttribute('goto-url') && !this.el.getAttribute('textinput')) {
                        // publishing events attached to user id objects allows sculpting security
                        ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
                    }
                }),
        };
        return button;
    },

    setClickFn(buttonName, clickFn) {
        const button = this.buttonMap[buttonName];
        if (button) {
            button.clickFn = clickFn;
        }
    },

    remove() {
        this.unregisterListeners();
    },
};

AFRAME.registerComponent('arenaui-button-panel', {
    ...buttonBase,

    buttonContainer: undefined,
    schema: {
        buttons: { type: 'array', default: ['Confirm', 'Cancel'] },
        vertical: { type: 'boolean', default: false },
    },

    init() {
        buttonBase.init.bind(this)();
        this.buttonContainer = new ThreeMeshUI.Block({
            backgroundSide: THREE.DoubleSide,
            backgroundColor: ARENAColors.bg,
            justifyContent: 'center',
            alignItems: 'stretch',
            fontFamily: 'Roboto',
            padding: 0.02,
            borderRadius: 0.11,
        });
        this.object3DContainer.add(this.buttonContainer);
    },

    update(oldData) {
        if (this.data.buttons !== oldData?.buttons) {
            this.buttonContainer.remove(...Object.values(this.buttonMap).map((b) => b.el));
            this.buttonMap = {};
            // Buttons creation, with the options objects passed in parameters.
            this.data.buttons.forEach((buttonName) => {
                const button = this.createButton(buttonName);
                this.buttonContainer.add(button);
            });
            this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
        }
        if (this.data.vertical !== oldData?.vertical) {
            this.buttonContainer.set({ flexDirection: this.data.vertical ? 'column' : 'row' });
        }
    },
});

export default buttonBase;
