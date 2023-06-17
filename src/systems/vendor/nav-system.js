/**
 * Monkeypatched AFRAME-extras nav system, with modifications of:
 * - pathfinding instance is in scope of system
 * - getNode allows optional param to allow non-coplanar closestNode
 */

const { Pathfinding } = require('three-pathfinding');

const ZONE = 'level';

/**
 * nav
 *
 * Pathfinding system, using PatrolJS.
 */

AFRAME.systems.nav.prototype.init = function () {
    this.navMesh = null;
    this.agents = new Set();
    this.pathfinder = new Pathfinding();
};

/**
 * @param {THREE.Geometry} geometry
 */
AFRAME.systems.nav.prototype.setNavMeshGeometry = function (geometry) {
    this.navMesh = new THREE.Mesh(geometry);
    this.pathfinder.setZoneData(ZONE, Pathfinding.createZone(geometry));
    Array.from(this.agents).forEach((agent) => agent.updateNavLocation());
};

/**
 * @param  {THREE.Vector3} start
 * @param  {THREE.Vector3} end
 * @param  {number} groupID
 * @return {Array<THREE.Vector3>}
 */
AFRAME.systems.nav.prototype.getPath = function (start, end, groupID) {
    return this.navMesh ? this.pathfinder.findPath(start, end, ZONE, groupID) : null;
};

/**
 * @param {THREE.Vector3} position
 * @param {boolean} checkPolygon - Check coplanar groups only
 * @return {number}
 */
AFRAME.systems.nav.prototype.getGroup = function (position, checkPolygon = true) {
    return this.navMesh ? this.pathfinder.getGroup(ZONE, position, checkPolygon) : null;
};

/**
 * @param  {THREE.Vector3} position
 * @param  {number} groupID
 * @param  {boolean} checkPolygon - Restrict getClosest node to coplanar
 * @return {Node}
 */
AFRAME.systems.nav.prototype.getNode = function (position, groupID, checkPolygon = true) {
    return this.navMesh ? this.pathfinder.getClosestNode(position, ZONE, groupID, checkPolygon) : null;
};

/**
 * @param  {THREE.Vector3} start Starting position.
 * @param  {THREE.Vector3} end Desired ending position.
 * @param  {number} groupID
 * @param  {Node} node
 * @param  {THREE.Vector3} endTarget (Output) Adjusted step end position.
 * @return {Node} Current node, after step is taken.
 */
AFRAME.systems.nav.prototype.clampStep = function (start, end, groupID, node, endTarget) {
    if (!this.navMesh) {
        endTarget.copy(end);
        return null;
    }
    if (!node) {
        endTarget.copy(end);
        return this.getNode(end, groupID);
    }
    return this.pathfinder.clampStep(start, end, node, ZONE, groupID, endTarget);
};
