import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { restoreCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequencePersistence.js';
import { createCritteriumSystemFromSequences, registerCritteriumSystem, connectCritteriumSystemSequences,
  disconnectCritteriumSystemSequences, moveCritteriumSystem, removeSequenceFromCritteriumSystem,
  deleteCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { serializeCritteriumSystem, restoreCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { captureCritteriumSpatialState, applyCritteriumSpatialState } from '../src/mepal/critterium8/system/critteriumSpatialHistory.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { classifyCritteriumConnection } from '../src/mepal/critterium8/system/layout/CritteriumConnectionRules.js';
import { previewCritteriumSequenceSnap } from '../src/mepal/critterium8/system/layout/CritteriumSnapEngine.js';
import { alignCritteriumSequences, distributeCritteriumSequences, layoutCritteriumLinear,
  rotateCritteriumSequence90, translateCritteriumSequence } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { critteriumFramesOverlap } from '../src/mepal/critterium8/system/layout/CritteriumSpatialUtils.js';

async function makeSequence(context, label, startX, heightCm = 90) {
  const frames = [];
  for (let index = 0; index < 2; index += 1) {
    const instance = await createCritterium8Instance({ widthCm: 90, heightCm,
      instanceId: `${label}_I${index}`, frameId: `${label}_F${index}` });
    instance.assembly.position.x = startX + 0.45 + index * 0.9;
    registerCritterium8Instance({ instance, parent: context.scene, partsRegistry: context.parts, pickables: context.pickables });
    frames.push(instance.assembly);
  }
  const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
  assert.equal(prepared.success, true, prepared.reason);
  registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: context.scene,
    partsRegistry: context.parts, pickables: context.pickables });
  return { sequence: prepared.sequenceRoot, frames };
}

async function makeSystem({ secondStart = 3, secondHeight = 90, third = false } = {}) {
  const context = { scene: new Scene(), parts: [], pickables: [] };
  const a = await makeSequence(context, 'A', 0);
  const b = await makeSequence(context, 'B', secondStart, secondHeight);
  const c = third ? await makeSequence(context, 'C', 6) : null;
  const system = createCritteriumSystemFromSequences([a.sequence, b.sequence, ...(c ? [c.sequence] : [])]);
  registerCritteriumSystem({ system, scene: context.scene, partsRegistry: context.parts });
  return { ...context, system, a, b, c };
}

function point(sequence, type) {
  return resolveCritteriumConnectionPoints(sequence).find((item) => item.type === type);
}

function bom(context) {
  return resolveCritterium8BOM(context.parts).rows
    .map(({ code, reference, description, qty, materialCode, finishCode }) => ({ code, reference, description, qty, materialCode, finishCode }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

test('puntos terminales coinciden con extremos reales y siguen la transformación del sistema', async () => {
  const context = await makeSystem();
  const start = point(context.a.sequence, 'TERMINAL_START');
  const end = point(context.a.sequence, 'TERMINAL_END');
  assert.ok(Math.abs(start.position[0]) < 1e-9);
  assert.ok(Math.abs(end.position[0] - 1.8) < 1e-9);
  assert.ok(Math.abs(start.direction[0] + 1) < 1e-9 && Math.abs(start.direction[2]) < 1e-9);
  assert.ok(Math.abs(end.direction[0] - 1) < 1e-9 && Math.abs(end.direction[2]) < 1e-9);
  moveCritteriumSystem(context.system, { x: 2, z: -1 });
  assert.ok(Math.abs(point(context.a.sequence, 'TERMINAL_END').position[0] - 3.8) < 1e-9);
  assert.ok(Math.abs(point(context.a.sequence, 'TERMINAL_END').position[2] + 1) < 1e-9);
});

test('huellas de frames distinguen contacto válido de intersección real', async () => {
  const context = await makeSystem({ secondStart: 1.8 });
  assert.equal(critteriumFramesOverlap(context.a.frames[1], context.b.frames[0]), false);
  translateCritteriumSequence(context.b.sequence, [-0.1, 0, 0]);
  assert.equal(critteriumFramesOverlap(context.a.frames[1], context.b.frames[0]), true);
});

test('snap lineal usa delta geométrico, tolerancia y deja el preview sin mutación', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const before = context.b.sequence.getWorldPosition(new Vector3()).toArray();
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  assert.equal(preview.status, 'GREEN');
  assert.equal(preview.type, 'LINEAR');
  assert.ok(Math.abs(preview.deltaWorld[0] + 0.2) < 1e-9);
  assert.deepEqual(context.b.sequence.getWorldPosition(new Vector3()).toArray(), before);
  translateCritteriumSequence(context.b.sequence, [1, 0, 0]);
  assert.equal(previewCritteriumSequenceSnap(context.system, context.b.sequence), null);
  translateCritteriumSequence(context.b.sequence, [-0.8, 0, 0]);
  assert.equal(previewCritteriumSequenceSnap(context.system, context.b.sequence).status, 'YELLOW');
});

test('encuentro a 90° explícito, rechazo de orientación y altura', async () => {
  const context = await makeSystem({ secondStart: 2 });
  rotateCritteriumSequence90(context.b.sequence);
  const aEnd = point(context.a.sequence, 'TERMINAL_END');
  const bStart = point(context.b.sequence, 'TERMINAL_START');
  translateCritteriumSequence(context.b.sequence, [aEnd.position[0] - bStart.position[0] + 0.1, 0, aEnd.position[2] - bStart.position[2]]);
  assert.equal(previewCritteriumSequenceSnap(context.system, context.b.sequence).type, 'DEG_90');
  const incompatible = { ...point(context.b.sequence, 'TERMINAL_START'), direction: [...aEnd.direction], normal: [...aEnd.normal] };
  assert.equal(classifyCritteriumConnection(aEnd, incompatible).reason, 'INCOMPATIBLE_ORIENTATION');
  const high = await makeSystem({ secondStart: 2, secondHeight: 128 });
  assert.equal(previewCritteriumSequenceSnap(high.system, high.b.sequence).status, 'RED');
  assert.equal(previewCritteriumSequenceSnap(high.system, high.b.sequence).reason, 'INCOMPATIBLE_DIMENSIONS');
});

test('conectar y desconectar preserva IDs y BOM; duplicado inverso se rechaza', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const before = bom(context);
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  translateCritteriumSequence(context.b.sequence, preview.deltaWorld);
  const connection = connectCritteriumSystemSequences(context.system, {
    sourceSequenceId: preview.sourceSequenceId, targetSequenceId: preview.targetSequenceId,
    sourcePointId: preview.sourcePointId, targetPointId: preview.targetPointId, type: preview.type });
  assert.equal(validateCritteriumSpatialConnection(context.system, connection).valid, true);
  assert.throws(() => connectCritteriumSystemSequences(context.system, {
    sourceSequenceId: preview.targetSequenceId, targetSequenceId: preview.sourceSequenceId,
    sourcePointId: preview.targetPointId, targetPointId: preview.sourcePointId, type: preview.type }), /DUPLICATE/);
  assert.deepEqual(bom(context), before);
  disconnectCritteriumSystemSequences(context.system, connection.connectionId);
  assert.equal(context.system.userData.connections.length, 0);
  assert.deepEqual(bom(context), before);
  assert.equal(context.b.frames[0].userData.frameId, 'B_F0');
});

test('un punto terminal no admite una segunda unión espacial no soportada', async () => {
  const context = await makeSystem({ secondStart: 2, third: true });
  const aPoint = point(context.a.sequence, 'TERMINAL_END');
  const bPoint = point(context.b.sequence, 'TERMINAL_START');
  const cPoint = point(context.c.sequence, 'TERMINAL_START');
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: aPoint.sequenceId,
    targetSequenceId: bPoint.sequenceId, sourcePointId: aPoint.connectionId,
    targetPointId: bPoint.connectionId, type: 'LINEAR' });
  assert.throws(() => connectCritteriumSystemSequences(context.system, { sourceSequenceId: aPoint.sequenceId,
    targetSequenceId: cPoint.sequenceId, sourcePointId: aPoint.connectionId,
    targetPointId: cPoint.connectionId, type: 'LINEAR' }), /POINT_OCCUPIED/);
});

