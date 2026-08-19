import { buildWallGeometry2D } from './wallGeometry2D.js';

export const JOIN_EPSILON = 1e-5;
export const WALL_JOIN_TYPES = Object.freeze({
  STRAIGHT: 'STRAIGHT',
  L: 'L',
  T: 'T',
  X: 'X',
  END: 'END',
});

const cross = (a, b) => a.x * b.z - a.z * b.x;
const dot = (a, b) => a.x * b.x + a.z * b.z;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function cloneSegment(segment, wallId) {
  return {
    ...segment,
    wallId,
    start: { ...segment.start },
    end: { ...segment.end },
    resolvedStart: { ...segment.start },
    resolvedEnd: { ...segment.end },
    center: { ...segment.center },
    direction: { ...segment.direction },
    normal: { ...segment.normal },
    polygon: segment.polygon.map((point) => ({ ...point })),
  };
}

function pointOnSegment(point, segment, epsilon) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= Number.EPSILON) return null;
  const t = ((point.x - segment.start.x) * dx + (point.z - segment.start.z) * dz) / lengthSquared;
  const projected = { x: segment.start.x + dx * t, z: segment.start.z + dz * t };
  return distance(point, projected) <= epsilon && t >= -epsilon && t <= 1 + epsilon ? t : null;
}

function segmentIntersection(a, b, epsilon) {
  const r = { x: a.end.x - a.start.x, z: a.end.z - a.start.z };
  const s = { x: b.end.x - b.start.x, z: b.end.z - b.start.z };
  const denominator = cross(r, s);
  if (Math.abs(denominator) <= epsilon) return null;
  const delta = { x: b.start.x - a.start.x, z: b.start.z - a.start.z };
  const t = cross(delta, s) / denominator;
  const u = cross(delta, r) / denominator;
  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null;
  return { point: { x: a.start.x + r.x * t, z: a.start.z + r.z * t }, t, u };
}

function endpointRef(segment, endpoint) {
  const isStart = endpoint === 'start';
  const ray = isStart
    ? { ...segment.direction }
    : { x: -segment.direction.x, z: -segment.direction.z };
  const normal = { x: -ray.z, z: ray.x };
  return { segment, kind: 'ENDPOINT', endpoint, ray, normal };
}

function interiorRef(segment) {
  return { segment, kind: 'INTERIOR' };
}

function addNode(nodes, point, refs, epsilon) {
  let node = nodes.find((candidate) => distance(candidate.point, point) <= epsilon);
  if (!node) {
    node = { point: { ...point }, refs: [] };
    nodes.push(node);
  }
  refs.forEach((ref) => {
    const key = `${ref.segment.wallId}:${ref.segment.segmentId}:${ref.kind}:${ref.endpoint || ''}`;
    if (!node.refs.some((current) => current.key === key)) node.refs.push({ ...ref, key });
  });
}

function collectJoinNodes(segments, epsilon) {
  const nodes = [];
  segments.forEach((segment) => {
    addNode(nodes, segment.start, [endpointRef(segment, 'start')], epsilon);
    addNode(nodes, segment.end, [endpointRef(segment, 'end')], epsilon);
  });

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const a = segments[i];
      const b = segments[j];
      const pairs = [
        ['start', a.start, 'start', b.start],
        ['start', a.start, 'end', b.end],
        ['end', a.end, 'start', b.start],
        ['end', a.end, 'end', b.end],
      ];
      let endpointMatch = false;
      for (const [aKey, aPoint, bKey, bPoint] of pairs) {
        if (distance(aPoint, bPoint) <= epsilon) {
          addNode(nodes, { x: (aPoint.x + bPoint.x) / 2, z: (aPoint.z + bPoint.z) / 2 }, [endpointRef(a, aKey), endpointRef(b, bKey)], epsilon);
          endpointMatch = true;
        }
      }
      if (endpointMatch) continue;

      for (const [endpoint, point] of [['start', a.start], ['end', a.end]]) {
        const t = pointOnSegment(point, b, epsilon);
        if (t != null && t > epsilon && t < 1 - epsilon) addNode(nodes, point, [endpointRef(a, endpoint), interiorRef(b)], epsilon);
      }
      for (const [endpoint, point] of [['start', b.start], ['end', b.end]]) {
        const t = pointOnSegment(point, a, epsilon);
        if (t != null && t > epsilon && t < 1 - epsilon) addNode(nodes, point, [endpointRef(b, endpoint), interiorRef(a)], epsilon);
      }

      const intersection = segmentIntersection(a, b, epsilon);
      if (intersection && intersection.t > epsilon && intersection.t < 1 - epsilon && intersection.u > epsilon && intersection.u < 1 - epsilon) {
        addNode(nodes, intersection.point, [interiorRef(a), interiorRef(b)], epsilon);
      }
    }
  }
  const compacted = [];
  nodes.forEach((node) => addNode(compacted, node.point, node.refs, epsilon));
  return compacted;
}

