import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCritterium8FrameSequence } from '../src/mepal/critterium8/connectivity/frameSequenceResolver.js';
import {
  resolveCritterium8JunctionParts,
  resolveCritterium8SequenceJunctionParts,
} from '../src/mepal/critterium8/junctions/junctionPartResolver.js';
import {
  buildCritterium8JunctionLayout,
  buildCritterium8SequenceJunctionLayouts,
  CRITTERIUM8_PROVISIONAL_JUNCTION_ENVELOPE_M,
} from '../src/mepal/critterium8/junctions/layout/junctionLayoutBuilder.js';
import { validateCritterium8JunctionLayout } from '../src/mepal/critterium8/junctions/layout/junctionLayoutRules.js';

const radians = (degrees) => degrees * Math.PI / 180;

function frameFromStart(frameId, angleDeg, options = {}) {
  const widthCm = Number(options.widthCm ?? 100);
  const halfWidthM = widthCm / 200;
  const rotationY = radians(angleDeg);
  const start = options.start || { x: 0, z: 0 };
  return {
    frameId,
    instanceId: `${frameId}_INSTANCE`,
    position: {
      x: start.x + Math.cos(rotationY) * halfWidthM,
      z: start.z - Math.sin(rotationY) * halfWidthM,
    },
    rotationY,
    widthCm,
    heightCm: Number(options.heightCm ?? 90),
    frameMode: options.frameMode || 'HALF_HEIGHT',
    projectHeightCm: Number(options.projectHeightCm ?? options.heightCm ?? 90),
    metadata: {},
  };
}

function resolveNode(frames, type) {
  const sequence = resolveCritterium8FrameSequence(frames).sequence;
  const junction = sequence.junctions.find((item) => item.type === type);
  assert.ok(junction, `Missing ${type} junction`);
  const resolution = resolveCritterium8JunctionParts({ junction, frames });
  return { sequence, junction, resolution, layout: buildCritterium8JunctionLayout({ junction, resolution, frames }) };
}

function near(first, second, tolerance = 1e-9) {
  return Math.abs(first - second) <= tolerance;
}

test('TERMINAL START y END producen layouts opuestos y anchors completos', () => {
  const frames = [frameFromStart('A', 0)];
  const sequence = resolveCritterium8FrameSequence(frames).sequence;
  const layouts = sequence.junctions.map((junction) => {
    const resolution = resolveCritterium8JunctionParts({ junction, frames });
    return buildCritterium8JunctionLayout({ junction, resolution, frames });
  });
  const start = layouts.find((layout) => layout.metadata.endpointRole === 'START');
  const end = layouts.find((layout) => layout.metadata.endpointRole === 'END');
  assert.ok(start && end);
  assert.equal(near(start.rotationY, 0), true);
  assert.equal(near(end.rotationY, Math.PI), true);
  assert.equal(start.anchors.some((anchor) => anchor.type === 'CENTER'), true);
  assert.equal(start.anchors.some((anchor) => anchor.type === 'TOP'), true);
  assert.equal(start.anchors.some((anchor) => anchor.type === 'BOTTOM'), true);
  assert.equal(start.anchors.some((anchor) => anchor.type === 'FRAME_CONNECTION_A'), true);
  assert.equal(start.placements.length, 1);
  assert.deepEqual(start.placements[0].position, { x: 0, y: 0, z: 0 });
});

test('180 mantiene orientación canónica al invertir frames', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 180)];
  const first = resolveNode(frames, 'DEG_180');
  const second = resolveNode([...frames].reverse(), 'DEG_180');
  assert.equal(first.layout.rotationY, second.layout.rotationY);
  assert.equal(near(first.layout.rotationY, 0), true);
  assert.equal(first.layout.placements.length, 1);
});

test('180 TYPE B reutiliza orientación geométrica y conserva metadata comercial', () => {
  const frames = [frameFromStart('A', 0, { heightCm: 128 }), frameFromStart('B', 180, { heightCm: 128 })];
  const base = resolveNode(frames, 'DEG_180');
  const junction = { ...base.junction, variant: 'TYPE_B' };
  const resolution = resolveCritterium8JunctionParts({ junction, frames });
  const layout = buildCritterium8JunctionLayout({ junction, resolution, frames });
  assert.equal(layout.junctionType, 'DEG_180_TYPE_B');
  assert.equal(layout.rotationY, base.layout.rotationY);
  assert.equal(layout.placements[0].metadata.kitCode, '22191900078');
});

test('90 usa bisectriz estable y conserva incomingDirections', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 90)];
  const { layout } = resolveNode(frames, 'DEG_90');
  assert.equal(near(layout.rotationY, Math.PI / 4), true);
  assert.equal(layout.metadata.incomingDirections.length, 2);
  assert.deepEqual(layout.metadata.incomingDirections.map((item) => item.frameId), ['A', 'B']);
});

test('45, 120 y 135 construyen layout geométrico sin Part comercial', () => {
  for (const [angle, expectedRotation] of [[45, 22.5], [120, 60], [135, 67.5]]) {
    const type = angle === 120 ? 'DEG_120' : 'DEG_45_135';
    const frames = [frameFromStart('A', 0), frameFromStart('B', angle)];
    const { layout } = resolveNode(frames, type);
    assert.equal(near(layout.rotationY, radians(expectedRotation)), true);
    assert.equal(layout.placements.length, 0);
    assert.equal(layout.diagnostics.some((item) => item.code === 'MISSING_JUNCTION_PART'), true);
    assert.equal(layout.valid, false);
  }
});

