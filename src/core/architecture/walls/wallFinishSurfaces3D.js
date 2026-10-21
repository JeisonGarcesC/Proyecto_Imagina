import * as THREE from 'three';

// A finish surface is a portion of the existing exterior triangulation. Source
// polygons are intersected with those triangles; no new exterior is invented.
// ExtrudeGeometry stores positions in Float32; match that precision when
// classifying boundary faces against the original source polygons.
const EPSILON = 1e-7;

const cross2 = (a, b, p) =>
  (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);

function interpolate(a, b, t) {
  return {
    position: a.position.map((value, index) => value + (b.position[index] - value) * t),
    normal: a.normal.map((value, index) => value + (b.normal[index] - value) * t),
    uv: a.uv.map((value, index) => value + (b.uv[index] - value) * t),
  };
}

function clipHalfPlane(polygon, a, b, sign, strict = false) {
  const result = [];
  if (!polygon.length) return result;
  for (let i = 0; i < polygon.length; i += 1) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    const from = sign * cross2(a, b, { x: start.position[0], z: start.position[2] });
    const to = sign * cross2(a, b, { x: end.position[0], z: end.position[2] });
    const startInside = strict ? from > EPSILON : from >= -EPSILON;
    const endInside = strict ? to > EPSILON : to >= -EPSILON;
    if (startInside) result.push(start);
    if (startInside !== endInside && Math.abs(from - to) > EPSILON) {
      result.push(interpolate(start, end, Math.max(0, Math.min(1, from / (from - to)))));
    }
  }
  return result;
}

function splitByTriangle(polygon, triangle) {
  let inside = polygon;
  const outside = [];
  const orientation = Math.sign(cross2(triangle[0], triangle[1], triangle[2]));
  if (!orientation) return { inside: [], outside: [polygon] };
  for (let i = 0; i < 3 && inside.length; i += 1) {
    const a = triangle[i];
    const b = triangle[(i + 1) % 3];
    const rejected = clipHalfPlane(inside, a, b, -orientation, true);
    if (rejected.length >= 3) outside.push(rejected);
    inside = clipHalfPlane(inside, a, b, orientation);
  }
  return { inside, outside };
}

function surfaceAreaSquared(a, b, c) {
  const x = b.position[0] - a.position[0];
  const y = b.position[1] - a.position[1];
  const z = b.position[2] - a.position[2];
  const xx = c.position[0] - a.position[0];
  const yy = c.position[1] - a.position[1];
  const zz = c.position[2] - a.position[2];
  return (y * zz - z * yy) ** 2 + (z * xx - x * zz) ** 2 + (x * yy - y * xx) ** 2;
}

function triangulateSources(sources) {
  return (sources || []).flatMap((source) => {
    const polygon = source.polygon || [];
    if (polygon.length < 3) return [];
    const rounded = polygon.map((point) => ({ x: Math.fround(point.x), z: Math.fround(point.z) }));
    const vertices = rounded.map((point) => new THREE.Vector2(point.x, point.z));
    return THREE.ShapeUtils.triangulateShape(vertices, []).map((indices) => {
      const triangle = indices.map((index) => rounded[index]);
      return {
        triangle,
        bounds: {
          minX: Math.min(...triangle.map((point) => point.x)),
          maxX: Math.max(...triangle.map((point) => point.x)),
          minZ: Math.min(...triangle.map((point) => point.z)),
          maxZ: Math.max(...triangle.map((point) => point.z)),
        },
        wallIds: source.wallIds,
        segmentId: source.segmentId || null,
      };
    });
  });
}

function overlaps(bounds, triangle) {
  return !(bounds.maxX < triangle.minX - EPSILON || bounds.minX > triangle.maxX + EPSILON ||
    bounds.maxZ < triangle.minZ - EPSILON || bounds.minZ > triangle.maxZ + EPSILON);
}

