import { resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from './CritteriumConnectionResolver.js';
import { classifyCritteriumSystemProximity } from './CritteriumSpatialUtils.js';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const pairKey = (a, b) => [a, b].sort().join('|');
const round = (value) => Math.round(value * 1e6) / 1e6;

// Spatial nodes are projections of existing physical terminals. They are not
// scene objects, selectable parts, or commercial products.
export function analyzeCritteriumSpatialTopology(system) {
  if (system?.userData?.kind !== 'CRITERIUM_SYSTEM') throw new Error('CRITERIUM_SYSTEM_REQUIRED');
  const sequences = system.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY');
  const points = sequences.flatMap(resolveCritteriumConnectionPoints);
  const byPoint = new Map(points.map((point) => [`${point.sequenceId}|${point.connectionId}`, point]));
  const connections = system.userData.connections || [];
  const nodes = points.map((point) => ({ nodeId: `${point.sequenceId}|${point.connectionId}`,
    systemId: system.userData.systemId, sequenceId: point.sequenceId, position: point.position.map(round),
    orientation: round(point.orientation), connectionPoint: point.connectionId,
    connections: connections.filter((item) =>
      (item.sourceSequenceId === point.sequenceId && item.sourcePointId === point.connectionId) ||
      (item.targetSequenceId === point.sequenceId && item.targetPointId === point.connectionId))
      .map((item) => item.connectionId) }));
  const diagnostics = [];
  const seen = new Set();
  const spatialConnections = connections.map((item) => {
    const source = byPoint.get(`${item.sourceSequenceId}|${item.sourcePointId}`);
    const target = byPoint.get(`${item.targetSequenceId}|${item.targetPointId}`);
    const key = pairKey(`${item.sourceSequenceId}|${item.sourcePointId}`, `${item.targetSequenceId}|${item.targetPointId}`);
    if (seen.has(key)) diagnostics.push({ code: 'CRITERIUM_SYSTEM_DUPLICATE_CONNECTION', connectionId: item.connectionId });
    seen.add(key);
    if (!source || !target) diagnostics.push({ code: 'CRITERIUM_SPATIAL_POINT_MISSING', connectionId: item.connectionId });
    const validation = validateCritteriumSpatialConnection(system, item);
    if (!validation.valid) diagnostics.push({ code: validation.reason, connectionId: item.connectionId });
    return { connectionId: item.connectionId, connectionType: item.type === 'DEG_90' ? 'CORNER_90' : item.type,
      valid: validation.valid,
      source: item.sourceSequenceId, target: item.targetSequenceId,
      anchorPoint: source && target ? source.position.map((value, index) => round((value + target.position[index]) / 2)) : null,
      orientation: source && target ? round(Math.atan2(target.direction[2], target.direction[0])) : null };
  });
  for (const node of nodes) if (node.connections.length > 1)
    diagnostics.push({ code: 'UNSUPPORTED_SPATIAL_TOPOLOGY', nodeId: node.nodeId, topology: 'BRANCH_OR_CROSS',
      missingPoint: 'LATERAL_OR_INTERMEDIATE_ANCHOR', requiredPart: 'NOT_DOCUMENTED', cause: 'GEOMETRIC_AND_COMMERCIAL' });

  const adjacency = new Map(sequences.map((sequence) => [sequence.userData.sequenceId, new Set()]));
  for (const item of connections.filter((connection) => validateCritteriumSpatialConnection(system, connection).valid)) {
    if (!adjacency.has(item.sourceSequenceId) || !adjacency.has(item.targetSequenceId)) continue;
    adjacency.get(item.sourceSequenceId).add(item.targetSequenceId);
    adjacency.get(item.targetSequenceId).add(item.sourceSequenceId);
  }
  for (const [sequenceId, neighbours] of adjacency) if (neighbours.size > 2)
    diagnostics.push({ code: 'UNSUPPORTED_SPATIAL_TOPOLOGY', sequenceId, topology: 'T_JUNCTION_OR_CROSS',
      missingPoint: 'LATERAL_OR_INTERMEDIATE_ANCHOR', requiredPart: 'NOT_DOCUMENTED', cause: 'GEOMETRIC_AND_COMMERCIAL' });
  diagnostics.push(...classifyCritteriumSystemProximity(system).map((item) => ({
    ...item, cause: item.code === 'COLLISION_REAL' ? 'FRAME_FOOTPRINT_OVERLAP' : 'FRAME_CLEARANCE_BELOW_TOLERANCE',
    operation: 'SPATIAL_LAYOUT',
  })));

  const visited = new Set();
  const closedLoops = [];
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const stack = [start];
    const component = [];
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id); component.push(id);
      for (const neighbour of adjacency.get(id)) if (!visited.has(neighbour)) stack.push(neighbour);
    }
    if (component.length < 3 || !component.every((id) => adjacency.get(id).size === 2)) continue;
    const ordered = [component[0]];
    let previous = null; let current = component[0];
    while (ordered.length < component.length) {
      const next = [...adjacency.get(current)].find((id) => id !== previous);
      if (!next || ordered.includes(next)) break;
      ordered.push(next); previous = current; current = next;
    }
    if (ordered.length !== component.length) continue;
    const centers = ordered.map((id) => {
      const terminal = points.filter((point) => point.sequenceId === id);
      return terminal.length === 2
        ? [(terminal[0].position[0] + terminal[1].position[0]) / 2, (terminal[0].position[2] + terminal[1].position[2]) / 2]
        : null;
    });
    const areaM2 = centers.every(Boolean) ? Math.abs(centers.reduce((sum, point, index) => {
      const next = centers[(index + 1) % centers.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2 : null;
    closedLoops.push({ sequenceIds: ordered, areaApproxM2: areaM2 == null ? null : round(areaM2) });
  }
  const lengths = sequences.map((sequence) => {
    const terminals = points.filter((point) => point.sequenceId === sequence.userData.sequenceId);
    return { sequenceId: sequence.userData.sequenceId,
      lengthM: terminals.length === 2 ? round(distance(terminals[0].position, terminals[1].position)) : null };
  });
  return { systemId: system.userData.systemId, spatialNodes: nodes, spatialConnections,
    closedLoop: closedLoops.length > 0, closedLoops, lengths,
    totalLengthM: round(lengths.reduce((sum, item) => sum + (item.lengthM || 0), 0)), diagnostics };
}
