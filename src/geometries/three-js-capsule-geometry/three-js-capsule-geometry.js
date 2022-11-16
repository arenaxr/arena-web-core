const THREECapsuleBufferGeometry = (function(exports, three) {
    'use strict';

    /**
     * @author maximequiblier
     */

    class CapsuleBufferGeometry extends three.BufferGeometry {
        constructor(radiusTop, radiusBottom, height, radialSegments, heightSegments, capsTopSegments, capsBottomSegments, thetaStart, thetaLength) {
            super();

            this.type = 'CapsuleBufferGeometry';

            this.parameters = {
                radiusTop: radiusTop,
                radiusBottom: radiusBottom,
                height: height,
                radialSegments: radialSegments,
                heightSegments: heightSegments,
                thetaStart: thetaStart,
                thetaLength: thetaLength,
            };

            radiusTop = radiusTop !== undefined ? radiusTop : 1;
            radiusBottom = radiusBottom !== undefined ? radiusBottom : 1;
            height = height !== undefined ? height : 2;

            radialSegments = Math.floor(radialSegments) || 8;
            heightSegments = Math.floor(heightSegments) || 1;
            capsTopSegments = Math.floor(capsTopSegments) || 2;
            capsBottomSegments = Math.floor(capsBottomSegments) || 2;

            thetaStart = thetaStart !== undefined ? thetaStart : 0.0;
            thetaLength = thetaLength !== undefined ? thetaLength : 2.0 * Math.PI;

            // Alpha is the angle such that Math.PI/2 - alpha is the cone part angle.
            const alpha = Math.acos((radiusBottom - radiusTop) / height);

            const vertexCount = calculateVertexCount();
            const indexCount = calculateIndexCount();

            // buffers
            const indices = new three.BufferAttribute(new (indexCount > 65535 ? Uint32Array : Uint16Array)(indexCount), 1);
            const vertices = new three.BufferAttribute(new Float32Array(vertexCount * 3), 3);
            const normals = new three.BufferAttribute(new Float32Array(vertexCount * 3), 3);
            const uvs = new three.BufferAttribute(new Float32Array(vertexCount * 2), 2);

            // helper variables

            let index = 0;
            let indexOffset = 0;
            const indexArray = [];
            const halfHeight = height / 2;

            // generate geometry

            generateTorso();

            // build geometry

            this.setIndex(indices);
            this.setAttribute('position', vertices);
            this.setAttribute('normal', normals);
            this.setAttribute('uv', uvs);

            // helper functions

            function calculateVertexCount() {
                const count = (radialSegments + 1) * (heightSegments + 1 + capsBottomSegments + capsTopSegments);
                return count;
            }

            function calculateIndexCount() {
                const count = radialSegments * (heightSegments + capsBottomSegments + capsTopSegments) * 2 * 3;
                return count;
            }

            function generateTorso() {
                let x; let y;
                const normal = new three.Vector3();
                const vertex = new three.Vector3();

                const cosAlpha = Math.cos(alpha);
                const sinAlpha = Math.sin(alpha);

                const cone_length =
                    new three.Vector2(
                        radiusTop * sinAlpha,
                        halfHeight + radiusTop * cosAlpha,
                    ).sub(new three.Vector2(
                        radiusBottom * sinAlpha,
                        -halfHeight + radiusBottom * cosAlpha,
                    ),
                    ).length();

                // Total length for v texture coord
                const vl = radiusTop * alpha +
                    cone_length +
                    radiusBottom * (Math.PI / 2 - alpha);

                // generate vertices, normals and uvs

                let v = 0;
                for (y = 0; y <= capsTopSegments; y++) {
                    var indexRow = [];

                    var a = Math.PI / 2 - alpha * (y / capsTopSegments);

                    v += radiusTop * alpha / capsTopSegments;

                    var cosA = Math.cos(a);
                    var sinA = Math.sin(a);

                    // calculate the radius of the current row
                    var radius = cosA * radiusTop;

                    for (x = 0; x <= radialSegments; x++) {
                        var u = x / radialSegments;

                        var theta = u * thetaLength + thetaStart;

                        var sinTheta = Math.sin(theta);
                        var cosTheta = Math.cos(theta);

                        // vertex
                        vertex.x = radius * sinTheta;
                        vertex.y = halfHeight + sinA * radiusTop;
                        vertex.z = radius * cosTheta;
                        vertices.setXYZ(index, vertex.x, vertex.y, vertex.z);

                        // normal
                        normal.set(cosA * sinTheta, sinA, cosA * cosTheta);
                        normals.setXYZ(index, normal.x, normal.y, normal.z);

                        // uv
                        uvs.setXY(index, u, 1 - v / vl);

                        // save index of vertex in respective row
                        indexRow.push(index);

                        // increase index
                        index++;
                    }

                    // now save vertices of the row in our index array
                    indexArray.push(indexRow);
                }

                const cone_height = height + cosAlpha * radiusTop - cosAlpha * radiusBottom;
                const slope = sinAlpha * (radiusBottom - radiusTop) / cone_height;
                for (y = 1; y <= heightSegments; y++) {
                    var indexRow = [];

                    v += cone_length / heightSegments;

                    // calculate the radius of the current row
                    var radius = sinAlpha * (y * (radiusBottom - radiusTop) / heightSegments + radiusTop);

                    for (x = 0; x <= radialSegments; x++) {
                        var u = x / radialSegments;

                        var theta = u * thetaLength + thetaStart;

                        var sinTheta = Math.sin(theta);
                        var cosTheta = Math.cos(theta);

                        // vertex
                        vertex.x = radius * sinTheta;
                        vertex.y = halfHeight + cosAlpha * radiusTop - y * cone_height / heightSegments;
                        vertex.z = radius * cosTheta;
                        vertices.setXYZ(index, vertex.x, vertex.y, vertex.z);

                        // normal
                        normal.set(sinTheta, slope, cosTheta).normalize();
                        normals.setXYZ(index, normal.x, normal.y, normal.z);

                        // uv
                        uvs.setXY(index, u, 1 - v / vl);

                        // save index of vertex in respective row
                        indexRow.push(index);

                        // increase index
                        index++;
                    }

                    // now save vertices of the row in our index array
                    indexArray.push(indexRow);
                }

                for (y = 1; y <= capsBottomSegments; y++) {
                    var indexRow = [];

                    var a = (Math.PI / 2 - alpha) - (Math.PI - alpha) * (y / capsBottomSegments);

                    v += radiusBottom * alpha / capsBottomSegments;

                    var cosA = Math.cos(a);
                    var sinA = Math.sin(a);

                    // calculate the radius of the current row
                    var radius = cosA * radiusBottom;

                    for (x = 0; x <= radialSegments; x++) {
                        var u = x / radialSegments;

                        var theta = u * thetaLength + thetaStart;

                        var sinTheta = Math.sin(theta);
                        var cosTheta = Math.cos(theta);

                        // vertex
                        vertex.x = radius * sinTheta;
                        vertex.y = -halfHeight + sinA * radiusBottom; vertex.z = radius * cosTheta;
                        vertices.setXYZ(index, vertex.x, vertex.y, vertex.z);

                        // normal
                        normal.set(cosA * sinTheta, sinA, cosA * cosTheta);
                        normals.setXYZ(index, normal.x, normal.y, normal.z);

                        // uv
                        uvs.setXY(index, u, 1 - v / vl);

                        // save index of vertex in respective row
                        indexRow.push(index);

                        // increase index
                        index++;
                    }

                    // now save vertices of the row in our index array
                    indexArray.push(indexRow);
                }

                // generate indices

                for (x = 0; x < radialSegments; x++) {
                    for (y = 0; y < capsTopSegments + heightSegments + capsBottomSegments; y++) {
                        // we use the index array to access the correct indices
                        const i1 = indexArray[y][x];
                        const i2 = indexArray[y + 1][x];
                        const i3 = indexArray[y + 1][x + 1];
                        const i4 = indexArray[y][x + 1];

                        // face one
                        indices.setX(indexOffset, i1); indexOffset++;
                        indices.setX(indexOffset, i2); indexOffset++;
                        indices.setX(indexOffset, i4); indexOffset++;

                        // face two
                        indices.setX(indexOffset, i2); indexOffset++;
                        indices.setX(indexOffset, i3); indexOffset++;
                        indices.setX(indexOffset, i4); indexOffset++;
                    }
                }
            }
        }

        static fromPoints(pointA, pointB, radiusA, radiusB, radialSegments, heightSegments, capsTopSegments, capsBottomSegments, thetaStart, thetaLength) {
            let cmin = null;
            let cmax = null;
            let rmin = null;
            let rmax = null;

            if (radiusA > radiusB) {
                cmax = pointA;
                cmin = pointB;
                rmax = radiusA;
                rmin = radiusB;
            } else {
                cmax = pointA;
                cmin = pointB;
                rmax = radiusA;
                rmin = radiusB;
            }

            const c0 = cmin;
            const c1 = cmax;
            const r0 = rmin;
            const r1 = rmax;

            const sphereCenterTop = new three.Vector3(c0.x, c0.y, c0.z);
            const sphereCenterBottom = new three.Vector3(c1.x, c1.y, c1.z);

            const radiusTop = r0;
            const radiusBottom = r1;
            const height = sphereCenterTop.distanceTo(sphereCenterBottom);

            // If the big sphere contains the small one, return a SphereBufferGeometry
            if (height < Math.abs(r0 - r1)) {
                const g = new three.SphereBufferGeometry(r1, radialSegments, capsBottomSegments, thetaStart, thetaLength);

                g.translate(r1.x, r1.y, r1.z);
                return g;
            }

            // useful values
            const alpha = Math.acos((radiusBottom - radiusTop) / height);
            const cosAlpha = Math.cos(alpha);

            // compute rotation matrix
            const rotationMatrix = new three.Matrix4();
            const quaternion = new three.Quaternion();
            const capsuleModelUnitVector = new three.Vector3(0, 1, 0);
            const capsuleUnitVector = new three.Vector3();
            capsuleUnitVector.subVectors(sphereCenterTop, sphereCenterBottom);
            capsuleUnitVector.normalize();
            quaternion.setFromUnitVectors(capsuleModelUnitVector, capsuleUnitVector);
            rotationMatrix.makeRotationFromQuaternion(quaternion);

            // compute translation matrix from center point
            const translationMatrix = new three.Matrix4();
            const cylVec = new three.Vector3();
            cylVec.subVectors(sphereCenterTop, sphereCenterBottom);
            cylVec.normalize();
            let cylTopPoint = new three.Vector3();
            cylTopPoint = sphereCenterTop;
            cylTopPoint.addScaledVector(cylVec, cosAlpha * radiusTop);
            let cylBottomPoint = new three.Vector3();
            cylBottomPoint = sphereCenterBottom;
            cylBottomPoint.addScaledVector(cylVec, cosAlpha * radiusBottom);

            // computing lerp for color
            const dir = new three.Vector3();
            dir.subVectors(cylBottomPoint, cylTopPoint);
            dir.normalize();

            const middlePoint = new three.Vector3();
            middlePoint.lerpVectors(cylBottomPoint, cylTopPoint, 0.5);
            translationMatrix.makeTranslation(middlePoint.x, middlePoint.y, middlePoint.z);

            // Instanciate a CylinderBufferGeometry from three.js
            const g = new CapsuleBufferGeometry(radiusBottom, radiusTop, height, radialSegments, heightSegments, capsTopSegments, capsBottomSegments, thetaStart, thetaLength);

            // applying transformations
            g.applyMatrix(rotationMatrix);
            g.applyMatrix(translationMatrix);

            return g;
        };
    }

    function checkLib(libName, lib) {
        try {
            if (THREE[libName] === undefined) {
                THREE[libName] = lib;
                return;
            }

            if (THREE[libName] !== lib) {
                const message = `CapsuleBufferGeometry: ${libName} is duplicated. Your bundle includes ${libName} twice. Please repair your bundle.`;
                throw message;
            }
        } catch {
            console.warn(`CapsuleBufferGeometry: THREE is not defined. Duplication check unavailable.`);
        }
    }

    checkLib('CapsuleBufferGeometry', CapsuleBufferGeometry);

    exports.CapsuleBufferGeometry = CapsuleBufferGeometry;

    Object.defineProperty(exports, '__esModule', {value: true});

    return exports;
})({}, THREE);
// # sourceMappingURL=three-js-capsule-geometry.js.map
