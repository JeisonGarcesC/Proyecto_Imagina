import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCritterium8Sequences,
  getCritterium8FrameConnectionAnchors,
  resolveCritterium8FrameSequence,
} from '../src/mepal/critterium8/connectivity/frameSequenceResolver.js';

const radians = (degrees) => degrees * (Math.PI / 180);

function frameFromStart(frameId, angleDeg, options = {}) {
  const widthCm = Number(options.widthCm ?? 100);
  const halfWidthM = widthCm / 200;
  const rotationY = radians(angleDeg);
  return {
    frameId,
    instanceId: `${frameId}_INSTANCE`,
    position: {
      x: Number(options.start?.x ?? 0) + Math.cos(rotationY) * halfWidthM,
      z: Number(options.start?.z ?? 0) - Math.sin(rotationY) * halfWidthM,
    },
    rotationY,
    widthCm,
    heightCm: Number(options.heightCm ?? 90),
    frameMode: options.frameMode || 'HALF_HEIGHT',
    projectHeightCm: Number(options.projectHeightCm ?? options.heightCm ?? 90),
    metadata: { source: 'TEST' },
  };
}

function frameBetween(frameId, start, end, options = {}) {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const rotationY = Math.atan2(-deltaZ, deltaX);
  return {
    frameId,
    instanceId: `${frameId}_INSTANCE`,
    position: { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 },
    rotationY,
    widthCm: Math.hypot(deltaX, deltaZ) * 100,
    heightCm: Number(options.heightCm ?? 90),
    frameMode: options.frameMode || 'HALF_HEIGHT',
    projectHeightCm: Number(options.projectHeightCm ?? options.heightCm ?? 90),
    metadata: {},
  };
}

function junctionTypes(frames, options) {
  return resolveCritterium8FrameSequence(frames, options).junctions.map((junction) => junction.type).sort();
}

test('frame aislado deriva START/END y dos terminales', () => {
  const frame = frameFromStart('A', 0);
  const anchors = getCritterium8FrameConnectionAnchors(frame);
  assert.deepEqual(anchors.START, { x: 0, z: 0 });
  assert.deepEqual(anchors.END, { x: 1, z: 0 });
  const result = resolveCritterium8FrameSequence([frame]);
  assert.deepEqual(result.junctions.map((junction) => junction.type), ['TERMINAL', 'TERMINAL']);
  assert.deepEqual(result.sequence.frames[0].startAnchor, anchors.START);
  assert.deepEqual(result.sequence.frames[0].endAnchor, anchors.END);
  assert.equal(result.graph.nodes.length, 1);
  assert.equal(result.graph.edges.length, 0);
});

test('dos frames colineales producen terminal, 180 y terminal', () => {
  const frames = [frameBetween('A', { x: 0, z: 0 }, { x: 1, z: 0 }), frameBetween('B', { x: 1, z: 0 }, { x: 2, z: 0 })];
  assert.deepEqual(junctionTypes(frames), ['DEG_180', 'TERMINAL', 'TERMINAL']);
});

test('clasifica encuentros 90, 45, 120 y 135', () => {
  const expected = [[90, 'DEG_90'], [45, 'DEG_45_135'], [120, 'DEG_120'], [135, 'DEG_45_135']];
  expected.forEach(([angle, type]) => {
    const result = resolveCritterium8FrameSequence([frameFromStart('A', 0), frameFromStart('B', angle)]);
    assert.equal(result.junctions.find((junction) => junction.frameIds.length === 2)?.type, type);
  });
});

test('aplica tolerancia de posición y tolerancia angular configurables', () => {
  const nearFrames = [frameFromStart('A', 0), frameFromStart('B', 91, { start: { x: 0.005, z: 0 } })];
  assert.equal(resolveCritterium8FrameSequence(nearFrames).junctions.some((junction) => junction.type === 'DEG_90'), true);
  assert.equal(buildCritterium8Sequences(nearFrames, { toleranceM: 0.001 }).length, 2);
  assert.equal(resolveCritterium8FrameSequence(nearFrames, { angleToleranceDeg: 0.5 }).diagnostics.some((item) => item.code === 'UNSUPPORTED_JUNCTION_GEOMETRY'), true);
});

test('clasifica T y X una sola vez en el punto común', () => {
  const tee = [frameFromStart('A', 0), frameFromStart('B', 180), frameFromStart('C', 90)];
  const cross = [...tee, frameFromStart('D', 270)];
  assert.equal(resolveCritterium8FrameSequence(tee).junctions.filter((junction) => junction.type === 'T').length, 1);
  assert.equal(resolveCritterium8FrameSequence(cross).junctions.filter((junction) => junction.type === 'X').length, 1);
});

test('tres frames en línea producen dos junctions 180', () => {
  const frames = [
    frameBetween('A', { x: 0, z: 0 }, { x: 1, z: 0 }),
    frameBetween('B', { x: 1, z: 0 }, { x: 2, z: 0 }),
    frameBetween('C', { x: 2, z: 0 }, { x: 3, z: 0 }),
  ];
  assert.equal(resolveCritterium8FrameSequence(frames).junctions.filter((junction) => junction.type === 'DEG_180').length, 2);
});

test('registra transición de altura y datos floor-to-ceiling', () => {
  const frames = [
    frameFromStart('A', 0, { heightCm: 90 }),
    frameFromStart('B', 90, { heightCm: 204, frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 242 }),
  ];
  const result = resolveCritterium8FrameSequence(frames);
  const junction = result.junctions.find((item) => item.type === 'DEG_90');
  assert.deepEqual(junction.metadata.heightsCm, [90, 204]);
  assert.deepEqual(junction.metadata.projectHeightsCm, [242]);
  assert.equal(junction.metadata.heightTransition, true);
  assert.equal(result.diagnostics.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED'), true);
});

test('agrupa componentes independientes en secuencias separadas', () => {
  const frames = [
    frameBetween('A', { x: 0, z: 0 }, { x: 1, z: 0 }),
    frameBetween('B', { x: 1, z: 0 }, { x: 2, z: 0 }),
    frameBetween('C', { x: 10, z: 0 }, { x: 11, z: 0 }),
  ];
  const sequences = buildCritterium8Sequences(frames);
  assert.equal(sequences.length, 2);
  assert.deepEqual(sequences.map((sequence) => sequence.frameIds.length).sort(), [1, 2]);
});

test('IDs son deterministas, inputs no mutan y mover recalcula junctions', () => {
  const frames = [frameFromStart('B', 90), frameFromStart('A', 0)];
  const before = structuredClone(frames);
  const first = resolveCritterium8FrameSequence(frames);
  const second = resolveCritterium8FrameSequence([...frames].reverse());
  assert.deepEqual(frames, before);
  assert.equal(first.sequence.id, second.sequence.id);
  assert.deepEqual(first.junctions.map((junction) => junction.id).sort(), second.junctions.map((junction) => junction.id).sort());

  const moved = structuredClone(frames);
  moved[1].position.x += 1;
  const recalculated = resolveCritterium8FrameSequence(moved);
  assert.equal(recalculated.junctions.some((junction) => junction.type === 'DEG_90'), false);
});

test('resultado es puro y JSON serializable con graph e invalidación preparada', () => {
  const result = resolveCritterium8FrameSequence([frameFromStart('A', 0), frameFromStart('B', 90)]);
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.equal(result.sequence.metadata.dirtyConnections, false);
  assert.equal(result.sequence.metadata.dirtyJunctions, false);
  assert.equal(result.graph.edges.length, 1);
});
