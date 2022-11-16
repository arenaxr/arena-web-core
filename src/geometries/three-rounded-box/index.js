/**
 * @author pailhead / http://dusanbosnjak.com
 * @author benolayinka / github.com/benolayinka
 * https://github.com/invenktive/three-rounded-box/blob/ffe80b143dd0caa82cd4dd3f4e8956bcd23fbb85/index.js
 */
export default function(THREE) {
    return class RoundedBoxGeometry extends THREE.BufferGeometry {
        constructor(width, height, depth, radius, radiusSegments) {
            super();
            this.type = 'RoundedBoxGeometry';
            // validate params ===================================

            radiusSegments = !isNaN(radiusSegments) ?
                Math.max(1, Math.floor(radiusSegments)) :
                1;
            width = !isNaN(width) ? width : 1;
            height = !isNaN(height) ? height : 1;
            depth = !isNaN(depth) ? depth : 1;
            radius = !isNaN(radius) ? radius : 0.15;
            radius = Math.min(
                radius,
                Math.min(width, Math.min(height, Math.min(depth))) / 2,
            );
            const edgeHalfWidth = width / 2 - radius;
            const edgeHalfHeight = height / 2 - radius;
            const edgeHalfDepth = depth / 2 - radius;

            // not sure why this is needed, for querying? ========
            this.parameters = {
                width: width,
                height: height,
                depth: depth,
                radius: radius,
                radiusSegments: radiusSegments,
            };

            // calculate vertices count ==========================
            const rs1 = radiusSegments + 1; // radius segments + 1
            const totalVertexCount = (rs1 * radiusSegments + 1) << 3;

            // make buffers ======================================
            const positions = new THREE.BufferAttribute(
                new Float32Array(totalVertexCount * 3),
                3,
            );

            const normals = new THREE.BufferAttribute(
                new Float32Array(totalVertexCount * 3),
                3,
            );

            // some consts =========================================
            const cornerVerts = [];
            const cornerNormals = [];
            const normal = new THREE.Vector3();
            const vertex = new THREE.Vector3();
            const vertexPool = [];
            const normalPool = [];
            const indices = [];
            const lastVertex = rs1 * radiusSegments;
            const cornerVertNumber = rs1 * radiusSegments + 1;
            doVertices();
            doFaces();
            doCorners();
            doHeightEdges();
            doWidthEdges();
            doDepthEdges();
            // calculate vert positions =========================
            function doVertices() {
                // corner offsets
                const cornerLayout = [
                    new THREE.Vector3(1, 1, 1),
                    new THREE.Vector3(1, 1, -1),
                    new THREE.Vector3(-1, 1, -1),
                    new THREE.Vector3(-1, 1, 1),
                    new THREE.Vector3(1, -1, 1),
                    new THREE.Vector3(1, -1, -1),
                    new THREE.Vector3(-1, -1, -1),
                    new THREE.Vector3(-1, -1, 1),
                ];
                // corner holder
                for (let j = 0; j < 8; j++) {
                    cornerVerts.push([]);
                    cornerNormals.push([]);
                }
                // construct 1/8 sphere ==============================
                const PIhalf = Math.PI / 2;
                const cornerOffset = new THREE.Vector3(
                    edgeHalfWidth,
                    edgeHalfHeight,
                    edgeHalfDepth,
                );
                for (let y = 0; y <= radiusSegments; y++) {
                    const v = y / radiusSegments;
                    const va = v * PIhalf; // arrange in 90 deg
                    const cosVa = Math.cos(va); // scale of vertical angle
                    const sinVa = Math.sin(va);
                    if (y == radiusSegments) {
                        vertex.set(0, 1, 0);
                        const vert = vertex
                            .clone()
                            .multiplyScalar(radius)
                            .add(cornerOffset);

                        cornerVerts[0].push(vert);
                        vertexPool.push(vert);

                        const norm = vertex.clone();
                        cornerNormals[0].push(norm);
                        normalPool.push(norm);
                        continue; // skip row loop
                    }
                    for (let x = 0; x <= radiusSegments; x++) {
                        const u = x / radiusSegments;
                        const ha = u * PIhalf;
                        // make 1/8 sphere points
                        vertex.x = cosVa * Math.cos(ha);
                        vertex.y = sinVa;
                        vertex.z = cosVa * Math.sin(ha);
                        // copy sphere point, scale by radius, offset by half whd
                        const vert = vertex
                            .clone()
                            .multiplyScalar(radius)
                            .add(cornerOffset);
                        cornerVerts[0].push(vert);
                        vertexPool.push(vert);

                        // sphere already normalized, just clone
                        const norm = vertex.clone().normalize();
                        cornerNormals[0].push(norm);
                        normalPool.push(norm);
                    }
                }
                // distribute corner verts ===========================
                for (let i = 1; i < 8; i++) {
                    for (let j = 0; j < cornerVerts[0].length; j++) {
                        const vert = cornerVerts[0][j].clone().multiply(cornerLayout[i]);
                        cornerVerts[i].push(vert);

                        vertexPool.push(vert);
                        const norm = cornerNormals[0][j].clone().multiply(cornerLayout[i]);
                        cornerNormals[i].push(norm);
                        normalPool.push(norm);
                    }
                }
            }

            // weave corners ====================================
            function doCorners() {
                const indexInd = 0;

                const flips = [true, false, true, false, false, true, false, true];
                const lastRowOffset = rs1 * (radiusSegments - 1);
                for (let i = 0; i < 8; i++) {
                    const cornerOffset = cornerVertNumber * i;
                    for (let v = 0; v < radiusSegments - 1; v++) {
                        const r1 = v * rs1; // row offset
                        const r2 = (v + 1) * rs1; // next row
                        for (let u = 0; u < radiusSegments; u++) {
                            const u1 = u + 1;
                            const a = cornerOffset + r1 + u;
                            const b = cornerOffset + r1 + u1;
                            const c = cornerOffset + r2 + u;
                            const d = cornerOffset + r2 + u1;
                            if (!flips[i]) {
                                indices.push(a);
                                indices.push(b);
                                indices.push(c);
                                indices.push(b);
                                indices.push(d);
                                indices.push(c);
                            } else {
                                indices.push(a);
                                indices.push(c);
                                indices.push(b);
                                indices.push(b);
                                indices.push(c);
                                indices.push(d);
                            }
                        }
                    }

                    for (let u = 0; u < radiusSegments; u++) {
                        const a = cornerOffset + lastRowOffset + u;
                        const b = cornerOffset + lastRowOffset + u + 1;
                        const c = cornerOffset + lastVertex;
                        if (!flips[i]) {
                            indices.push(a);
                            indices.push(b);
                            indices.push(c);
                        } else {
                            indices.push(a);
                            indices.push(c);
                            indices.push(b);
                        }
                    }
                }
            }

            // plates ============================================
            // fix this loop matrices find pattern something
            function doFaces() {
                // top
                let a = lastVertex; // + cornerVertNumber * 0;
                let b = lastVertex + cornerVertNumber; // * 1;
                let c = lastVertex + cornerVertNumber * 2;
                let d = lastVertex + cornerVertNumber * 3;
                indices.push(a);
                indices.push(b);
                indices.push(c);
                indices.push(a);
                indices.push(c);
                indices.push(d);
                // bottom
                a = lastVertex + cornerVertNumber * 4; // + cornerVertNumber * 0;
                b = lastVertex + cornerVertNumber * 5; // * 1;
                c = lastVertex + cornerVertNumber * 6;
                d = lastVertex + cornerVertNumber * 7;
                indices.push(a);
                indices.push(c);
                indices.push(b);
                indices.push(a);
                indices.push(d);
                indices.push(c);
                // left
                a = 0;
                b = cornerVertNumber;
                c = cornerVertNumber * 4;
                d = cornerVertNumber * 5;
                indices.push(a);
                indices.push(c);
                indices.push(b);
                indices.push(b);
                indices.push(c);
                indices.push(d);
                // right
                a = cornerVertNumber * 2;
                b = cornerVertNumber * 3;
                c = cornerVertNumber * 6;
                d = cornerVertNumber * 7;
                indices.push(a);
                indices.push(c);
                indices.push(b);
                indices.push(b);
                indices.push(c);
                indices.push(d);
                // front
                a = radiusSegments;
                b = radiusSegments + cornerVertNumber * 3;
                c = radiusSegments + cornerVertNumber * 4;
                d = radiusSegments + cornerVertNumber * 7;
                indices.push(a);
                indices.push(b);
                indices.push(c);
                indices.push(b);
                indices.push(d);
                indices.push(c);
                // back
                a = radiusSegments + cornerVertNumber;
                b = radiusSegments + cornerVertNumber * 2;
                c = radiusSegments + cornerVertNumber * 5;
                d = radiusSegments + cornerVertNumber * 6;
                indices.push(a);
                indices.push(c);
                indices.push(b);
                indices.push(b);
                indices.push(c);
                indices.push(d);
            }

            // weave edges ======================================
            function doHeightEdges() {
                for (let i = 0; i < 4; i++) {
                    const cOffset = i * cornerVertNumber;
                    const cRowOffset = 4 * cornerVertNumber + cOffset;
                    const needsFlip = i & (1 === 1);
                    for (let u = 0; u < radiusSegments; u++) {
                        const u1 = u + 1;
                        const a = cOffset + u;
                        const b = cOffset + u1;
                        const c = cRowOffset + u;
                        const d = cRowOffset + u1;
                        if (!needsFlip) {
                            indices.push(a);
                            indices.push(b);
                            indices.push(c);
                            indices.push(b);
                            indices.push(d);
                            indices.push(c);
                        } else {
                            indices.push(a);
                            indices.push(c);
                            indices.push(b);
                            indices.push(b);
                            indices.push(c);
                            indices.push(d);
                        }
                    }
                }
            }

            function doDepthEdges() {
                const cStarts = [0, 2, 4, 6];
                const cEnds = [1, 3, 5, 7];

                for (let i = 0; i < 4; i++) {
                    const cStart = cornerVertNumber * cStarts[i];
                    const cEnd = cornerVertNumber * cEnds[i];
                    const needsFlip = 1 >= i;
                    for (let u = 0; u < radiusSegments; u++) {
                        const urs1 = u * rs1;
                        const u1rs1 = (u + 1) * rs1;
                        const a = cStart + urs1;
                        const b = cStart + u1rs1;
                        const c = cEnd + urs1;
                        const d = cEnd + u1rs1;
                        if (needsFlip) {
                            indices.push(a);
                            indices.push(c);
                            indices.push(b);
                            indices.push(b);
                            indices.push(c);
                            indices.push(d);
                        } else {
                            indices.push(a);
                            indices.push(b);
                            indices.push(c);
                            indices.push(b);
                            indices.push(d);
                            indices.push(c);
                        }
                    }
                }
            }
            function doWidthEdges() {
                const end = radiusSegments - 1;
                const cStarts = [0, 1, 4, 5];
                const cEnds = [3, 2, 7, 6];
                const needsFlip = [0, 1, 1, 0];
                for (let i = 0; i < 4; i++) {
                    const cStart = cStarts[i] * cornerVertNumber;
                    const cEnd = cEnds[i] * cornerVertNumber;

                    for (let u = 0; u <= end; u++) {
                        // const dInd = u != end ? radiusSegments + u * rs1 : cornerVertNumber - 1;
                        const a = cStart + radiusSegments + u * rs1;
                        const b =
                            cStart +
                            (u != end ?
                                radiusSegments + (u + 1) * rs1 :
                                cornerVertNumber - 1);
                        const c = cEnd + radiusSegments + u * rs1;
                        const d =
                            cEnd +
                            (u != end ?
                                radiusSegments + (u + 1) * rs1 :
                                cornerVertNumber - 1);
                        if (!needsFlip[i]) {
                            indices.push(a);
                            indices.push(b);
                            indices.push(c);
                            indices.push(b);
                            indices.push(d);
                            indices.push(c);
                        } else {
                            indices.push(a);
                            indices.push(c);
                            indices.push(b);
                            indices.push(b);
                            indices.push(c);
                            indices.push(d);
                        }
                    }
                }
            }

            // fill buffers ======================================
            let index = 0;
            for (let i = 0; i < vertexPool.length; i++) {
                positions.setXYZ(
                    index,
                    vertexPool[i].x,
                    vertexPool[i].y,
                    vertexPool[i].z,
                );
                normals.setXYZ(
                    index,
                    normalPool[i].x,
                    normalPool[i].y,
                    normalPool[i].z,
                );
                index++;
            }
            this.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

            this.setAttribute('position', positions);

            this.setAttribute('normal', normals);
        }
    };
}
