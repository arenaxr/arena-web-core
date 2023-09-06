/* global AFRAME, THREE */

import ThreeMeshUI from 'three-mesh-ui';
import RegularFontJSON from './fonts/Roboto-Regular-msdf.json';
import RegularFontImage from './fonts/Roboto-Regular.png';
import MonoFontJSON from './fonts/Roboto-Mono-msdf.json';
import MonoFontImage from './fonts/Roboto-Mono.png';
import { EVENTS } from '../../constants/ui';

AFRAME.registerSystem('arena-ui', {
    init() {
        ThreeMeshUI.FontLibrary.prepare(
            ThreeMeshUI.FontLibrary.addFontFamily('Roboto').addVariant(
                '400',
                'normal',
                RegularFontJSON,
                RegularFontImage
            ),
            ThreeMeshUI.FontLibrary.addFontFamily('Roboto-Mono').addVariant(
                '400',
                'normal',
                MonoFontJSON,
                MonoFontImage
            )
        ).then(() => {
            // console.log('Roboto font loaded');
        });
    },
    tick() {
        ThreeMeshUI.update();
    },
});

/**
 * Copy contents of one array to another without allocating new array.
 */
function copyArray(a, b) {
    let i;
    a.length = b.length;
    for (i = 0; i < b.length; i++) {
        a[i] = b[i];
    }
}

const isUIButtonObject = (obj) => obj.name === 'UIBackgroundBox' && obj.parent?.isMeshUIButton;

// AFRAME Monkeypatch (src/components/raycaster.js)
AFRAME.components.raycaster.Component.prototype.init = function init() {
    this.clearedIntersectedEls = [];
    this.unitLineEndVec3 = new THREE.Vector3();
    this.intersectedEls = [];
    this.intersections = [];
    this.newIntersectedEls = [];
    this.newIntersections = [];
    this.objects = [];
    this.prevCheckTime = undefined;
    this.prevIntersectedEls = [];
    this.rawIntersections = [];
    this.raycaster = new THREE.Raycaster();
    this.updateOriginDirection();
    this.setDirty = this.setDirty.bind(this);
    this.updateLine = this.updateLine.bind(this);
    this.observer = new MutationObserver(this.setDirty);
    this.dirty = true;
    this.lineEndVec3 = new THREE.Vector3();
    this.otherLineEndVec3 = new THREE.Vector3();
    this.lineData = { end: this.lineEndVec3 };

    this.intersectedUIEls = [];
    this.prevIntersectedUIEls = [];
    this.newIntersectedUIEls = [];
    this.clearedIntersectedUIEls = [];

    this.getIntersection = this.getIntersection.bind(this);
    this.intersectedDetail = { el: this.el, getIntersection: this.getIntersection };
    this.intersectedClearedDetail = { el: this.el };
    this.intersectionClearedDetail = {
        clearedEls: this.clearedIntersectedEls,
        clearedUIEls: this.clearedIntersectedUIEls,
    };
    this.intersectionDetail = {};
};

