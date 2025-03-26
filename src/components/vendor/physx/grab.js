/**
 * Grab component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 */
import { ARENAUtils } from '../../../utils';

const GRABBED_STATE = 'grabbed-dynamic';
const posVect3 = new THREE.Vector3(); // Reusable vector for worldPosition calcs

AFRAME.registerComponent('physx-grab', {
    schema: {
        // If not 0, last grabbed object will be re-grabbed if both hand and object have not deviated in
        // distance (combined) from the last contact point by more than this value
        proximity: { default: 0, type: 'number' }
    },
    init: function() {
        // If a state of "grabbed" is set on a physx-body entity,
        // the entity is automatically transformed into a kinematic entity.
        // To avoid triggering this (we want to grab using constraints, and leave the
        // body as dynamic), we use a non-clashing name for the state we set on the entity when
        // grabbing it.

        this.grabbing = false;
        this.grabEl =      /** @type {AFRAME.Element}    */ null;
        // Track all currently hitting els (can be multiple)
        this.hitEls =   [];
        // Also track last hit el for proximity check if no other contacts
        this.lastHitEl =   /** @type {AFRAME.Element}    */ null;
        this.lastHitPos = new THREE.Vector3();

        // Bind event handlers
        this.onHit = this.onHit.bind(this);
        this.onHitEnd = this.onHitEnd.bind(this);
        this.onGripOpen = this.onGripOpen.bind(this);
        this.onGripClose = this.onGripClose.bind(this);
    },

    play: function() {
        const { el } = this;
        el.addEventListener('contactbegin', this.onHit);
        el.addEventListener('contactend', this.onHitEnd);
        el.addEventListener('gripdown', this.onGripClose);
        el.addEventListener('gripup', this.onGripOpen);
        el.addEventListener('trackpaddown', this.onGripClose);
        el.addEventListener('trackpadup', this.onGripOpen);
        el.addEventListener('triggerdown', this.onGripClose);
        el.addEventListener('triggerup', this.onGripOpen);
    },

    pause: function() {
        const { el } = this;
        el.removeEventListener('contactbegin', this.onHit);
        el.removeEventListener('contactend', this.onHitEnd);
        el.removeEventListener('gripdown', this.onGripClose);
        el.removeEventListener('gripup', this.onGripOpen);
        el.removeEventListener('trackpaddown', this.onGripClose);
        el.removeEventListener('trackpadup', this.onGripOpen);
        el.removeEventListener('triggerdown', this.onGripClose);
        el.removeEventListener('triggerup', this.onGripOpen);
    },

    onGripClose: function(evt) {
        this.grabbing = true;

        // Grab last hit object if we have any still in contact
        if (this.hitEls.length > 0) {
            this.startGrab(this.hitEls.at(-1), evt.target);
            return;
        }

        // No contacting hits, but we have a lastHitEl and proximity allowance
        if (this.data.proximity > 0 && this.lastHitEl) {
            evt.target.object3D.getWorldPosition(posVect3);
            let proxDist = posVect3.distanceTo(this.lastHitPos); // Hand deviation from last hit
            this.lastHitEl.object3D.getWorldPosition(posVect3);
            proxDist += posVect3.distanceTo(this.lastHitPos); // Object deviation from last hit
            if (proxDist > this.data.proximity) {
                // Combined distances out of proximity, invalidate lastHitEl
                this.lastHitEl = undefined;
                return;
            }
            // Otherwise (still or back within proximity), grab lastHitEl
            this.startGrab(this.lastHitEl, evt.target);
        }
    },

    // This does not remove ability to re-grab while collision has not ended;
    // when jointed on grab, the object should still be colliding with hand
    onGripOpen: function(_evt) {
        const { grabEl } = this;
        this.grabbing = false;
        if (!grabEl) {
            return;
        }
        grabEl.removeState(GRABBED_STATE);

        this.grabEl = undefined;

        this.removeJoint();
    },

    onHit: function(evt) {
        const hitEl = evt.detail.otherComponent?.el;
        // If the element is already grabbed (it could be grabbed by another controller).
        // If the hand is not grabbing the element does not stick.
        // If we're already grabbing something you can't grab again.
        if (!hitEl || hitEl.getAttribute('physx-grabbable') === null || hitEl.is(GRABBED_STATE) || this.grabEl) {
            return;
        }
        if (!this.grabbing) {
            // Intuitively, hand might not start grabbing until after a collision, track this obj
            this.hitEls.push(hitEl);
            return;
        }

        this.startGrab(hitEl, evt.target);
    },

    // Might be called from hit or from grip close
    startGrab(grabEl, grabberEl) {
        grabEl.addState(GRABBED_STATE);
        this.grabEl = grabEl;

        this.addJoint(grabEl, grabberEl);
    },

    onHitEnd: function(evt) {
        const unhitEl = evt.detail.otherComponent?.el;
        const index = this.hitEls.indexOf(unhitEl);
        if (index > -1) {
            this.hitEls.splice(index, 1);
        }

        // If we are allowing proximity grab, track last hit object
        if (this.data.proximity > 0 && evt.target) {
            this.lastHitEl = unhitEl;
            evt.target.object3D.getWorldPosition(this.lastHitPos);
        }
    },

    addJoint(el, target) {
        this.removeJoint();

        this.joint = document.createElement('a-entity');
        this.joint.setAttribute('physx-joint', `type: Fixed; target: #${target.id}`);

        el.appendChild(this.joint);
    },

    removeJoint() {
        if (!this.joint) return;
        this.joint.parentElement.removeChild(this.joint);
        this.joint = null;
    }
});
