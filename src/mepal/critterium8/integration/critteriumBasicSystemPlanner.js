import * as THREE from 'three';
import { CRITTERIUM8_CODED_FRAME_WIDTHS_CM } from '../catalog/frameCatalog.js';
import { validateCritteriumSequenceDraft } from './critterium8Configurator.js';
import { createCritterium8Instance } from '../factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from './critterium8SequenceOperations.js';
import { disposeCritterium8Sequence3D } from '../builders/Critterium8SequenceRenderBuilder.js';
import { createCritteriumSystemFromSequences, connectCritteriumSystemSequences } from '../system/critteriumSystem.js';
import { resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from '../system/layout/CritteriumConnectionResolver.js';
import { analyzeCritteriumSpatialTopology } from '../system/layout/CritteriumSpatialTopology.js';

const widths = [...CRITTERIUM8_CODED_FRAME_WIDTHS_CM].sort((a, b) => b - a);
const shapeSides = { LINE: 1, L: 2, U: 3, RECTANGLE: 4 };
const mm = (meters) => Math.round(meters * 1000000) / 1000;

export function listCritteriumBasicWidths(targetMm) {
  const byLength = new Map();
  function visit(items, start, total) {
    if (items.length >= 2) {
      const key = total * 10;
      const previous = byLength.get(key);
      if (!previous || items.length < previous.length) byLength.set(key, [...items]);
    }
    if (items.length === 6) return;
    for (let index = start; index < widths.length; index += 1)
      visit([...items, widths[index]], index, total + widths[index]);
  }
  visit([], 0, 0);
  return [...byLength.entries()]
    .sort((a, b) => Math.abs(a[0] - targetMm) - Math.abs(b[0] - targetMm) || a[1].length - b[1].length || a[0] - b[0])
    .map(([nominalMm, frameWidthsCm]) => ({ nominalMm, frameWidthsCm }));
}

function sideLengths(shape, lengthsMm) {
  if (!shapeSides[shape]) throw new Error('CRITTERIUM_BASIC_SHAPE_UNSUPPORTED');
  const requested = (lengthsMm || []).map(Number);
  const needed = shape === 'LINE' ? 1 : shape === 'U' ? 3 : 2;
  if (requested.length !== needed || requested.some((value) => !Number.isFinite(value) || value <= 0))
    throw new Error('CRITTERIUM_BASIC_DIMENSIONS_INVALID');
  if (shape === 'RECTANGLE') return [requested[0], requested[1], requested[0], requested[1]];
  return requested;
}

function sideVertices(lengthsM) {
  let x = 0; let z = 0;
  return lengthsM.map((length, index) => {
    const angle = index * Math.PI / 2;
    const side = { x, z, angle };
    x += Math.cos(angle) * length;
    z -= Math.sin(angle) * length;
    return side;
  });
}

function draftForWidths(frameWidthsCm, heightCm, orientationDeg) {
  const draft = { orientationDeg, frames: frameWidthsCm.map((widthCm) => ({
    widthCm, heightCm, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', tiles: [], growthModules: [],
  })) };
  const validation = validateCritteriumSequenceDraft(draft);
  if (!validation.success) throw new Error(validation.reason);
  return draft;
}

export function createCritteriumBasicPlan({ shape, lengthsMm, heightCm = 90, frameWidthsBySide } = {}) {
  const requestedLengths = sideLengths(shape, lengthsMm);
  if (!Array.isArray(frameWidthsBySide) || frameWidthsBySide.length !== shapeSides[shape])
    throw new Error('CRITTERIUM_BASIC_SIDES_INVALID');
  const nominalLengthsM = frameWidthsBySide.map((items) => items.reduce((sum, width) => sum + width, 0) / 100);
  const vertices = sideVertices(nominalLengthsM);
  const sides = frameWidthsBySide.map((items, index) => {
    const draft = draftForWidths(items, heightCm, index * 90);
    let cursor = 0;
    const { x, z, angle } = vertices[index];
    const placements = items.map((widthCm) => {
      const center = cursor + widthCm / 200;
      cursor += widthCm / 100;
      return { position: [x + Math.cos(angle) * center, 0, z - Math.sin(angle) * center],
        quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle).toArray() };
    });
    return { draft, placements, nominalMm: mm(nominalLengthsM[index]) };
  });
  return { shape, requestedLengths, heightCm, sides };
}