function getNodeRays(node) {
  return node.refs.flatMap((ref) => {
    if (ref.kind === 'ENDPOINT') return [{ ...ref, ray: ref.ray, normal: ref.normal }];
    const direction = ref.segment.direction;
    return [
      { ...ref, ray: { ...direction }, normal: { ...ref.segment.normal } },
      { ...ref, ray: { x: -direction.x, z: -direction.z }, normal: { x: -ref.segment.normal.x, z: -ref.segment.normal.z } },
    ];
  });
}

function classifyNode(node, epsilon) {
  const rays = getNodeRays(node);
  if (rays.length <= 1) return WALL_JOIN_TYPES.END;
  if (rays.length >= 4) return WALL_JOIN_TYPES.X;
  if (rays.length === 3) return WALL_JOIN_TYPES.T;
  return Math.abs(cross(rays[0].ray, rays[1].ray)) <= epsilon
    && dot(rays[0].ray, rays[1].ray) < 0
    ? WALL_JOIN_TYPES.STRAIGHT
    : WALL_JOIN_TYPES.L;
}

function lineIntersection(originA, directionA, originB, directionB, epsilon) {
  const denominator = cross(directionA, directionB);
  if (Math.abs(denominator) <= epsilon) return null;
  const delta = { x: originB.x - originA.x, z: originB.z - originA.z };
  const t = cross(delta, directionB) / denominator;
  return { x: originA.x + directionA.x * t, z: originA.z + directionA.z * t };
}

function setEndpointCorners(ref, plusPoint, minusPoint) {
  if (ref.endpoint === 'start') {
    ref.segment.polygon[0] = plusPoint;
    ref.segment.polygon[3] = minusPoint;
  } else {
    ref.segment.polygon[2] = plusPoint;
    ref.segment.polygon[1] = minusPoint;
  }
}

function applyMiter(node, epsilon) {
  const refs = node.refs.filter((ref) => ref.kind === 'ENDPOINT');
  if (refs.length !== 2) return;
  const [a, b] = refs;
  const offsetOrigin = (ref, sign) => ({
    x: node.point.x + ref.normal.x * ref.segment.halfThickness * sign,
    z: node.point.z + ref.normal.z * ref.segment.halfThickness * sign,
  });
  const plus = lineIntersection(offsetOrigin(a, 1), a.ray, offsetOrigin(b, 1), b.ray, epsilon);
  const minus = lineIntersection(offsetOrigin(a, -1), a.ray, offsetOrigin(b, -1), b.ray, epsilon);
  if (!plus || !minus) return;
  setEndpointCorners(a, plus, minus);
  setEndpointCorners(b, plus, minus);
}

function resolveHostAndBranches(node, epsilon) {
  const interior = node.refs.find((ref) => ref.kind === 'INTERIOR');
  if (interior) return { host: interior.segment, branches: node.refs.filter((ref) => ref.kind === 'ENDPOINT') };
  const endpoints = node.refs.filter((ref) => ref.kind === 'ENDPOINT');
  for (let i = 0; i < endpoints.length; i += 1) {
    for (let j = i + 1; j < endpoints.length; j += 1) {
      if (Math.abs(cross(endpoints[i].ray, endpoints[j].ray)) <= epsilon && dot(endpoints[i].ray, endpoints[j].ray) < 0) {
        return { host: endpoints[i].segment, branches: endpoints.filter((_, index) => index !== i && index !== j) };
      }
    }
  }
  return { host: null, branches: [] };
}

