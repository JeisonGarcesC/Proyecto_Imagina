import { buildJoinedWallsGeometry2D } from './wallJoins2D.js';
import { buildWallSegmentPolygons2D } from '../openings/doorGeometry2D.js';
import { validateDoorPlacement } from '../openings/doorDefinition.js';

// Metros. El epsilon topológico existente es 1e-5; el numérico debe ser menor.
export const WALL_FOOTPRINT_EPSILON = 1e-8;

const cross = (a, b) => a.x * b.z - a.z * b.x;
const subtract = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.z > point.z) !== (b.z > point.z) &&
        point.x < a.x + (point.z - a.z) * (b.x - a.x) / (b.z - a.z)) inside = !inside;
  }
  return inside;
}

function edgeParameter(point, a, b) {
  const delta = subtract(b, a);
  const lengthSquared = delta.x ** 2 + delta.z ** 2;
  if (lengthSquared <= WALL_FOOTPRINT_EPSILON ** 2) return null;
  const t = ((point.x - a.x) * delta.x + (point.z - a.z) * delta.z) / lengthSquared;
  const projected = lerp(a, b, t);
  return t >= -WALL_FOOTPRINT_EPSILON && t <= 1 + WALL_FOOTPRINT_EPSILON &&
    distance(point, projected) <= WALL_FOOTPRINT_EPSILON ? Math.max(0, Math.min(1, t)) : null;
}

function splitEdges(polygons) {
  const edges = polygons.flatMap((polygon) => polygon.map((a, index) => ({
    a, b: polygon[(index + 1) % polygon.length], cuts: [0, 1],
  }))).filter((edge) => distance(edge.a, edge.b) > WALL_FOOTPRINT_EPSILON);
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const first = edges[i];
      const second = edges[j];
      const r = subtract(first.b, first.a);
      const s = subtract(second.b, second.a);
      const denominator = cross(r, s);
      if (Math.abs(denominator) > WALL_FOOTPRINT_EPSILON) {
        const offset = subtract(second.a, first.a);
        const t = cross(offset, s) / denominator;
        const u = cross(offset, r) / denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          first.cuts.push(t);
          second.cuts.push(u);
        }
      } else {
        for (const point of [second.a, second.b]) {
          const t = edgeParameter(point, first.a, first.b);
          if (t !== null) first.cuts.push(t);
        }
        for (const point of [first.a, first.b]) {
          const u = edgeParameter(point, second.a, second.b);
          if (u !== null) second.cuts.push(u);
        }
      }
    }
  }
  return edges.flatMap((edge) => {
    const cuts = [...new Set(edge.cuts)].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((t, index) => ({ a: lerp(edge.a, edge.b, t), b: lerp(edge.a, edge.b, cuts[index + 1]) }))
      .filter((part) => distance(part.a, part.b) > WALL_FOOTPRINT_EPSILON);
  });
}

function tracePolygonBoundary(polygons, inside) {
  const boundary = [];
  for (const edge of splitEdges(polygons)) {
    const midpoint = lerp(edge.a, edge.b, 0.5);
    const dx = edge.b.x - edge.a.x;
    const dz = edge.b.z - edge.a.z;
    const length = Math.hypot(dx, dz);
    const offset = Math.min(length / 4, WALL_FOOTPRINT_EPSILON * 10);
    const normal = { x: -dz / length * offset, z: dx / length * offset };
    const left = inside({ x: midpoint.x + normal.x, z: midpoint.z + normal.z });
    const right = inside({ x: midpoint.x - normal.x, z: midpoint.z - normal.z });
    if (left !== right) boundary.push(left ? edge : { a: edge.b, b: edge.a });
  }
  const key = (point) => `${Math.round(point.x / WALL_FOOTPRINT_EPSILON)}:${Math.round(point.z / WALL_FOOTPRINT_EPSILON)}`;
  const unique = new Map();
  boundary.forEach((edge) => unique.set(`${key(edge.a)}>${key(edge.b)}`, edge));
  const outgoing = new Map();
  [...unique.values()].forEach((edge) => {
    const start = key(edge.a);
    if (!outgoing.has(start)) outgoing.set(start, []);
    outgoing.get(start).push(edge);
  });
  const visited = new Set();
  const rings = [];
  for (const first of unique.values()) {
    if (visited.has(first)) continue;
    const ring = [];
    let edge = first;
    while (edge && !visited.has(edge)) {
      visited.add(edge);
      ring.push(edge.a);
      if (key(edge.b) === key(first.a)) break;
      edge = (outgoing.get(key(edge.b)) || []).find((candidate) => !visited.has(candidate));
    }
    if (ring.length >= 3 && edge && key(edge.b) === key(first.a)) rings.push(ring);
  }
  return rings;
}

export function unionWallPolygons(polygons) {
  const valid = polygons.filter((polygon) => polygon?.length >= 3);
  if (!valid.length) return [];
  return tracePolygonBoundary(valid,
    (point) => valid.some((polygon) => pointInPolygon(point, polygon)));
}

// Se reutiliza el mismo trazado topológico para conservar intacta la unión muro–muro.
export function subtractWallPolygons(wallPolygons, columnPolygons) {
  const subjects = wallPolygons.filter((polygon) => polygon?.length >= 3);
  const cutters = columnPolygons.filter((polygon) => polygon?.length >= 3);
  if (!subjects.length) return [];
  if (!cutters.length) return unionWallPolygons(subjects);
  return tracePolygonBoundary([...subjects, ...cutters], (point) =>
    subjects.some((polygon) => pointInPolygon(point, polygon)) &&
    !cutters.some((polygon) => pointInPolygon(point, polygon)));
}

export function buildResolvedWallFootprint(walls, options = {}) {
  const openings = Array.isArray(options.openings) ? options.openings : [];
  const elevation = options.elevation;
  const activeWall = (wall) => elevation == null ||
    (elevation >= (wall.baseElevation || 0) && elevation < (wall.baseElevation || 0) + wall.height);
  const activeWalls = (walls || []).filter((wall) => wall?.visible !== false && activeWall(wall));
  const joined = buildJoinedWallsGeometry2D(activeWalls);
  const polygons = [];
  const sources = [];
  for (const wallGeometry of joined.wallGeometries) {
    for (const segment of wallGeometry.segmentsGeometry) {
      const activeOpenings = openings.filter((opening) =>
        opening.wallId === wallGeometry.wallId && opening.segmentId === segment.segmentId &&
        validateDoorPlacement(opening, walls, openings).valid &&
        (elevation == null ||
          (elevation >= (wallGeometry.wall.baseElevation || 0) + opening.sillHeight &&
           elevation < (wallGeometry.wall.baseElevation || 0) + opening.sillHeight + opening.height))
      );
      const pieces = activeOpenings.length ? buildWallSegmentPolygons2D(segment, activeOpenings) : [segment.polygon];
      polygons.push(...pieces);
      pieces.forEach((polygon) => sources.push({ polygon, wallIds: [wallGeometry.wallId], segmentId: segment.segmentId }));
    }
  }
  // Los parches de nodos forman parte de la huella, no son un efecto del Canvas.
  joined.joins.forEach((join) => {
    if (join.patch?.length && join.wallIds.some((id) => {
      return activeWalls.some((wall) => wall.id === id);
    })) {
      polygons.push(join.patch);
      sources.push({ polygon: join.patch, wallIds: join.wallIds });
    }
  });
  return { rings: unionWallPolygons(polygons), polygons, sources, joins: joined.joins, wallGeometries: joined.wallGeometries };
}

export function wallRingArea(ring) {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point.x * next.z - next.x * point.z;
  }, 0) / 2;
}
