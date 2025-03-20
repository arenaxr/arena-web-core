/**
 * Force Pushable component.
 *
 * Based on an original component by Don McCurdy in aframe-physics-system
 *
 * Copyright (c) 2016 Don McCurdy
 *
 * Applies behavior to the current entity such that cursor clicks will apply a
 * strong impulse, pushing the entity away from the viewer.
 *
 * Requires: physx
 */
AFRAME.registerComponent('physx-force-pushable', {
  schema: {
    force: { default: 10 },
    on: { default: 'mousedown' }
  },
  init: function () {

    this.pStart = new THREE.Vector3();
    this.sourceEl = this.el.sceneEl.querySelector('[camera]');
    this.forcePushPhysX = this.forcePushPhysX.bind(this);

    this.sourcePosition = new THREE.Vector3();
    this.force = new THREE.Vector3();
    this.pos = new THREE.Vector3();
  },

  play() {
    this.el.addEventListener(this.data.on, this.forcePushPhysX);
  },

  pause() {
    this.el.removeEventListener(this.data.on, this.forcePushPhysX);
  },

  forcePushPhysX: function (e) {

    const el = this.el
    if (!el.components['physx-body']) return
    const body = el.components['physx-body'].rigidBody
    if (!body) return

    const force = this.force
    const source = this.sourcePosition

    // WebXR requires care getting camera position https://github.com/mrdoob/three.js/issues/18448
    source.setFromMatrixPosition( this.sourceEl.object3D.matrixWorld );

    el.object3D.getWorldPosition(force)
    force.sub(source)

    force.normalize();

    // not sure about units, but force seems stronger with PhysX than Cannon, so scaling down
    // by a factor of 5.
    force.multiplyScalar(this.data.force / 5);

    // use data from intersection to determine point at which to apply impulse.
    const pos = this.pos
    pos.copy(e.detail.intersection.point)
    el.object3D.worldToLocal(pos)

    body.addImpulseAtLocalPos(force, pos);
  }
});