function applyTJunction(node, epsilon) {
  const { host, branches } = resolveHostAndBranches(node, epsilon);
  if (!host) return;
  branches.forEach((branch) => {
    const normalProjection = Math.abs(dot(branch.ray, host.normal));
    if (normalProjection <= epsilon) return;
    const shift = host.halfThickness / normalProjection;
    const center = { x: node.point.x + branch.ray.x * shift, z: node.point.z + branch.ray.z * shift };
    const plus = { x: center.x + branch.normal.x * branch.segment.halfThickness, z: center.z + branch.normal.z * branch.segment.halfThickness };
    const minus = { x: center.x - branch.normal.x * branch.segment.halfThickness, z: center.z - branch.normal.z * branch.segment.halfThickness };
    setEndpointCorners(branch, plus, minus);
    if (branch.endpoint === 'start') branch.segment.resolvedStart = center;
    else branch.segment.resolvedEnd = center;
  });
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length <= 2) return sorted;
  const build = (items) => {
    const hull = [];
    for (const point of items) {
      while (hull.length >= 2 && cross(
        { x: hull.at(-1).x - hull.at(-2).x, z: hull.at(-1).z - hull.at(-2).z },
        { x: point.x - hull.at(-1).x, z: point.z - hull.at(-1).z }
      ) <= 0) hull.pop();
      hull.push(point);
    }
    return hull;
  };
  return [...build(sorted).slice(0, -1), ...build([...sorted].reverse()).slice(0, -1)];
}

function createJoinPatch(node) {
  const rays = getNodeRays(node);
  const points = rays.flatMap((ray) => [
    { x: node.point.x + ray.normal.x * ray.segment.halfThickness, z: node.point.z + ray.normal.z * ray.segment.halfThickness },
    { x: node.point.x - ray.normal.x * ray.segment.halfThickness, z: node.point.z - ray.normal.z * ray.segment.halfThickness },
  ]);
  return convexHull(points);
}

function getPolygonsBounds(polygons) {
  const points = polygons.flat();
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

export function buildJoinedWallsGeometry2D(walls, options = {}) {
  const epsilon = Number.isFinite(Number(options.epsilon)) ? Math.max(Number(options.epsilon), Number.EPSILON) : JOIN_EPSILON;
  const wallGeometries = (walls || []).filter((wall) => wall?.visible !== false).map((wall) => {
    const base = buildWallGeometry2D(wall);
    return { ...base, wall, segmentsGeometry: base.segmentsGeometry.map((segment) => cloneSegment(segment, wall.id)), joinedGeometry: { polygons: [], patches: [] } };
  });
  const segments = wallGeometries.flatMap((geometry) => geometry.segmentsGeometry);
  const nodes = collectJoinNodes(segments, epsilon);
  const joins = nodes.map((node, index) => {
    const type = classifyNode(node, epsilon);
    if (type === WALL_JOIN_TYPES.L) applyMiter(node, epsilon);
    if (type === WALL_JOIN_TYPES.T) applyTJunction(node, epsilon);
    const patch = type === WALL_JOIN_TYPES.T || type === WALL_JOIN_TYPES.X ? createJoinPatch(node) : null;
    return {
      joinId: `WJ_${index}_${node.point.x.toFixed(6)}_${node.point.z.toFixed(6)}`,
      type,
      point: { ...node.point },
      segmentIds: [...new Set(node.refs.map((ref) => ref.segment.segmentId))],
      wallIds: [...new Set(node.refs.map((ref) => ref.segment.wallId))],
      patch,
    };
  });

  wallGeometries.forEach((geometry) => {
    geometry.joinedGeometry.polygons = geometry.segmentsGeometry.map((segment) => segment.polygon);
    geometry.joinedGeometry.patches = joins.filter((join) => join.patch && join.wallIds.includes(geometry.wallId)).map((join) => join.patch);
    geometry.bounds = getPolygonsBounds([
      ...geometry.joinedGeometry.polygons,
      ...geometry.joinedGeometry.patches,
    ]);
  });

  return { wallGeometries, joins, epsilon };
}

export function getJoinedWallGeometry(joinedWallsGeometry, wallId) {
  return joinedWallsGeometry?.wallGeometries?.find((geometry) => geometry.wallId === wallId) || null;
}
