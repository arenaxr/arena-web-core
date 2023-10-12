/* global THREE */

const BLACK = new THREE.Color(0x000000);
const WHITE = new THREE.Color(0xffffff);
const TEXT_LIGHT = new THREE.Color(0x3c3c3c);
const TEXT_DARK = new THREE.Color(0xf0f0f0);
const BG_DARK = new THREE.Color(0x3d3d3d);

const ARENATypography = {
    body: 0.035,
    titleRatio: 1.4,
    descriptionRatio: 2,
    bigTitleRatio: 4,
    button: 0.075,
    buttonSmall: 0.04,
};

const ARENAColorsLight = {
    text: TEXT_LIGHT,
    textBg: BLACK,
    captionBg: WHITE,
    textBgOpacity: 0.25,
    bg: new THREE.Color(0xf3f3f3),
    bgOpacity: 0.8,
    buttonText: TEXT_LIGHT,
    buttonBg: new THREE.Color(0xededed),
    buttonBgOpacity: 0.9,
    buttonBgHover: new THREE.Color(0xd1d1d1),
    buttonBgSelected: WHITE,
};

const ARENAColorsDark = {
    text: TEXT_DARK,
    textBg: BG_DARK,
    captionBg: WHITE,
    textBgOpacity: 0.25,
    bg: BG_DARK,
    bgOpacity: 1,
    buttonText: TEXT_DARK,
    buttonBg: new THREE.Color(0x626262),
    buttonBgOpacity: 1,
    buttonBgHover: new THREE.Color(0x757575),
    buttonBgSelected: null,
};

const ARENALayout = {
    buttonMargin: 0.02,
    buttonPadding: [0.015, 0.075],
    buttonTextPadding: [0.005, 0],
    containerPadding: 0.025,
    contentPadding: 0.1,
    borderRadius: 0.05,
    buttonBorderRadius: 0.075,
    textImageRatio: 0.5, // ratio of text to image width
    buttonDefaultOffset: 0.03,
    buttonDownOffset: 0.015,
    buttonImgBorder: 0.0075,
    buttonImgDefaultSize: 0.3,
};

const EVENTS = {
    INTERSECT: 'raycaster-intersected',
    INTERSECTION: 'raycaster-intersection',
    INTERSECT_CLEAR: 'raycaster-intersected-cleared',
    INTERSECTION_CLEAR: 'raycaster-intersection-cleared',
    INTERSECTION_CLOSEST_ENTITY_CHANGED: 'raycaster-closest-entity-changed',
};

export { ARENAColorsLight, ARENAColorsDark, ARENALayout, ARENATypography, EVENTS };
