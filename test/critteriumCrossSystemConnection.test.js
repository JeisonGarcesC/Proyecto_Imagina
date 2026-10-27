import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { createCritteriumBasicPlan } from '../src/mepal/critterium8/integration/critteriumBasicSystemPlanner.js';
import { validateCritteriumSequenceDraft } from '../src/mepal/critterium8/integration/critterium8Configurator.js';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { prepareCritterium8Sequence } from '../src/mepal/critterium8/integration/critterium8SequenceOperations.js';
import { createCritteriumSystemFromSequences, connectCritteriumSystemSequences } from '../src/mepal/critterium8/system/critteriumSystem.js';
import { collectCritteriumSpatialDiagnostics, resolveCritteriumConnectionPoints, validateCritteriumSpatialConnection } from '../src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js';
import { previewCritteriumSequenceSnap } from '../src/mepal/critterium8/system/layout/CritteriumSnapEngine.js';
import { translateCritteriumSequence } from '../src/mepal/critterium8/system/layout/CritteriumLayoutEngine.js';
import { captureCritteriumSpatialState, applyCritteriumSpatialState } from '../src/mepal/critterium8/system/critteriumSpatialHistory.js';
import { serializeCritteriumSystem, restoreCritteriumSystem } from '../src/mepal/critterium8/system/critteriumSystemPersistence.js';
import { analyzeCritteriumSpatialTopology } from '../src/mepal/critterium8/system/layout/CritteriumSpatialTopology.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

let serial = 0;
async function makeSystem(scene, shape, mode = 'BASIC') {
  const id = ++serial;
  const widths = shape === 'L' ? [[90, 90], [90, 90]] : [[90, 90]];
  const plan = createCritteriumBasicPlan({ shape, lengthsMm: shape === 'L' ? [1800, 1800] : [1800], frameWidthsBySide: widths });
  const sequences = [];
  for (const [sideIndex, side] of plan.sides.entries()) {
    const advanced = mode === 'ADVANCED' ? validateCritteriumSequenceDraft(side.draft) : null;
    if (advanced) assert.equal(advanced.success, true, advanced.reason);
    const frames = [];
    for (const [frameIndex, config] of side.draft.frames.entries()) {
      const instance = await createCritterium8Instance({ ...(advanced?.placements?.[frameIndex]?.config || config), transform: side.placements[frameIndex],
        instanceId: `CROSS_${id}_${sideIndex}_${frameIndex}`, frameId: `CROSS_FRAME_${id}_${sideIndex}_${frameIndex}` });
      scene.add(instance.assembly);
      frames.push(instance.assembly);
    }
    const prepared = prepareCritterium8Sequence({ frameAssemblies: frames });
    assert.equal(prepared.success, true, prepared.reason);
    scene.add(prepared.sequenceRoot);
    sequences.push(prepared.sequenceRoot);
  }
  const system = createCritteriumSystemFromSequences(sequences, { systemId: `CROSS_SYSTEM_${id}` });
  scene.add(system);
  if (shape === 'L') {
    const end = point(sequences[0], 'TERMINAL_END');
    const start = point(sequences[1], 'TERMINAL_START');
    connectCritteriumSystemSequences(system, { sourceSequenceId: end.sequenceId,
      sourcePointId: end.connectionId, targetSequenceId: start.sequenceId,
      targetPointId: start.connectionId, type: 'DEG_90' });
  }
  return { system, sequences };
}

function point(sequence, type) {
  return resolveCritteriumConnectionPoints(sequence).find((item) => item.type === type);
}

async function joinedFixture(targetShape = 'L', sourceShape = 'LINE', sourceMode = 'BASIC', targetMode = 'BASIC') {
  const scene = new Scene();
  const source = await makeSystem(scene, sourceShape, sourceMode);
  const target = await makeSystem(scene, targetShape, targetMode);
  const sourceEnd = point(source.sequences[0], sourceShape === 'L' ? 'TERMINAL_START' : 'TERMINAL_END');
  const targetStart = point(target.sequences[0], sourceShape === 'L' ? 'TERMINAL_END' : 'TERMINAL_START');
  const delta = targetStart.position.map((value, index) => value - sourceEnd.position[index]);
  if (sourceShape === 'L') {
    source.system.position.fromArray(delta);
    source.system.updateMatrixWorld(true);
  } else translateCritteriumSequence(source.sequences[0], delta);
  const candidates = [...source.sequences, ...target.sequences];
  const preview = previewCritteriumSequenceSnap(source.system, source.sequences[0], {
    targetSequenceId: target.sequences[0].userData.sequenceId, candidateSequences: candidates,
  });
  return { scene, source, target, preview };
}

for (const shape of ['L', 'LINE']) test(`a line can snap to an independent ${shape} system`, async () => {
  const { source, target, preview } = await joinedFixture(shape);
  assert.equal(preview.status, 'GREEN', preview.reason);
  assert.equal(preview.targetSystemId, target.system.userData.systemId);
  const before = captureCritteriumSpatialState(source.system);
  const connection = connectCritteriumSystemSequences(source.system, { ...preview,
    sourcePointId: preview.sourcePointId, targetPointId: preview.targetPointId,
    type: preview.type,
  }, { findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id) });
  assert.equal(connection.targetSystemId, target.system.userData.systemId);
  assert.equal(connection.sourceSystemId, source.system.userData.systemId);
  assert.equal(validateCritteriumSpatialConnection(source.system, connection).valid, true);
  assert.equal(analyzeCritteriumSpatialTopology(target.system).spatialConnections.some((item) => item.connectionId === connection.connectionId), true);
  assert.equal(target.sequences[0].parent, target.system);
  assert.equal(source.sequences[0].parent, source.system);
  const after = captureCritteriumSpatialState(source.system);
  applyCritteriumSpatialState(source.system, before);
  assert.equal(source.system.userData.connections.length, 0);
  applyCritteriumSpatialState(source.system, after);
  assert.equal(source.system.userData.connections.length, 1);
  assert.equal(validateCritteriumSpatialConnection(source.system, source.system.userData.connections[0]).valid, true);
  const serialized = serializeCritteriumSystem(source.system);
  assert.equal(serialized.connections[0].targetSystemId, target.system.userData.systemId);
});