test('alineación, distribución, rotación y layout lineal no cambian BOM ni identidad', async () => {
  const context = await makeSystem({ third: true });
  const ids = [...context.system.userData.sequenceIds];
  const before = bom(context);
  alignCritteriumSequences(context.system, ids, 'HORIZONTAL');
  distributeCritteriumSequences(context.system, ids, 'X');
  rotateCritteriumSequence90(context.b.sequence);
  layoutCritteriumLinear(context.system, ids, { separationM: 0.05 });
  const aEnd = point(context.a.sequence, 'TERMINAL_END');
  const bStart = point(context.b.sequence, 'TERMINAL_START');
  assert.ok(Math.abs(bStart.position[0] - aEnd.position[0] - 0.05) < 1e-8);
  assert.deepEqual(context.system.userData.sequenceIds, ids);
  assert.deepEqual(bom(context), before);
});

test('guardar y restaurar conserva snap, conexiones, transformaciones, frames y BOM', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  translateCritteriumSequence(context.b.sequence, preview.deltaWorld);
  const connection = connectCritteriumSystemSequences(context.system, {
    sourceSequenceId: preview.sourceSequenceId, targetSequenceId: preview.targetSequenceId,
    sourcePointId: preview.sourcePointId, targetPointId: preview.targetPointId, type: preview.type });
  const before = bom(context);
  const entities = JSON.parse(JSON.stringify(serializeProjectEntities(context.parts).entities));
  const restored = { scene: new Scene(), parts: [], pickables: [] };
  for (const entity of entities.filter((item) => item.kind === 'CRITTERIUM_8')) {
    const instance = await createCritterium8Instance({ ...entity.config, instanceId: entity.instanceId, frameId: entity.frameId,
      assemblyId: entity.assemblyId, groupId: entity.groupId, transform: entity.transform });
    registerCritterium8Instance({ instance, parent: restored.scene, partsRegistry: restored.parts, pickables: restored.pickables });
  }
  for (const entity of entities.filter((item) => item.kind === 'CRITTERIUM_8_SEQUENCE')) {
    restoreCritterium8Sequence(entity, { scene: restored.scene, partsRegistry: restored.parts, pickables: restored.pickables,
      findFrame: (id) => restored.parts.find(({ obj }) => obj?.userData?.frameId === id)?.obj });
  }
  const systemEntity = entities.find((item) => item.kind === 'CRITERIUM_SYSTEM');
  const loaded = restoreCritteriumSystem(systemEntity, { scene: restored.scene, partsRegistry: restored.parts,
    findSequence: (id) => restored.parts.find(({ obj }) => obj?.userData?.sequenceId === id)?.obj });
  assert.equal(loaded.userData.connections.length, 1);
  assert.equal(loaded.userData.connections[0].connectionId, connection.connectionId);
  assert.deepEqual(loaded.userData.sequenceIds, context.system.userData.sequenceIds);
  assert.deepEqual(loaded.userData.spatialDiagnostics, []);
  assert.deepEqual(bom(restored), before);
  const saved = serializeCritteriumSystem(loaded);
  assert.deepEqual(saved.connections, systemEntity.connections);
  assert.deepEqual(saved.spatialConfig, systemEntity.spatialConfig);
  assert.deepEqual(loaded.children.map((sequence) => sequence.children.filter((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY').length), [2, 2]);
  for (const original of [context.a.sequence, context.b.sequence]) {
    const reopened = loaded.children.find((sequence) => sequence.userData.sequenceId === original.userData.sequenceId);
    assert.deepEqual(reopened.userData.sequence.slots.map((slot) => slot.slotId),
      original.userData.sequence.slots.map((slot) => slot.slotId));
    assert.deepEqual(reopened.userData.sequence.slotConnections,
      original.userData.sequence.slotConnections);
  }
});

test('reapertura diagnostica una conexión espacial desplazada sin destruir secuencias', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  translateCritteriumSequence(context.b.sequence, preview.deltaWorld);
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: preview.sourceSequenceId,
    targetSequenceId: preview.targetSequenceId, sourcePointId: preview.sourcePointId,
    targetPointId: preview.targetPointId, type: preview.type });
  translateCritteriumSequence(context.b.sequence, [0.2, 0, 0]);
  const entity = serializeCritteriumSystem(context.system);
  const before = bom(context);
  deleteCritteriumSystem(context.system, { partsRegistry: context.parts, parent: context.scene });
  const loaded = restoreCritteriumSystem(entity, { scene: context.scene, partsRegistry: context.parts,
    findSequence: (id) => [context.a.sequence, context.b.sequence].find((sequence) => sequence.userData.sequenceId === id) });
  assert.equal(loaded.children.length, 2);
  assert.equal(loaded.userData.connections.length, 1);
  assert.equal(loaded.userData.spatialDiagnostics[0].code, 'CRITERIUM_SPATIAL_POINTS_SEPARATED');
  assert.deepEqual(bom(context), before);
});