// Splits only the visible triangles already produced by ExtrudeGeometry.
// Each resulting material group has an exact set of source wall IDs.
export function attributeWallFinishGeometry(geometry, sources) {
  if (!geometry || !sources?.length) return geometry;
  const original = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = original.getAttribute('position');
  const normal = original.getAttribute('normal');
  const uv = original.getAttribute('uv');
  const sourceTriangles = triangulateSources(sources);
  const positions = [];
  const normals = [];
  const uvs = [];
  const groups = [];
  const classes = [];
  const classKeys = new Map();

  for (let index = 0; index < position.count; index += 3) {
    const vertices = [index, index + 1, index + 2].map((vertex) => ({
      position: [position.getX(vertex), position.getY(vertex), position.getZ(vertex)],
      normal: [normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)],
      uv: [uv.getX(vertex), uv.getY(vertex)],
    }));
    const bounds = {
      minX: Math.min(...vertices.map((v) => v.position[0])),
      maxX: Math.max(...vertices.map((v) => v.position[0])),
      minZ: Math.min(...vertices.map((v) => v.position[2])),
      maxZ: Math.max(...vertices.map((v) => v.position[2])),
    };
    let fragments = [{ polygon: vertices, wallIds: new Set(), segmentIds: new Set() }];
    for (const source of sourceTriangles) {
      if (!overlaps(bounds, source.bounds)) continue;
      fragments = fragments.flatMap((fragment) => {
        const { inside, outside } = splitByTriangle(fragment.polygon, source.triangle);
        const parts = outside.map((polygon) => ({ ...fragment, polygon }));
        if (inside.length >= 3) parts.push({
          polygon: inside,
          wallIds: new Set([...fragment.wallIds, ...source.wallIds]),
          segmentIds: new Set(source.segmentId
            ? [...fragment.segmentIds, source.segmentId] : fragment.segmentIds),
        });
        return parts;
      });
    }
    for (const fragment of fragments) {
      const wallIds = [...fragment.wallIds].sort();
      const segmentIds = [...fragment.segmentIds].sort();
      const key = wallIds.join('\u0000');
      for (let i = 1; i < fragment.polygon.length - 1; i += 1) {
        const face = [fragment.polygon[0], fragment.polygon[i], fragment.polygon[i + 1]];
        if (surfaceAreaSquared(...face) <= EPSILON ** 2) continue;
        let materialIndex = classKeys.get(key);
        if (materialIndex == null) {
          materialIndex = classes.length;
          classKeys.set(key, materialIndex);
          classes.push({ type: wallIds.length === 1 ? 'EXCLUSIVE' : 'SHARED', wallIds });
        }
        const start = positions.length / 3;
        for (const vertex of face) {
          positions.push(...vertex.position);
          normals.push(...vertex.normal);
          uvs.push(...vertex.uv);
        }
        const previous = groups.at(-1);
        if (previous?.materialIndex === materialIndex && previous.start + previous.count === start) {
          previous.count += 3;
          previous.segmentIds = [...new Set([...previous.segmentIds, ...segmentIds])].sort();
        } else groups.push({ start, count: 3, materialIndex, segmentIds });
      }
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  for (const group of groups) result.addGroup(group.start, group.count, group.materialIndex);
  result.userData.wallFinishClasses = classes;
  result.userData.wallFinishGroups = groups;
  if (original !== geometry) original.dispose();
  geometry.dispose();
  return result;
}

export function getWallFinishSurfaces(wallsGroup, wallId) {
  const surfaces = [];
  wallsGroup?.traverse((mesh) => {
    if (!mesh.isMesh || mesh.userData?.kind !== 'WALL') return;
    const classes = mesh.geometry?.userData?.wallFinishClasses || [];
    for (const group of mesh.geometry?.userData?.wallFinishGroups || []) {
      const classification = classes[group.materialIndex];
      if (classification?.type === 'EXCLUSIVE' && classification.wallIds[0] === wallId) {
        surfaces.push({ mesh, start: group.start, count: group.count,
          materialIndex: group.materialIndex, type: 'EXCLUSIVE',
          wallIds: classification.wallIds, segmentIds: group.segmentIds });
      }
    }
  });
  return surfaces;
}
