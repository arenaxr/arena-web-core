/**
 * Grab component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 */

const GRABBED_STATE = 'grabbed-dynamic';

AFRAME.registerComponent('physx-grab', {
    init: function() {

        // If a state of "grabbed" is set on a physx-body entity,
        // the entity is automatically transformed into a kinematic entity.
        // To avoid triggering this (we want to grab using constraints, and leave the
        // body as dynamic), we use a non-clashing name for the state we set on the entity when
        // grabbing it.

        this.grabbing = false;
        this.grabEl =      /** @type {AFRAME.Element}    */ null;
        // Also track last grabbable el hit
        this.lastHitEl =   /** @type {AFRAME.Element}    */ null;

        // Bind event handlers
        this.onHit = this.onHit.bind(this);
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
        // Allow grab to start while contact is maintained
        if (this.lastHitEl) {
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
            this.lastHitEl = hitEl;
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

    onHitEnd: function(_evt) {
        // TODO: Add proximity threshold after hit ends due to bounces off kinematic hand collider?
        this.lastHitEl = undefined;
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
