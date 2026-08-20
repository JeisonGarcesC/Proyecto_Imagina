import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCritterium8FrameSequence } from '../src/mepal/critterium8/connectivity/frameSequenceResolver.js';
import {
  resolveCritterium8JunctionParts,
  resolveCritterium8SequenceJunctionParts,
} from '../src/mepal/critterium8/junctions/junctionPartResolver.js';
import { validateCritterium8JunctionParts } from '../src/mepal/critterium8/junctions/junctionRules.js';

function frame(frameId, heightCm = 90, options = {}) {
  return {
    frameId,
    widthCm: 100,
    heightCm,
    frameMode: options.frameMode || 'HALF_HEIGHT',
    projectHeightCm: options.projectHeightCm ?? heightCm,
  };
}

function junction(type, frameIds = ['A'], options = {}) {
  return {
    id: options.id || `J_${type}_${frameIds.join('_')}`,
    type,
    frameIds,
    endpointRefs: frameIds.map((frameId, index) => ({ frameId, endpoint: index ? 'START' : 'END' })),
    variant: options.variant ?? null,
    metadata: { ...(options.metadata || {}) },
  };
}

function resolve(type, heightCm, options = {}) {
  const frameIds = options.frameIds || (type === 'TERMINAL' ? ['A'] : ['A', 'B']);
  const frames = frameIds.map((frameId) => frame(frameId, heightCm, options.frameOptions));
  return resolveCritterium8JunctionParts({
    junction: junction(type, frameIds, options.junctionOptions),
    frames,
  });
}

test('resuelve TERMINAL documental para alturas 90 y 204', () => {
  const terminal90 = resolve('TERMINAL', 90);
  const terminal204 = resolve('TERMINAL', 204);
  assert.equal(terminal90.kitCode, '22191900126');
  assert.equal(terminal204.kitCode, '22191900129');
  assert.equal(terminal90.parts[0].metadata.includesTip, true);
  assert.equal(terminal90.parts[0].metadata.tipType, 'TERMINAL');
});

test('resuelve 90 media altura y piso-techo con U incluida documentada', () => {
  assert.equal(resolve('DEG_90', 128).kitCode, '22191900092');
  const floor = resolve('DEG_90', 242, {
    frameOptions: { frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 242 },
  });
  assert.equal(floor.kitCode, '22191900095');
  assert.equal(floor.parts[0].metadata.floorToCeiling, true);
  assert.equal(floor.parts[0].metadata.kitRequiresCeilingU, true);
  assert.equal(floor.parts[0].metadata.ceilingUIncluded, true);
  assert.equal(floor.parts[0].metadata.ceilingUCode, '22191200755');
  assert.equal(floor.parts[0].metadata.includesTip, false);
});

test('resuelve 180 normal y piso-techo sin confundir Type B', () => {
  assert.equal(resolve('DEG_180', 166).kitCode, '22000014322');
  const floor = resolve('DEG_180', 280, {
    frameOptions: { frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 280 },
  });
  assert.equal(floor.kitCode, '22000027744');
  assert.equal(floor.parts[0].metadata.ceilingUIncluded, false);
  assert.equal(floor.parts[0].metadata.kitRequiresCeilingU, true);
});

test('Type B requiere discriminador explícito', () => {
  const explicit = resolve('DEG_180', 128, { junctionOptions: { variant: 'TYPE_B' } });
  assert.equal(explicit.type, 'DEG_180_TYPE_B');
  assert.equal(explicit.kitCode, '22191900078');
  assert.equal(explicit.parts[0].metadata.variant, 'TYPE_B');

  const missing = resolve('DEG_180_TYPE_B', 128);
  assert.equal(missing.parts.length, 0);
  assert.equal(missing.diagnostics.some((item) => item.code === 'UNSUPPORTED_JUNCTION_TYPE'), true);
});