test('quitar secuencia elimina su relación espacial y mantiene los frames', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const before = bom(context);
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  translateCritteriumSequence(context.b.sequence, preview.deltaWorld);
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: preview.sourceSequenceId, targetSequenceId: preview.targetSequenceId,
    sourcePointId: preview.sourcePointId, targetPointId: preview.targetPointId, type: preview.type });
  removeSequenceFromCritteriumSystem(context.system, context.b.sequence.userData.sequenceId, context.scene);
  assert.equal(context.system.userData.connections.length, 0);
  assert.equal(context.b.sequence.parent, context.scene);
  assert.deepEqual(bom(context), before);
});

test('un movimiento con conexión produce una acción y Undo/Redo restaura posición y relación', async () => {
  const context = await makeSystem({ secondStart: 2 });
  const before = captureCritteriumSpatialState(context.system);
  const preview = previewCritteriumSequenceSnap(context.system, context.b.sequence);
  translateCritteriumSequence(context.b.sequence, preview.deltaWorld);
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: preview.sourceSequenceId,
    targetSequenceId: preview.targetSequenceId, sourcePointId: preview.sourcePointId,
    targetPointId: preview.targetPointId, type: preview.type });
  const after = captureCritteriumSpatialState(context.system);
  const history = createHistoryManager({ replayAction: (action, direction) =>
    applyCritteriumSpatialState(context.system, direction === 'undo' ? action.before : action.after) });
  history.pushAction({ type: HISTORY_ACTION_TYPES.CRITERIUM_SYSTEM_MOVE_SEQUENCE, before, after });
  await history.undo();
  assert.deepEqual(captureCritteriumSpatialState(context.system), before);
  assert.equal(context.system.userData.connections.length, 0);
  await history.redo();
  assert.deepEqual(captureCritteriumSpatialState(context.system), after);
  assert.equal(context.system.userData.connections.length, 1);
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);
});