// AFRAME Monkeypatch (src/components/raycaster.js)
AFRAME.components.raycaster.Component.prototype.checkIntersections = function checkIntersections() {
    const { clearedIntersectedEls } = this;
    const { el } = this;
    const { data } = this;
    let i;
    const { intersectedEls } = this;
    let intersection;
    const { intersections } = this;
    const { newIntersectedEls } = this;
    const { newIntersections } = this;
    const { prevIntersectedEls } = this;
    const { rawIntersections } = this;

    const { intersectedUIEls, prevIntersectedUIEls, newIntersectedUIEls, clearedIntersectedUIEls } = this;

    // Refresh the object whitelist if needed.
    if (this.dirty) {
        this.refreshObjects();
    }

    // Store old previously intersected entities.
    copyArray(this.prevIntersectedEls, this.intersectedEls);

    copyArray(this.prevIntersectedUIEls, this.intersectedUIEls);

    // Raycast.
    this.updateOriginDirection();
    rawIntersections.length = 0;
    this.raycaster.intersectObjects(this.objects, true, rawIntersections);

    // Only keep intersections against objects that have a reference to an entity.
    intersections.length = 0;
    intersectedEls.length = 0;
    intersectedUIEls.length = 0;
    for (i = 0; i < rawIntersections.length; i++) {
        intersection = rawIntersections[i];
        // Don't intersect with own line.
        if (data.showLine && intersection.object === el.getObject3D('line')) {
            continue;
        }
        // Handle special case for UI elements, ignore non-button elements
        if (intersection.object.name === 'UIBackgroundBox') {
            if (intersection.object.parent?.isMeshUIButton) {
                // console.log('UI Button intersected', intersection.object.parent.name);
                intersections.push(intersection);
                intersectedUIEls.push(intersection.object);
            }
        } else if (intersection.object.el) {
            // console.log('Entity intersected', intersection.object.el.id);
            intersections.push(intersection);
            intersectedEls.push(intersection.object.el);
        }
    }

    // Get newly intersected entities.
    newIntersections.length = 0;
    newIntersectedEls.length = 0;
    newIntersectedUIEls.length = 0;
    for (i = 0; i < intersections.length; i++) {
        // Track UI separately from intersectedEls lists
        if (isUIButtonObject(intersections[i].object)) {
            if (prevIntersectedUIEls.indexOf(intersections[i].object) === -1) {
                // console.log('New UI Button intersected', intersections[i].object.parent.name);
                newIntersections.push(intersections[i]);
                newIntersectedUIEls.push(intersections[i].object);
                newIntersectedEls.push(intersections[i].object.parent.el);
            }
        } else if (prevIntersectedEls.indexOf(intersections[i].object.el) === -1) {
            newIntersections.push(intersections[i]);
            newIntersectedEls.push(intersections[i].object.el);
        }
    }

    // Emit intersection cleared on both entities per formerly intersected entity.
    clearedIntersectedEls.length = 0;
    for (i = 0; i < prevIntersectedEls.length; i++) {
        if (intersectedEls.indexOf(prevIntersectedEls[i]) !== -1) {
            continue;
        }
        // console.log('El  cleared', prevIntersectedEls[i], this.intersectedClearedDetail);
        clearedIntersectedEls.push(prevIntersectedEls[i]);
        prevIntersectedEls[i].emit(EVENTS.INTERSECT_CLEAR, this.intersectedClearedDetail);
    }

    // Emit intersection cleared on both UI per formerly intersected UI. Don't emit on raycaster
    clearedIntersectedUIEls.length = 0;
    for (i = 0; i < prevIntersectedUIEls.length; i++) {
        if (intersectedUIEls.indexOf(prevIntersectedUIEls[i]) !== -1) {
            continue;
        }
        // Clean up parent el as well for AFRAME a-cursor el tracking
        if (clearedIntersectedEls.indexOf(prevIntersectedUIEls[i].parent.el) === -1) {
            clearedIntersectedEls.push(prevIntersectedUIEls[i].parent.el);
        }
        clearedIntersectedUIEls.push(prevIntersectedUIEls[i]);
        prevIntersectedUIEls[i].parent.el.emit(EVENTS.INTERSECT_CLEAR, this.intersectionClearedDetail);
    }

    if (clearedIntersectedEls.length || clearedIntersectedUIEls.length) {
        el.emit(EVENTS.INTERSECTION_CLEAR, this.intersectionClearedDetail);
        // console.log('emit clear', this.intersectionClearedDetail);
    }

    // Emit intersected on intersected entity per intersected entity.
    for (i = 0; i < newIntersectedEls.length; i++) {
        newIntersectedEls[i].emit(EVENTS.INTERSECT, this.intersectedDetail);
    }

    // Emit intersected on intersected entity per intersected entity.
    for (i = 0; i < newIntersectedUIEls.length; i++) {
        newIntersectedUIEls[i].parent.el.emit(EVENTS.INTERSECT, { UIEl: newIntersectedUIEls[i].parent.name });
    }

    // Emit all intersections at once on raycasting entity.
    if (newIntersections.length) {
        this.intersectionDetail.els = newIntersectedEls;
        this.intersectionDetail.UIEls = newIntersectedUIEls;
        this.intersectionDetail.intersections = newIntersections;
        el.emit(EVENTS.INTERSECTION, this.intersectionDetail);
        // console.log('emitted raycaster intersection', this.intersectionDetail.els);
    }

    // Emit event when the closest intersected entity has changed.
    if (
        (prevIntersectedEls.length === 0 && prevIntersectedUIEls.length === 0 && intersections.length > 0) ||
        ((prevIntersectedEls.length > 0 || prevIntersectedUIEls.length > 0) && intersections.length === 0) ||
        ((prevIntersectedEls.length || prevIntersectedUIEls.length) &&
            intersections.length &&
            (prevIntersectedEls[0] !== intersections[0].object.el ||
                prevIntersectedUIEls[0] !== intersections[0].object))
    ) {
        this.intersectionDetail.els = this.intersectedEls;
        this.intersectionDetail.UIEls = this.intersectedUIEls;
        this.intersectionDetail.intersections = intersections;
        el.emit(EVENTS.INTERSECTION_CLOSEST_ENTITY_CHANGED, this.intersectionDetail);
    }

    // Update line length.
    if (data.showLine) {
        setTimeout(this.updateLine);
    }
};