test('an L can snap from its free terminal to an independent line', async () => {
  const { source, target, preview } = await joinedFixture('LINE', 'L');
  assert.equal(preview.status, 'GREEN', preview.reason);
  assert.equal(preview.sourcePointId, point(source.sequences[0], 'TERMINAL_START').connectionId);
  const connection = connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
    findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
  });
  assert.equal(validateCritteriumSpatialConnection(source.system, connection).valid, true);
  assert.equal(validateCritteriumSpatialConnection(source.system, source.system.userData.connections[0]).valid, true);
});

for (const [sourceMode, targetMode] of [['BASIC', 'ADVANCED'], ['ADVANCED', 'BASIC']])
  test(`line ${sourceMode} connects to L ${targetMode} through shared sequence factory`, async () => {
    const { source, target, preview } = await joinedFixture('L', 'LINE', sourceMode, targetMode);
    assert.equal(preview.status, 'GREEN', preview.reason);
    const connection = connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
      findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
    });
    assert.equal(validateCritteriumSpatialConnection(source.system, connection).valid, true);
  });

test('an external terminal cannot be occupied twice', async () => {
  const { scene, source, target, preview } = await joinedFixture();
  connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
    findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
  });
  const another = await makeSystem(scene, 'LINE');
  const anotherEnd = point(another.sequences[0], 'TERMINAL_END');
  assert.throws(() => connectCritteriumSystemSequences(another.system, {
    sourceSequenceId: anotherEnd.sequenceId, sourcePointId: anotherEnd.connectionId,
    targetSequenceId: preview.targetSequenceId, targetPointId: preview.targetPointId,
    targetSystemId: target.system.userData.systemId, type: preview.type,
  }, { findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id) }),
  /CONNECTION_POINT_OCCUPIED/);
});

for (const order of ['SOURCE_FIRST', 'TARGET_FIRST']) test(`cross-system connection survives restoration ${order}`, async () => {
  const { source, target, preview } = await joinedFixture();
  connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
    findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
  });
  const savedSource = serializeCritteriumSystem(source.system);
  const savedTarget = serializeCritteriumSystem(target.system);
  const scene = new Scene();
  for (const sequence of [...source.sequences, ...target.sequences]) {
    scene.attach(sequence);
    delete sequence.userData.parentSystemId;
  }
  const partsRegistry = [];
  const findSequence = (id) => scene.children.find((child) => child.userData?.sequenceId === id)
    || scene.children.flatMap((child) => child.children).find((child) => child.userData?.sequenceId === id);
  let restoredSource; let restoredTarget;
  if (order === 'SOURCE_FIRST') {
    restoredSource = restoreCritteriumSystem(savedSource, { scene, partsRegistry, findSequence });
    restoredTarget = restoreCritteriumSystem(savedTarget, { scene, partsRegistry, findSequence });
  } else {
    restoredTarget = restoreCritteriumSystem(savedTarget, { scene, partsRegistry, findSequence });
    restoredSource = restoreCritteriumSystem(savedSource, { scene, partsRegistry, findSequence });
  }
  assert.equal(restoredSource.userData.systemId, savedSource.systemId);
  assert.equal(restoredTarget.userData.systemId, savedTarget.systemId);
  assert.equal(validateCritteriumSpatialConnection(restoredSource, restoredSource.userData.connections[0]).valid, true);
});

test('cross-system connection is one undo and redo action', async () => {
  const { source, target, preview } = await joinedFixture();
  const before = captureCritteriumSpatialState(source.system);
  connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
    findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
  });
  const after = captureCritteriumSpatialState(source.system);
  const history = createHistoryManager({ replayAction: (action, direction) =>
    applyCritteriumSpatialState(source.system, direction === 'undo' ? action.before : action.after) });
  history.pushAction({ type: HISTORY_ACTION_TYPES.CRITERIUM_SYSTEM_CONNECT_SEQUENCE,
    systemId: source.system.userData.systemId, before, after });
  await history.undo();
  assert.equal(source.system.userData.connections.length, 0);
  await history.redo();
  assert.equal(source.system.userData.connections.length, 1);
  assert.equal(validateCritteriumSpatialConnection(source.system, source.system.userData.connections[0]).valid, true);
});

test('moving either independent system recalculates the same physical connection', async () => {
  const { source, target, preview } = await joinedFixture();
  const connection = connectCritteriumSystemSequences(source.system, { ...preview, type: preview.type }, {
    findSequence: (id) => target.sequences.find((sequence) => sequence.userData.sequenceId === id),
  });
  target.system.position.x += 0.1;
  target.system.updateMatrixWorld(true);
  assert.equal(validateCritteriumSpatialConnection(source.system, connection).valid, false);
  assert.equal(collectCritteriumSpatialDiagnostics(source.system)[0].code, 'CRITERIUM_SPATIAL_POINTS_SEPARATED');
  assert.equal(collectCritteriumSpatialDiagnostics(target.system)[0].code, 'CRITERIUM_SPATIAL_POINTS_SEPARATED');
  target.system.position.x -= 0.1;
  target.system.updateMatrixWorld(true);
  assert.equal(validateCritteriumSpatialConnection(source.system, connection).valid, true);
});