test('T identifica host y branch sin depender del orden', () => {
  const frames = [frameFromStart('BRANCH', 90), frameFromStart('HOST_B', 180), frameFromStart('HOST_A', 0)];
  const first = resolveNode(frames, 'T').layout;
  const second = resolveNode([...frames].reverse(), 'T').layout;
  assert.deepEqual(first.metadata.hostFrameIds, ['HOST_A', 'HOST_B']);
  assert.deepEqual(first.metadata.branchFrameIds, ['BRANCH']);
  assert.equal(first.rotationY, second.rotationY);
  assert.equal(first.placements.length, 1);
});

test('X usa eje canónico y produce un solo layout central', () => {
  const frames = [frameFromStart('D', 270), frameFromStart('B', 90), frameFromStart('C', 180), frameFromStart('A', 0)];
  const { layout } = resolveNode(frames, 'X');
  assert.equal(near(layout.rotationY, 0), true);
  assert.equal(layout.placements.length, 1);
  assert.equal(layout.metadata.incomingDirections.length, 4);
});

test('floor-to-ceiling propaga altura, U de techo y puntera', () => {
  const options = { heightCm: 204, frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 242 };
  const frames = [frameFromStart('A', 0, options), frameFromStart('B', 90, options)];
  const { layout } = resolveNode(frames, 'DEG_90');
  assert.equal(layout.metadata.floorToCeiling, true);
  assert.equal(layout.metadata.projectHeightCm, 242);
  assert.equal(layout.metadata.requiresCeilingU, true);
  assert.equal(layout.metadata.includesCeilingU, true);
  assert.equal(layout.metadata.includesTip, false);
  assert.equal(layout.anchors.find((anchor) => anchor.type === 'TOP').position.y, 2.42);
});

test('height transition conserva nodo geométrico sin inventar kit', () => {
  const frames = [frameFromStart('A', 0, { heightCm: 90 }), frameFromStart('B', 90, { heightCm: 128 })];
  const { layout } = resolveNode(frames, 'DEG_90');
  assert.deepEqual(layout.metadata.heightsCm, [90, 128]);
  assert.equal(layout.metadata.heightCm, null);
  assert.equal(layout.placements.length, 0);
  assert.equal(layout.diagnostics.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED'), true);
  assert.equal(layout.valid, false);
});

test('replacedByDuct mantiene anchors y elimina placement de kit', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 180), frameFromStart('C', 90)];
  const sequence = resolveCritterium8FrameSequence(frames).sequence;
  const base = sequence.junctions.find((junction) => junction.type === 'T');
  const junction = { ...base, metadata: { ...base.metadata, useDuct: true } };
  const resolution = resolveCritterium8JunctionParts({ junction, frames });
  const layout = buildCritterium8JunctionLayout({ junction, resolution, frames });
  assert.equal(layout.metadata.replacedByDuct, true);
  assert.equal(layout.placements.length, 0);
  assert.equal(layout.valid, true);
  assert.equal(layout.anchors.filter((anchor) => anchor.type.startsWith('FRAME_CONNECTION_')).length, 3);
});

test('bounds, layouts, anchors y placements tienen IDs estables', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 90)];
  const first = resolveNode(frames, 'DEG_90').layout;
  const second = resolveNode(frames, 'DEG_90').layout;
  assert.equal(first.id, second.id);
  assert.deepEqual(first.anchors.map((anchor) => anchor.id), second.anchors.map((anchor) => anchor.id));
  assert.deepEqual(first.placements.map((placement) => placement.id), second.placements.map((placement) => placement.id));
  assert.equal(first.bounds.maxX - first.bounds.minX, CRITTERIUM8_PROVISIONAL_JUNCTION_ENVELOPE_M.width);
  assert.equal(first.metadata.provisionalBounds, true);
  assert.equal(first.diagnostics.some((item) => item.code === 'PROVISIONAL_JUNCTION_BOUNDS'), true);
  assert.equal(validateCritterium8JunctionLayout(first, frames).valid, true);
});

test('sequence layouts genera terminales y nodo 90 sin superposición', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 90)];
  const sequence = resolveCritterium8FrameSequence(frames).sequence;
  const resolved = resolveCritterium8SequenceJunctionParts({ sequence, frames });
  const result = buildCritterium8SequenceJunctionLayouts({ sequence, frames, resolutions: resolved.results });
  assert.equal(result.layouts.length, 3);
  assert.equal(result.layouts.filter((layout) => layout.junctionType === 'TERMINAL').length, 2);
  assert.equal(result.layouts.filter((layout) => layout.junctionType === 'DEG_90').length, 1);
});

test('builder no muta junction, resolution ni frames y es serializable', () => {
  const frames = [frameFromStart('A', 0), frameFromStart('B', 90)];
  const { junction, resolution } = resolveNode(frames, 'DEG_90');
  const beforeFrames = structuredClone(frames);
  const beforeJunction = structuredClone(junction);
  const beforeResolution = structuredClone(resolution);
  const layout = buildCritterium8JunctionLayout({ junction, resolution, frames });
  assert.deepEqual(frames, beforeFrames);
  assert.deepEqual(junction, beforeJunction);
  assert.deepEqual(resolution, beforeResolution);
  assert.doesNotThrow(() => JSON.stringify(layout));
});
