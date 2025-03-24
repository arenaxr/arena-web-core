/**
 * Grab component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 */

AFRAME.registerComponent('physx-grab', {
  init: function () {

    // If a state of "grabbed" is set on a physx-body entity,
    // the entity is automatically transformed into a kinematic entity.
    // To avoid triggering this (we want to grab using constraints, and leave the
    // body as dynamic), we use a non-clashing name for the state we set on the entity when
    // grabbing it.
    this.GRABBED_STATE = 'grabbed-dynamic';

    this.grabbing = false;
    this.hitEl =      /** @type {AFRAME.Element}    */ null;

    // Bind event handlers
    this.onHit = this.onHit.bind(this);
    this.onGripOpen = this.onGripOpen.bind(this);
    this.onGripClose = this.onGripClose.bind(this);

  },

  play: function () {
    var el = this.el;
    el.addEventListener('contactbegin', this.onHit);
    el.addEventListener('gripdown', this.onGripClose);
    el.addEventListener('gripup', this.onGripOpen);
    el.addEventListener('trackpaddown', this.onGripClose);
    el.addEventListener('trackpadup', this.onGripOpen);
    el.addEventListener('triggerdown', this.onGripClose);
    el.addEventListener('triggerup', this.onGripOpen);
  },

  pause: function () {
    var el = this.el;
    el.removeEventListener('contactbegin', this.onHit);
    el.removeEventListener('gripdown', this.onGripClose);
    el.removeEventListener('gripup', this.onGripOpen);
    el.removeEventListener('trackpaddown', this.onGripClose);
    el.removeEventListener('trackpadup', this.onGripOpen);
    el.removeEventListener('triggerdown', this.onGripClose);
    el.removeEventListener('triggerup', this.onGripOpen);
  },

  onGripClose: function (evt) {
    this.grabbing = true;
  },

  onGripOpen: function (evt) {
    var hitEl = this.hitEl;
    this.grabbing = false;
    if (!hitEl) { return; }
    hitEl.removeState(this.GRABBED_STATE);

    this.hitEl = undefined;

    this.removeJoint()
  },

  onHit: function (evt) {
    var hitEl = evt.detail.otherComponent?.el;
    // If the element is already grabbed (it could be grabbed by another controller).
    // If the hand is not grabbing the element does not stick.
    // If we're already grabbing something you can't grab again.
    if (!hitEl || hitEl.getAttribute("physx-grabbable") === null ||
      hitEl.is(this.GRABBED_STATE) || !this.grabbing || this.hitEl) {
      return;
    }
    hitEl.addState(this.GRABBED_STATE);
    this.hitEl = hitEl;

    this.addJoint(hitEl, evt.target)
  },

  addJoint(el, target) {

    this.removeJoint()

    this.joint = document.createElement('a-entity')
    this.joint.setAttribute("physx-joint", `type: Fixed; target: #${target.id}`)

    el.appendChild(this.joint)
  },

  removeJoint() {

    if (!this.joint) return
    this.joint.parentElement.removeChild(this.joint)
    this.joint = null
  }
});
