/* global AFRAME, THREE */

import ThreeMeshUI from 'three-mesh-ui';
import { ARENAColorsLight, ARENAColorsDark, ARENALayout, ARENATypography } from '../../constants/ui';
import buttonBase from './buttons';

AFRAME.registerComponent('arenaui-prompt', {
    ...buttonBase,

    schema: {
        title: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        buttons: { type: 'array', default: ['Confirm', 'Cancel'] },
        width: { type: 'number', default: 1.5 },
        font: { type: 'string', default: 'Roboto' },
        theme: { type: 'string', default: 'light' },
        themeOverride: { type: 'array', default: [] }, // Annoyingly can't be an object, so we have to use an array
        materialSides: { type: 'string', default: 'both' },
    },
    init() {
        buttonBase.init.bind(this)();

        const { data, el, object3DContainer } = this;

        this.ARENAColors = data.theme === 'light' ? ARENAColorsLight : ARENAColorsDark;
        data.themeOverride.forEach((override) => {
            if (override[0] in this.ARENAColors) {
                this.ARENAColors[override[0]] = override[1]; // Tuple of key-value
            }
        });

        const container = new ThreeMeshUI.Block({
            ref: 'container',
            color: this.ARENAColors.text,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: this.ARENAColors.textBg,
            backgroundOpacity: this.ARENAColors.textBgOpacity,
            padding: ARENALayout.containerPadding,
            margin: 0,
            borderRadius: ARENALayout.borderRadius,
        });
        object3DContainer.add(container);

        const contentContainer = new ThreeMeshUI.Block({
            fontFamily: data.font,
            backgroundSide: data.materialSides === 'both' ? THREE.DoubleSide : THREE.FrontSide,
            width: data.width,
            padding: ARENALayout.contentPadding,
            margin: 0,
            borderRadius: ARENALayout.borderRadius,
            backgroundColor: this.ARENAColors.bg,
            backgroundOpacity: this.ARENAColors.bgOpacity,
            flexDirection: 'column',
            justifyContent: 'space-evenly',
        });
        this.container = contentContainer; // Ref to change width later

        if (data.title) {
            const title = new ThreeMeshUI.Text({
                textAlign: 'center',
                fontSize: ARENATypography.body * ARENATypography.bigTitleRatio,
                margin: [
                    0,
                    ARENALayout.containerPadding,
                    ARENALayout.containerPadding * 2,
                    ARENALayout.containerPadding,
                ],
                textContent: data.title,
            });
            contentContainer.add(title);
            this.title = title;
        }

        if (data.description) {
            const description = new ThreeMeshUI.Text({
                width: '100%',
                fontSize: ARENATypography.body * ARENATypography.descriptionRatio,
                alignItems: 'start',
                textAlign: 'center',
                backgroundOpacity: 0,
                textContent: data.description,
            });
            this.description = description;

            contentContainer.add(description);
        }

        this.buttonContainer = new ThreeMeshUI.Block({
            margin: [ARENALayout.buttonMargin * 2, 0, 0, 0],
            justifyContent: 'center',
            alignItems: 'stretch',
            flexDirection: 'row',
            fontFamily: data.font,
            padding: ARENALayout.containerPadding,
            borderRadius: ARENALayout.buttonBorderRadius,
        });
        contentContainer.add(this.buttonContainer);

        container.add(contentContainer);

        el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
    },

    update(oldData) {
        const { data } = this;
        if (data.title !== oldData.title) {
            this.title.set({ textContent: data.title });
        }
        if (data.description !== oldData.description) {
            this.description.set({ textContent: data.description });
        }
        if (data.width !== oldData.width) {
            this.container.set({ width: data.width });
        }
        if (this.data.buttons !== oldData?.buttons) {
            this.buttonContainer.remove(...Object.values(this.buttonMap).map((b) => b.el));
            this.buttonMap = {};
            // Buttons creation, with the options objects passed in parameters.
            this.data.buttons.forEach((buttonEl, index) => {
                const button = this.createButton(buttonEl, index);
                if (button) this.buttonContainer.add(button);
            });
            this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
        }
        if (data.font !== oldData.font) {
            this.container?.set({ fontFamily: data.font });
        }
        if (data.theme !== oldData.theme) {
            this.ARENAColors = data.theme === 'light' ? ARENAColorsLight : ARENAColorsDark;
        }
        if (data.themeOverride !== oldData.themeOverride) {
            data.themeOverride.forEach((override) => {
                if (override[0] in this.ARENAColors) {
                    this.ARENAColors[override[0]] = override[1]; // Tuple of key-value
                }
            });
        }
        this.el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
    },
});