export async function measureCritteriumBasicPlan(plan) {
  const staging = new THREE.Group();
  const sequences = [];
  let system = null;
  try {
    for (const [sideIndex, side] of plan.sides.entries()) {
      const frames = [];
      for (const [frameIndex, config] of side.draft.frames.entries()) {
        const instance = await createCritterium8Instance({ ...config,
          instanceId: `C8_PREVIEW_${sideIndex}_${frameIndex}`,
          frameId: `C8_PREVIEW_${sideIndex}_${frameIndex}_FRAME`,
          transform: side.placements[frameIndex],
        });
        const error = instance.diagnostics?.find((item) => item.level === 'ERROR');
        if (error) throw new Error(error.code);
        staging.add(instance.assembly);
        frames.push(instance.assembly);
      }
      const result = prepareCritterium8Sequence({ frameAssemblies: frames, options: { sequenceId: `C8_PREVIEW_SEQUENCE_${sideIndex}` } });
      if (!result.success) throw new Error(result.reason);
      staging.add(result.sequenceRoot);
      sequences.push(result.sequenceRoot);
    }
    system = createCritteriumSystemFromSequences(sequences, { systemId: 'C8_PREVIEW_SYSTEM' });
    staging.add(system);
    const connectionCount = plan.shape === 'RECTANGLE' ? sequences.length : sequences.length - 1;
    for (let index = 0; index < connectionCount; index += 1) {
      const source = sequences[index];
      const target = sequences[(index + 1) % sequences.length];
      const end = resolveCritteriumConnectionPoints(source).find((point) => point.type === 'TERMINAL_END');
      const start = resolveCritteriumConnectionPoints(target).find((point) => point.type === 'TERMINAL_START');
      if (!end || !start) throw new Error('CRITTERIUM_BASIC_TERMINAL_MISSING');
      const connection = connectCritteriumSystemSequences(system, {
        sourceSequenceId: end.sequenceId, sourcePointId: end.connectionId,
        targetSequenceId: start.sequenceId, targetPointId: start.connectionId, type: 'DEG_90',
      });
      const validation = validateCritteriumSpatialConnection(system, connection);
      if (!validation.valid) throw new Error(validation.reason);
    }
    const topology = analyzeCritteriumSpatialTopology(system);
    if (plan.shape === 'RECTANGLE' && !topology.closedLoop) throw new Error('CRITTERIUM_BASIC_NOT_CLOSED');
    if (topology.diagnostics.some((item) => item.code === 'COLLISION_REAL')) throw new Error('CRITTERIUM_BASIC_COLLISION');
    system.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(system);
    if (bounds.isEmpty()) throw new Error('CRITTERIUM_BASIC_EMPTY_GEOMETRY');
    const sideExteriorMm = sequences.map((sequence, index) => {
      const sideBounds = new THREE.Box3().setFromObject(sequence);
      return mm(index % 2 === 0 ? sideBounds.max.x - sideBounds.min.x : sideBounds.max.z - sideBounds.min.z);
    });
    return { success: true, plan, exteriorMm: { width: mm(bounds.max.x - bounds.min.x), depth: mm(bounds.max.z - bounds.min.z) }, sideExteriorMm,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      closedLoop: topology.closedLoop, connectionCount, commercialCornerWarning: connectionCount > 0 };
  } catch (error) {
    return { success: false, reason: String(error?.message || error) };
  } finally {
    sequences.forEach((sequence) => disposeCritterium8Sequence3D(sequence));
    staging.clear();
  }
}

export async function findCritteriumBasicOptions({ shape, lengthsMm, heightCm = 90 } = {}) {
  const requested = sideLengths(shape, lengthsMm);
  const first = listCritteriumBasicWidths(requested[0]).slice(0, shape === 'U' ? 3 : 5);
  const second = shape === 'LINE' ? [null] : listCritteriumBasicWidths(requested[1]).slice(0, shape === 'U' ? 3 : 5);
  const third = shape === 'U' ? listCritteriumBasicWidths(requested[2]).slice(0, 3) : [null];
  const options = [];
  for (const a of first) for (const b of second) for (const c of third) {
    const frameWidthsBySide = shape === 'LINE' ? [a.frameWidthsCm]
      : shape === 'L' ? [a.frameWidthsCm, b.frameWidthsCm]
        : shape === 'U' ? [a.frameWidthsCm, b.frameWidthsCm, c.frameWidthsCm]
          : [a.frameWidthsCm, b.frameWidthsCm, a.frameWidthsCm, b.frameWidthsCm];
    const plan = createCritteriumBasicPlan({ shape, lengthsMm, heightCm, frameWidthsBySide });
    const measured = await measureCritteriumBasicPlan(plan);
    if (!measured.success) continue;
    const errorMm = shape === 'LINE' ? Math.abs(measured.exteriorMm.width - requested[0])
      : shape === 'RECTANGLE' ? Math.abs(measured.exteriorMm.width - requested[0]) + Math.abs(measured.exteriorMm.depth - requested[1])
        : requested.reduce((sum, target, index) => sum + Math.abs(measured.sideExteriorMm[index] - target), 0);
    options.push({ ...measured, errorMm, exact: errorMm <= 1 });
  }
  options.sort((a, b) => a.errorMm - b.errorMm || a.plan.sides.reduce((sum, side) => sum + side.draft.frames.length, 0)
    - b.plan.sides.reduce((sum, side) => sum + side.draft.frames.length, 0));
  return options.slice(0, 3);
}
