import { createCritterium8FrameSequenceDefinition } from '../definitions/frameSequenceDefinition.js';
import { createCritterium8JunctionDefinition } from '../definitions/junctionDefinition.js';

export const DEFAULT_CRITTERIUM8_CONNECTION_TOLERANCE_M = 0.01;
export const DEFAULT_CRITTERIUM8_ANGLE_TOLERANCE_DEG = 2;

function normalizeAngleDegrees(value) {
  const normalized = Number(value) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angularDistance(first, second) {
  const difference = Math.abs(normalizeAngleDegrees(first) - normalizeAngleDegrees(second));
  return Math.min(difference, 360 - difference);
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function normalizeFrame(frame = {}, index = 0) {
  const frameId = String(frame.frameId || frame.id || `FRAME_${index}`);
  const rotationY = Number(frame.rotationY ?? frame.rotation?.y ?? 0);
  const position = {
    x: Number(frame.position?.x ?? frame.x ?? 0),
    z: Number(frame.position?.z ?? frame.z ?? 0),
  };
  return {
    frameId,
    instanceId: String(frame.instanceId || frameId),
    position,
    rotationY,
    widthCm: Number(frame.widthCm ?? 0),
    heightCm: Number(frame.heightCm ?? 0),
    frameMode: String(frame.frameMode || 'HALF_HEIGHT').toUpperCase(),
    projectHeightCm: Number(frame.projectHeightCm ?? frame.heightCm ?? 0),
    metadata: frame.metadata && typeof frame.metadata === 'object' ? { ...frame.metadata } : {},
  };
}

export function getCritterium8FrameConnectionAnchors(frame = {}) {
  const normalized = normalizeFrame(frame);
  const halfWidthM = normalized.widthCm / 200;
  const cos = Math.cos(normalized.rotationY);
  const sin = Math.sin(normalized.rotationY);
  const direction = { x: cos, z: -sin };
  return {
    START: {
      x: normalized.position.x - direction.x * halfWidthM,
      z: normalized.position.z - direction.z * halfWidthM,
    },
    END: {
      x: normalized.position.x + direction.x * halfWidthM,
      z: normalized.position.z + direction.z * halfWidthM,
    },
  };
}

function buildEndpoints(frames) {
  return frames.flatMap((frame) => {
    const anchors = getCritterium8FrameConnectionAnchors(frame);
    return ['START', 'END'].map((endpoint) => ({
      frameId: frame.frameId,
      endpoint,
      point: anchors[endpoint],
      frame,
    }));
  });
}

function clusterEndpoints(endpoints, toleranceM) {
  const parent = endpoints.map((_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const join = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
  };
  for (let first = 0; first < endpoints.length; first += 1) {
    for (let second = first + 1; second < endpoints.length; second += 1) {
      if (endpoints[first].frameId === endpoints[second].frameId) continue;
      if (distance(endpoints[first].point, endpoints[second].point) <= toleranceM) join(first, second);
    }
  }
  const clusters = new Map();
  endpoints.forEach((endpoint, index) => {
    const root = find(index);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(endpoint);
  });
  return [...clusters.values()];
}

function getOutgoingAngle(endpoint) {
  const base = endpoint.frame.rotationY * (180 / Math.PI);
  return normalizeAngleDegrees(base + (endpoint.endpoint === 'END' ? 180 : 0));
}

function getPairAngles(cluster) {
  const angles = [];
  for (let first = 0; first < cluster.length; first += 1) {
    for (let second = first + 1; second < cluster.length; second += 1) {
      angles.push(angularDistance(getOutgoingAngle(cluster[first]), getOutgoingAngle(cluster[second])));
    }
  }
  return angles.sort((first, second) => first - second);
}

function near(value, target, tolerance) {
  return Math.abs(value - target) <= tolerance;
}

function classifyJunction(cluster, angles, angleToleranceDeg) {
  if (cluster.length === 1) return 'TERMINAL';
  if (cluster.length === 3) {
    return angles.some((angle) => near(angle, 180, angleToleranceDeg)) ? 'T' : null;
  }
  if (cluster.length === 4) {
    return angles.filter((angle) => near(angle, 180, angleToleranceDeg)).length >= 2 ? 'X' : null;
  }
  if (cluster.length !== 2) return null;
  const angle = angles[0];
  if (near(angle, 180, angleToleranceDeg)) return 'DEG_180';
  if (near(angle, 90, angleToleranceDeg)) return 'DEG_90';
  if (near(angle, 45, angleToleranceDeg) || near(angle, 135, angleToleranceDeg)) return 'DEG_45_135';
  if (near(angle, 120, angleToleranceDeg)) return 'DEG_120';
  return null;
}

function buildJunction(cluster, sequenceId, angleToleranceDeg) {
  const point = cluster.reduce(
    (result, endpoint) => ({ x: result.x + endpoint.point.x / cluster.length, z: result.z + endpoint.point.z / cluster.length }),
    { x: 0, z: 0 }
  );
  const endpointRefs = cluster.map(({ frameId, endpoint }) => ({ frameId, endpoint }));
  const angles = getPairAngles(cluster);
  const type = classifyJunction(cluster, angles, angleToleranceDeg);
  const heightsCm = [...new Set(cluster.map(({ frame }) => frame.heightCm))].sort((first, second) => first - second);
  const projectHeightsCm = [...new Set(cluster
    .filter(({ frame }) => frame.frameMode === 'FLOOR_TO_CEILING')
    .map(({ frame }) => frame.projectHeightCm))].sort((first, second) => first - second);
  return createCritterium8JunctionDefinition({
    sequenceId,
    type,
    point,
    endpointRefs,
    angles,
    metadata: {
      heightsCm,
      projectHeightsCm,
      heightTransition: heightsCm.length > 1,
      explicitVariant: null,
    },
  });
}

function buildGraph(frames, junctions) {
  const nodes = frames.map((frame) => ({ id: frame.frameId, frameId: frame.frameId }));
  const edges = junctions.flatMap((junction) => {
    if (junction.frameIds.length < 2) return [];
    const first = junction.frameIds[0];
    return junction.frameIds.slice(1).map((frameId, index) => ({
      id: `${junction.id}_EDGE_${index}`,
      source: first,
      target: frameId,
      junctionId: junction.id,
    }));
  });
  return { nodes, edges };
}

export function findFrameConnections(frames = [], options = {}) {
  const normalizedFrames = frames.map(normalizeFrame);
  const toleranceM = Number(options.toleranceM ?? DEFAULT_CRITTERIUM8_CONNECTION_TOLERANCE_M);
  return clusterEndpoints(buildEndpoints(normalizedFrames), toleranceM)
    .filter((cluster) => cluster.length > 1)
    .map((cluster) => ({
      point: cluster.reduce(
        (result, endpoint) => ({ x: result.x + endpoint.point.x / cluster.length, z: result.z + endpoint.point.z / cluster.length }),
        { x: 0, z: 0 }
      ),
      endpointRefs: cluster.map(({ frameId, endpoint }) => ({ frameId, endpoint })),
    }));
}

export function resolveCritterium8FrameSequence(frames = [], options = {}) {
  const normalizedFrames = frames.map(normalizeFrame);
  const framesWithAnchors = normalizedFrames.map((frame) => {
    const anchors = getCritterium8FrameConnectionAnchors(frame);
    return { ...frame, startAnchor: anchors.START, endAnchor: anchors.END };
  });
  const frameIds = normalizedFrames.map((frame) => frame.frameId).sort();
  const sequenceId = String(options.sequenceId || `C8_SEQUENCE_${frameIds.join('_') || 'EMPTY'}`);
  const toleranceM = Number(options.toleranceM ?? DEFAULT_CRITTERIUM8_CONNECTION_TOLERANCE_M);
  const angleToleranceDeg = Number(options.angleToleranceDeg ?? DEFAULT_CRITTERIUM8_ANGLE_TOLERANCE_DEG);
  const clusters = clusterEndpoints(buildEndpoints(normalizedFrames), toleranceM);
  const junctions = clusters.map((cluster) => buildJunction(cluster, sequenceId, angleToleranceDeg));
  const diagnostics = [];
  junctions.forEach((junction) => {
    if (!junction.type) diagnostics.push({ code: 'UNSUPPORTED_JUNCTION_GEOMETRY', junctionId: junction.id });
    if (junction.metadata.heightTransition) {
      diagnostics.push({ code: 'HEIGHT_TRANSITION_REQUIRED', junctionId: junction.id, heightsCm: [...junction.metadata.heightsCm] });
    }
  });
  const graph = buildGraph(normalizedFrames, junctions);
  const sequence = createCritterium8FrameSequenceDefinition({
    id: sequenceId,
    frames: framesWithAnchors,
    junctions,
    diagnostics,
    graph,
    metadata: {
      connectionToleranceM: toleranceM,
      angleToleranceDeg,
      dirtyConnections: false,
      dirtyJunctions: false,
    },
  });
  return { sequence, junctions: sequence.junctions, diagnostics: sequence.diagnostics, graph: sequence.graph };
}

export function buildCritterium8Sequences(frames = [], options = {}) {
  const normalizedFrames = frames.map(normalizeFrame);
  const connections = findFrameConnections(normalizedFrames, options);
  const adjacency = new Map(normalizedFrames.map((frame) => [frame.frameId, new Set()]));
  connections.forEach(({ endpointRefs }) => {
    const ids = [...new Set(endpointRefs.map((reference) => reference.frameId))];
    ids.forEach((id) => ids.forEach((other) => { if (id !== other) adjacency.get(id)?.add(other); }));
  });
  const visited = new Set();
  const sequences = [];
  [...normalizedFrames].sort((first, second) => first.frameId.localeCompare(second.frameId)).forEach((frame) => {
    if (visited.has(frame.frameId)) return;
    const pending = [frame.frameId];
    const component = [];
    visited.add(frame.frameId);
    while (pending.length) {
      const frameId = pending.shift();
      component.push(normalizedFrames.find((item) => item.frameId === frameId));
      [...(adjacency.get(frameId) || [])].sort().forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        pending.push(neighbor);
      });
    }
    sequences.push(resolveCritterium8FrameSequence(component, options).sequence);
  });
  return sequences;
}
