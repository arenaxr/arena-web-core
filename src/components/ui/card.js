import ThreeMeshUI from 'three-mesh-ui';
import { ARENAUtils } from '../../utils';
import { ARENAColorsLight, ARENAColorsDark, ARENALayout, ARENATypography } from '../../constants/ui';
import buttonBase from './buttons';

const borderRadiusLeft = [ARENALayout.borderRadius, 0, 0, ARENALayout.borderRadius];
const borderRadiusRight = [0, ARENALayout.borderRadius, ARENALayout.borderRadius, 0];

AFRAME.registerComponent('arenaui-card', {
    ...buttonBase,

    title: undefined,
    img: undefined,
    imgContainer: undefined,
    body: undefined,
    imgCaption: undefined,
    bodyContainer: undefined,
    outerMeshContainer: undefined,
    closeButton: undefined,

    schema: {
        title: { type: 'string', default: '' },
        body: { type: 'string', default: '' },
        bodyAlign: { type: 'string', default: 'left' }, // ['center', 'left', 'right', 'justify']
        img: { type: 'string', default: '' },
        imgCaption: { type: 'string', default: '' },
        imgDirection: { type: 'string', default: 'right' },
        imgSize: { type: 'string', default: 'cover' }, // ['cover', 'contain', 'stretch']
        textImageRatio: { type: 'number', default: ARENALayout.textImageRatio }, // Ratio of image to text
        fontSize: { type: 'number', default: ARENATypography.body },
        widthScale: { type: 'number', default: 1 }, // Scale factor
        closeButton: { type: 'boolean', default: false },
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
            fontFamily: data.font,
            color: this.ARENAColors.text,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
        });
        this.outerMeshContainer = container;

        let imgContainerBlock;
        if (data.img) {
            imgContainerBlock = new ThreeMeshUI.Block({
                backgroundSide: data.materialSides === 'both' ? THREE.DoubleSide : THREE.FrontSide,
                width: data.widthScale,
                backgroundColor: this.ARENAColors.bg,
                backgroundOpacity: this.ARENAColors.bgOpacity,
                borderRadius: data.imgDirection === 'right' ? borderRadiusRight : borderRadiusLeft,
            });
            this.imgContainer = imgContainerBlock;

            const imgSubBock = new ThreeMeshUI.Block({
                width: '100%',
                height: '100%',
                borderRadius: ARENALayout.borderRadius,
                textAlign: 'left',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'end',
                backgroundColor: this.ARENAColors.captionBg,
                backgroundOpacity: 1,
                backgroundSize: data.imgSize,
            });
            this.img = imgSubBock;
            imgContainerBlock.add(imgSubBock);

            new THREE.TextureLoader().load(data.img, (texture) => {
                imgSubBock.set({
                    backgroundImage: texture,
                });
            });

            if (data.img && data.imgCaption) {
                if (data.imgCaption) {
                    this.addImgCaption();
                } else if (this.img && this.imgCaption) {
                    this.img.remove(this.imgCaption);
                }
            }
        }

        let textBorderRadius = ARENALayout.borderRadius;
        if (data.img) {
            textBorderRadius = data.imgDirection === 'right' ? borderRadiusLeft : borderRadiusRight;
        }

        const textContainer = new ThreeMeshUI.Block({
            backgroundSide: THREE.DoubleSide,
            width: data.img ? data.textImageRatio * data.widthScale : (1 + data.textImageRatio) * data.widthScale,
            padding: ARENALayout.contentPadding,
            backgroundColor: this.ARENAColors.bg,
            backgroundOpacity: this.ARENAColors.bgOpacity,
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            borderRadius: textBorderRadius,
        });
        this.bodyContainer = textContainer;

        if (data.title) {
            const title = new ThreeMeshUI.Text({
                textAlign: 'center',
                fontSize: data.fontSize * ARENATypography.titleRatio,
                margin: [0, ARENALayout.containerPadding, ARENALayout.containerPadding, ARENALayout.containerPadding],
                textContent: data.title,
            });
            textContainer.add(title);
            this.title = title;
        }

        const textBody = new ThreeMeshUI.Text({
            width: '100%',
            fontSize: data.fontSize,
            alignItems: 'start',
            textAlign: data.bodyAlign,
            backgroundOpacity: 0,
            textContent: data.body,
        });
        this.body = textBody;

        textContainer.add(textBody);

        const contentContainer = new ThreeMeshUI.Block({
            padding: ARENALayout.containerPadding,
            margin: 0,
            backgroundColor: this.ARENAColors.textBg,
            backgroundOpacity: this.ARENAColors.textBgOpacity,
            borderRadius: ARENALayout.borderRadius,
            flexDirection: 'row',
            alignItems: 'stretch',
        });
        if (data.img) {
            contentContainer.add(textContainer, imgContainerBlock);
            if (data.imgDirection === 'left') {
                contentContainer.set({ flexDirection: 'row-reverse' });
            }
        } else {
            contentContainer.add(textContainer);
        }

        this.container = contentContainer; // Reference for changing attributes
        container.add(contentContainer);

        if (data.closeButton) {
            this.addCloseButton();
        }

        object3DContainer.add(container);
        el.setObject3D('mesh', this.object3DContainer); // Make sure to update for AFRAME
    },

    update(oldData) {
        const { data } = this;
        if (data.title !== oldData.title) {
            this.title?.set({ textContent: data.title });
        }
        if (data.body !== oldData.body) {
            this.body?.set({ textContent: data.body });
        }
        if (data.bodyAlign !== oldData.bodyAlign) {
            this.body?.set({ textAlign: data.bodyAlign });
        }
        if (data.img !== oldData.img) {
            new THREE.TextureLoader().load(data.img, (texture) => {
                this.img.set({
                    backgroundImage: texture,
                });
            });
        }
        if (data.img && data.imgCaption !== oldData.imgCaption) {
            if (data.imgCaption && oldData.imgCaption) {
                this.imgCaption?.set({ textContent: data.imgCaption });
            } else if (!data.imgCaption && oldData.imgCaption) {
                this.img?.remove(this.imgCaption);
            } else if (data.imgCaption && oldData.imgCaption === '') {
                this.addImgCaption();
            }
        }
        if (data.imgDirection !== oldData.imgDirection) {
            if (data.img) {
                this.imgContainer?.set({
                    borderRadius:
                        data.imgDirection === 'right'
                            ? [0, ARENALayout.borderRadius, ARENALayout.borderRadius, 0]
                            : [ARENALayout.borderRadius, 0, 0, ARENALayout.borderRadius],
                });

                const textBorderRadius = data.imgDirection === 'right' ? borderRadiusLeft : borderRadiusRight;
                if (data.imgDirection === 'right') {
                    this.container.set({ flexDirection: 'row' });
                } else {
                    this.container.set({ flexDirection: 'row-reverse' });
                }
                this.bodyContainer?.set({ borderRadius: textBorderRadius });
            }
        }
        if (data.img && data.imgSize !== oldData.imgSize) {
            this.img?.set({ backgroundSize: data.imgSize });
        }
        if (data.fontSize !== oldData.fontSize) {
            this.title?.set({ fontSize: data.fontSize * ARENATypography.titleRatio });
            this.body?.set({ fontSize: data.fontSize });
            if (this.img) {
                this.caption?.set({ fontSize: data.fontSize });
            }
        }
        if (data.widthScale !== oldData.widthScale) {
            this.imgContainer?.set({ width: data.widthScale });
            this.body?.set({
                width: data.img ? data.textImageRatio * data.widthScale : (1 + data.textImageRatio) * data.widthScale,
            });
        }
        if (this.closeButton && data.closeButton !== oldData.closeButton) {
            if (data.closeButton && oldData.closeButton === false) {
                this.addCloseButton();
            } else if (!data.closeButton && oldData.closeButton) {
                this.removeCloseButton();
            }
        }
        if (data.font !== oldData.font) {
            this.outerMeshContainer?.set({ fontFamily: data.font });
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
    },

    addImgCaption() {
        const { data, img } = this;
        const caption = new ThreeMeshUI.Text({
            width: 'auto',
            textAlign: 'center',
            justifyContent: 'center',
            backgroundColor: this.ARENAColors.bg,
            textContent: data.imgCaption,
            fontSize: data.fontSize,
            padding: ARENALayout.containerPadding,
            margin: [0, 0, ARENALayout.containerPadding, 0],
            borderRadius: ARENALayout.borderRadius / 2,
        });
        img.add(caption);
        this.imgCaption = caption;
    },

    addCloseButton() {
        const { data, el, outerMeshContainer } = this;
        const buttonContainer = new ThreeMeshUI.Block({
            backgroundColor: this.ARENAColors.textBg,
            backgroundOpacity: this.ARENAColors.textBgOpacity,
            justifyContent: 'center',
            flexDirection: 'row',
            fontFamily: data.font,
            padding: 0,
            offset: 0,
            margin: [ARENALayout.containerPadding, 0, 0, 0],
            borderRadius: ARENALayout.borderRadius,
        });
        const closeButton = this.createButton('Close', 0, (evtDetail) => {
            const { position } = document.getElementById('my-camera').components['arena-camera'];
            const clickPos = ARENAUtils.vec3ToObject(position);
            const coordsData = ARENAUtils.setClickData({ detail: evtDetail });
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'buttonClick',
                data: {
                    clickPos,
                    buttonName: 'Close',
                    position: coordsData,
                    source: ARENA.camName,
                },
            };
            ARENAUtils.publishClientEvent(
                this.el,
                thisMsg,
                this.topicBase,
                this.topicBasePrivate,
                this.topicBasePrivateProg
            );
            this.el.remove();
        });
        closeButton.set({ fontSize: ARENATypography.buttonSmall });
        this.closeButton = buttonContainer;
        buttonContainer.add(closeButton);
        outerMeshContainer.add(buttonContainer);
        el.setAttribute('click-listener-local', 'enabled: true');
    },

    removeCloseButton() {
        const { el, outerMeshContainer } = this;
        outerMeshContainer.remove(this.closeButton);
        this.closeButton = undefined;
        el.removeAttribute('click-listener-local');
    },
});