test('resuelve kits T y X documentales', () => {
  const tee = resolve('T', 110, { frameIds: ['A', 'B', 'C'] });
  const cross = resolve('X', 204, { frameIds: ['A', 'B', 'C', 'D'] });
  assert.equal(tee.kitCode, '22191703009');
  assert.equal(cross.kitCode, '22191900115');
  assert.equal(tee.parts[0].metadata.documentedComponents.includes('PUNTERA_T'), true);
  assert.equal(cross.parts[0].metadata.documentedComponents.includes('ESCUADRA_X'), true);
});

test('45/135 y 120 no inventan código ausente del mapa de producto', () => {
  for (const type of ['DEG_45_135', 'DEG_120']) {
    const result = resolve(type, 90);
    assert.equal(result.parts.length, 0);
    assert.equal(result.diagnostics.some((item) => item.code === 'MISSING_DOCUMENTED_JUNCTION_CODE'), true);
  }
});

test('diferencias de altura exigen transición y no resuelven kit estándar', () => {
  const result = resolveCritterium8JunctionParts({
    junction: junction('DEG_90', ['A', 'B']),
    frames: [frame('A', 90), frame('B', 128)],
  });
  assert.equal(result.parts.length, 0);
  assert.equal(result.diagnostics.some((item) => item.code === 'HEIGHT_TRANSITION_REQUIRED'), true);
});

test('altura no documentada y referencia faltante generan diagnósticos', () => {
  const unsupported = resolve('X', 110, { frameIds: ['A', 'B', 'C', 'D'] });
  assert.equal(unsupported.diagnostics.some((item) => item.code === 'UNSUPPORTED_JUNCTION_HEIGHT'), true);
  const missing = resolveCritterium8JunctionParts({
    junction: junction('DEG_90', ['A', 'MISSING']),
    frames: [frame('A')],
  });
  assert.equal(missing.diagnostics.some((item) => item.code === 'MISSING_FRAME_REFERENCE'), true);
});

test('useDuct reemplaza el kit sin crear Part física', () => {
  const result = resolve('T', 90, {
    frameIds: ['A', 'B', 'C'],
    junctionOptions: { metadata: { useDuct: true } },
  });
  assert.equal(result.valid, true);
  assert.equal(result.parts.length, 0);
  assert.equal(result.diagnostics[0].code, 'REPLACED_BY_DUCT');
});

test('IDs son deterministas y la validación comprueba el contrato', () => {
  const first = resolve('DEG_90', 90);
  const second = resolve('DEG_90', 90);
  assert.equal(first.parts[0].id, 'C8_PART_J_DEG_90_A_B_JUNCTION_KIT');
  assert.equal(first.parts[0].id, second.parts[0].id);
  assert.equal(first.parts[0].type, 'JUNCTION_KIT');
  assert.equal(first.parts[0].quantity, 1);
  assert.equal(validateCritterium8JunctionParts(first).valid, true);
});

test('dos terminales aislados producen dos Parts aunque compartan código', () => {
  const logicalFrame = {
    frameId: 'FRAME_A',
    instanceId: 'INSTANCE_A',
    position: { x: 0.5, z: 0 },
    rotationY: 0,
    widthCm: 100,
    heightCm: 90,
  };
  const sequence = resolveCritterium8FrameSequence([logicalFrame]).sequence;
  const result = resolveCritterium8SequenceJunctionParts({ sequence, frames: [logicalFrame] });
  assert.equal(result.parts.length, 2);
  assert.equal(new Set(result.parts.map((part) => part.id)).size, 2);
  assert.deepEqual(result.parts.map((part) => part.code), ['22191900126', '22191900126']);
});

test('sequence resolver agrega resultados sin mutar entradas', () => {
  const sequence = {
    junctions: [junction('DEG_90', ['A', 'B']), junction('TERMINAL', ['A'], { id: 'J_TERMINAL' })],
  };
  const frames = [frame('A', 90), frame('B', 90)];
  const beforeSequence = structuredClone(sequence);
  const beforeFrames = structuredClone(frames);
  const result = resolveCritterium8SequenceJunctionParts({ sequence, frames });
  assert.equal(result.parts.length, 2);
  assert.equal(result.valid, true);
  assert.deepEqual(sequence, beforeSequence);
  assert.deepEqual(frames, beforeFrames);
  assert.doesNotThrow(() => JSON.stringify(result));
});
