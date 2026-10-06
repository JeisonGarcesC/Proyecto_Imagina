import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { registerCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceRegistration.js';
import { createCritteriumSystemFromSequences, connectCritteriumSystemSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { serializeCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { analyzeCritteriumSpatialTopology } from '../src/mepal/critterium8/system/layout/CritteriumSpatialTopology.js';
import { resolveCritteriumConnectionPoints } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { rotateCritteriumSequence90, translateCritteriumSequence } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { layoutCritteriumOffice } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { classifyCritteriumFrameProximity, classifyCritteriumSystemProximity } from '../src/mepal/critterium8/system/layout/CritteriumSpatialUtils.js';
import { captureCritteriumSpatialState, applyCritteriumSpatialState } from '../src/mepal/critterium8/system/critteriumSpatialHistory.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';
import { resolveCritterium8BOM } from '../src/mepal/critterium8/bom/critterium8BOM.js';
import { previewCritteriumSequenceSnap } from '../src/mepal/critterium8/system/layout/CritteriumSnapEngine.js';

async function fixture(count = 4) {
  const scene = new Scene(); const parts = []; const pickables = []; const sequences = [];
  for (let number = 0; number < count; number += 1) {
    const frames = [];
    for (let index = 0; index < 2; index += 1) {
      const instance = await createCritterium8Instance({ widthCm: 90, heightCm: 90,
        instanceId: `P6_I${number}_${index}`, frameId: `P6_F${number}_${index}` });
      instance.assembly.position.x = 0.45 + index * 0.9;
      registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
      frames.push(instance.assembly);
    }
    const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
    assert.equal(prepared.success, true, prepared.reason);
    registerCritterium8Sequence({ sequenceRoot: prepared.sequenceRoot, parent: scene, partsRegistry: parts, pickables });
    sequences.push(prepared.sequenceRoot);
  }
  const system = createCritteriumSystemFromSequences(sequences);
  return { system, sequences, parts };
}

function terminal(sequence, type) {
  return resolveCritteriumConnectionPoints(sequence).find((point) => point.type === type);
}

function join(system, sourceSequence, targetSequence, type = 'DEG_90') {
  const source = terminal(sourceSequence, 'TERMINAL_END');
  const target = terminal(targetSequence, 'TERMINAL_START');
  translateCritteriumSequence(targetSequence, source.position.map((value, index) => value - target.position[index]));
  return connectCritteriumSystemSequences(system, { sourceSequenceId: source.sequenceId,
    sourcePointId: source.connectionId, targetSequenceId: target.sequenceId,
    targetPointId: target.connectionId, type });
}

test('el trazado deriva nodos y longitudes sin alterar BOM', async () => {
  const context = await fixture(2);
  const before = resolveCritterium8BOM(context.parts).rows;
  translateCritteriumSequence(context.sequences[1], [1.8, 0, 0]);
  join(context.system, context.sequences[0], context.sequences[1], 'LINEAR');
  const topology = analyzeCritteriumSpatialTopology(context.system);
  assert.equal(topology.spatialNodes.length, 4);
  assert.equal(topology.spatialConnections.length, 1);
  assert.equal(topology.spatialConnections[0].valid, true);
  assert.equal(topology.closedLoop, false);
  assert.ok(Math.abs(topology.totalLengthM - 3.6) < 1e-8);
  assert.deepEqual(resolveCritterium8BOM(context.parts).rows, before);
  assert.equal(serializeCritteriumSystem(context.system).spatialNodes.length, 4);
});

test('cuatro secuencias físicas a 90° forman un recinto sin piezas adicionales', async () => {
  const context = await fixture();
  const before = resolveCritterium8BOM(context.parts).rows;
  rotateCritteriumSequence90(context.sequences[1]);
  rotateCritteriumSequence90(context.sequences[2]);
  rotateCritteriumSequence90(context.sequences[2]);
  for (let index = 0; index < 3; index += 1) rotateCritteriumSequence90(context.sequences[3]);
  join(context.system, context.sequences[0], context.sequences[1]);
  join(context.system, context.sequences[1], context.sequences[2]);
  join(context.system, context.sequences[2], context.sequences[3]);
  const dEnd = terminal(context.sequences[3], 'TERMINAL_END');
  const aStart = terminal(context.sequences[0], 'TERMINAL_START');
  assert.ok(Math.hypot(dEnd.position[0] - aStart.position[0], dEnd.position[2] - aStart.position[2]) < 1e-8);
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: dEnd.sequenceId,
    sourcePointId: dEnd.connectionId, targetSequenceId: aStart.sequenceId,
    targetPointId: aStart.connectionId, type: 'DEG_90' });
  const topology = analyzeCritteriumSpatialTopology(context.system);
  assert.equal(topology.closedLoop, true);
  assert.equal(topology.closedLoops.length, 1);
  assert.ok(topology.closedLoops[0].areaApproxM2 > 0);
  assert.equal(topology.diagnostics.length, 0);
  assert.deepEqual(resolveCritterium8BOM(context.parts).rows, before);
});

test('T y cruce se rechazan sin anclajes físicos laterales', async () => {
  const context = await fixture(2);
  const source = terminal(context.sequences[0], 'TERMINAL_END');
  const target = terminal(context.sequences[1], 'TERMINAL_START');
  for (const type of ['T_JUNCTION', 'CROSS']) assert.throws(() =>
    connectCritteriumSystemSequences(context.system, { sourceSequenceId: source.sequenceId,
      sourcePointId: source.connectionId, targetSequenceId: target.sequenceId,
      targetPointId: target.connectionId, type }), /UNSUPPORTED_SPATIAL_TOPOLOGY/);
  assert.equal(context.system.userData.connections.length, 0);
});

test('proximidad paramétrica distingue contacto, cercanía y solapamiento', async () => {
  const context = await fixture(2);
  const a = context.sequences[0].children.find((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
  const b = context.sequences[1].children.find((child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
  assert.equal(classifyCritteriumFrameProximity(a, b).status, 'COLLISION_REAL');
  translateCritteriumSequence(context.sequences[1], [0.92, 0, 0]);
  assert.equal(classifyCritteriumFrameProximity(a, b).status, 'NEAR_COLLISION');
  translateCritteriumSequence(context.sequences[1], [0.12, 0, 0]);
  assert.equal(classifyCritteriumFrameProximity(a, b).status, 'VALID');
});

test('organizar oficina recompone línea y esquina, es determinista y registra una acción reversible', async () => {
  const context = await fixture(3);
  const [a, b, c] = context.sequences;
  rotateCritteriumSequence90(c);
  const ab = { sourceSequenceId: a.userData.sequenceId, sourcePointId: terminal(a, 'TERMINAL_END').connectionId,
    targetSequenceId: b.userData.sequenceId, targetPointId: terminal(b, 'TERMINAL_START').connectionId, type: 'LINEAR' };
  const bc = { sourceSequenceId: b.userData.sequenceId, sourcePointId: terminal(b, 'TERMINAL_END').connectionId,
    targetSequenceId: c.userData.sequenceId, targetPointId: terminal(c, 'TERMINAL_START').connectionId, type: 'DEG_90' };
  connectCritteriumSystemSequences(context.system, ab);
  connectCritteriumSystemSequences(context.system, bc);
  translateCritteriumSequence(b, [4, 0, 0]);
  translateCritteriumSequence(c, [7, 0, 2]);
  const before = captureCritteriumSpatialState(context.system);
  const bomBefore = resolveCritterium8BOM(context.parts).rows;
  layoutCritteriumOffice(context.system);
  const after = captureCritteriumSpatialState(context.system);
  assert.equal(analyzeCritteriumSpatialTopology(context.system).diagnostics.length, 0);
  assert.equal(previewCritteriumSequenceSnap(context.system, c, { targetSequenceId: b.userData.sequenceId }).status, 'GREEN');
  assert.equal(classifyCritteriumSystemProximity(context.system).some((item) => item.code === 'COLLISION_REAL'), false);
  assert.deepEqual(resolveCritterium8BOM(context.parts).rows, bomBefore);
  layoutCritteriumOffice(context.system);
  assert.deepEqual(captureCritteriumSpatialState(context.system), after);
  const history = createHistoryManager({ replayAction: (action, direction) =>
    applyCritteriumSpatialState(context.system, direction === 'undo' ? action.before : action.after) });
  history.pushAction({ type: HISTORY_ACTION_TYPES.CRITERIUM_SYSTEM_AUTO_LAYOUT, before, after });
  await history.undo();
  assert.deepEqual(captureCritteriumSpatialState(context.system), before);
  await history.redo();
  assert.deepEqual(captureCritteriumSpatialState(context.system), after);
});

test('layout inválido revierte todas las posiciones sin acción parcial', async () => {
  const context = await fixture(3);
  const [a, b, c] = context.sequences;
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: a.userData.sequenceId,
    sourcePointId: terminal(a, 'TERMINAL_END').connectionId,
    targetSequenceId: b.userData.sequenceId,
    targetPointId: terminal(b, 'TERMINAL_START').connectionId, type: 'LINEAR' });
  connectCritteriumSystemSequences(context.system, { sourceSequenceId: b.userData.sequenceId,
    sourcePointId: terminal(b, 'TERMINAL_END').connectionId,
    targetSequenceId: c.userData.sequenceId,
    targetPointId: terminal(c, 'TERMINAL_START').connectionId, type: 'DEG_90' });
  translateCritteriumSequence(b, [4, 0, 0]);
  const before = captureCritteriumSpatialState(context.system);
  assert.throws(() => layoutCritteriumOffice(context.system), /NO_VALID_LAYOUT/);
  assert.deepEqual(captureCritteriumSpatialState(context.system), before);
});
