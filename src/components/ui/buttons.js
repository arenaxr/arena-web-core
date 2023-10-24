/* global AFRAME, ARENA, THREE */

import ThreeMeshUI from 'three-mesh-ui';
import { ARENAUtils } from '../../utils';
import { ARENAColorsLight, ARENAColorsDark, ARENALayout, ARENATypography, EVENTS } from '../../constants/ui';

// BUTTONS
const buttonOptions = {
    width: 'auto',
    height: 'auto',
    justifyContent: 'center',
    offset: ARENALayout.buttonDefaultOffset,
    margin: ARENALayout.buttonMargin,
    borderRadius: ARENALayout.buttonBorderRadius,
    textAlign: 'center',
    padding: ARENALayout.buttonPadding,
    fontSize: ARENATypography.button,
};

const buttonTextOptions = {
    offset: 0,
    padding: ARENALayout.buttonTextPadding,
};

const buttonBase = {
    init() {
        this.buttonMap = {};
        this.object3DContainer = new THREE.Object3D();
        this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
        this.el.setAttribute('click-listener-local', 'enabled: true');
        this.registerListeners();

        this.ARENAColors = this.data.theme === 'light' ? ARENAColorsLight : ARENAColorsDark;

        this.buttonOptions = { ...buttonOptions, backgroundOpacity: this.ARENAColors.buttonBgOpacity };
        this.createButtonStates();
    },

    createButtonStates() {
        this.buttonStates = {
            default: {
                offset: ARENALayout.buttonDefaultOffset,
                backgroundColor: this.ARENAColors.buttonBg,
                borderColor: this.ARENAColors.buttonBg,
            },
            hover: {
                offset: ARENALayout.buttonDefaultOffset,
                backgroundColor: this.ARENAColors.buttonBgHover,
                borderColor: this.ARENAColors.buttonBgHover,
            },
            selected: {
                offset: ARENALayout.buttonDownOffset,
                backgroundColor: this.ARENAColors.buttonBgSelected,
                borderColor: this.ARENAColors.buttonBgSelected,
            },
        };
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
                hoveredButton.el.set(this.buttonStates.hover);
                hoveredButton.prevState = 'default';
                hoveredButton.state = 'hover';
            }
        }
    },

    mouseLeaveHandler(evt) {
        evt.detail.clearedUIEls?.forEach((el) => {
            const hoveredButton = this.buttonMap[el.parent.name];
            if (hoveredButton) {
                hoveredButton.el.set(this.buttonStates.default); // Force default state
                hoveredButton.prevState = 'default';
                hoveredButton.state = 'default';
            }
        });
    },

    mouseDownHandler(evt) {
        if ('cursorEl' in evt.detail) {
            const selectedButton = this.buttonMap[evt.detail.intersection?.object.parent.name];
            if (selectedButton) {
                selectedButton.el.set(this.buttonStates.selected);
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
                prevSelectedButton.el.set(this.buttonStates[prevSelectedButton.prevState]);
                prevSelectedButton.prevState = 'default';
                prevSelectedButton.state = 'default';
                prevSelectedButton.selector = undefined;
            }
        }
    },

    createButton(buttonEl, index, clickFn) {
        const button = new ThreeMeshUI.Block(this.buttonOptions);
        button.isMeshUIButton = true;
        const buttonName = typeof buttonEl === 'string' ? buttonEl : buttonEl.name;
        // Handles legacy string values
        if (buttonEl.img) {
            // still safe for string values
            try {
                new THREE.TextureLoader().load(buttonEl.img, (texture) => {
                    button.set({
                        backgroundImage: texture,
                        backgroundSize: 'contain',
                        backgroundOpacity: 1,
                        height: buttonEl.height ?? buttonEl.size ?? ARENALayout.buttonImgDefaultSize,
                        width: buttonEl.width ?? buttonEl.size ?? ARENALayout.buttonImgDefaultSize,
                        padding: 0,
                        borderWidth: ARENALayout.buttonImgBorder,
                        borderRadius: buttonEl.borderRadius ?? ARENALayout.buttonBorderRadius,
                    });
                });
            } catch {
                console.warn('Error loading button image');
                return null;
            }
        } else {
            button.add(
                new ThreeMeshUI.Text({
                    ...buttonTextOptions,
                    textContent: buttonName,
                    color: this.ARENAColors.buttonText,
                })
            );
        }
        button.set({ name: buttonName, ...this.buttonStates.default });
        this.buttonMap[buttonName] = {
            el: button,
            index,
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
                            buttonIndex: index,
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
    outerContainer: undefined,
    schema: {
        buttons: { type: 'array', default: ['Confirm', 'Cancel'] },
        title: { type: 'string', default: '' },
        vertical: { type: 'boolean', default: false },
        font: { type: 'string', default: 'Roboto' },
        theme: { type: 'string', default: 'light' },
    },

    init() {
        const { data } = this;
        buttonBase.init.bind(this)();

        this.ARENAColors = data.theme === 'light' ? ARENAColorsLight : ARENAColorsDark;

        const shadowContainer = new ThreeMeshUI.Block({
            backgroundColor: this.ARENAColors.textBg,
            backgroundOpacity: this.ARENAColors.textBgOpacity,
            padding: ARENALayout.containerPadding,
            borderRadius: ARENALayout.borderRadius,
        });
        const buttonOuterContainer = new ThreeMeshUI.Block({
            backgroundSide: THREE.DoubleSide,
            backgroundColor: this.ARENAColors.bg,
            backgroundOpacity: this.ARENAColors.bgOpacity,
            alignItems: 'stretch',
            fontFamily: data.font,
            padding: [ARENALayout.containerPadding * 2, ARENALayout.containerPadding],
            borderRadius: ARENALayout.borderRadius,
            flexDirection: 'column',
        });
        this.outerContainer = buttonOuterContainer;
        shadowContainer.add(buttonOuterContainer);
        if (data.title) {
            const title = new ThreeMeshUI.Text({
                textAlign: 'center',
                fontSize: ARENATypography.button,
                margin: ARENALayout.containerPadding * 2,
                color: this.ARENAColors.buttonText,
                textContent: data.title,
            });
            buttonOuterContainer.add(title);
            this.title = title;
        }
        this.buttonContainer = new ThreeMeshUI.Block({
            alignItems: 'stretch',
            whiteSpace: 'nowrap',
        });
        buttonOuterContainer.add(this.buttonContainer);
        this.object3DContainer.add(shadowContainer);
    },

    update(oldData) {
        const { data, title } = this;
        if (data.buttons !== oldData?.buttons) {
            this.buttonContainer.remove(...Object.values(this.buttonMap).map((b) => b.el));
            this.buttonMap = {};
            // Buttons creation, with the options objects passed in parameters.
            data.buttons.forEach((buttonEl, index) => {
                const button = this.createButton(buttonEl, index);
                if (button) this.buttonContainer.add(button);
            });
            this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
            this.object3DContainer.computeBoundsTree();
        }
        if (this.data.vertical !== oldData?.vertical) {
            this.buttonContainer.set({ flexDirection: this.data.vertical ? 'column' : 'row' });
        }
        if (data.title !== oldData?.title && title) {
            title.set({ textContent: data.title });
        }
        if (data.font !== oldData?.font) {
            this.outerContainer.set({ fontFamily: data.font });
        }
        if (data.theme !== oldData.theme) {
            this.ARENAColors = data.theme === 'light' ? ARENAColorsLight : ARENAColorsDark;
        }
    },
});

export default buttonBase;
