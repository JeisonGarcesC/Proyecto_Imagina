import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { createVetroDoorAssembly, createVetroAssemblyFromEntity } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { previewVetroAssemblySnap, connectVetroAssemblyToSystem, disconnectVetroAssemblyFromSystem, getVetroAssemblyRelations, resolveVetroAssemblyConnectors, isVetroAssemblyConnectionAligned, captureVetroAssemblyConnectionState, applyVetroAssemblyConnectionState, translateVetroConnectedAssemblies } from '../src/mepal/vetro/assembly/vetroAssemblyConnections.js';
import { previewVetroSystemSnap, connectVetroSystems } from '../src/mepal/vetro/system/vetroSystemConnections.js';
import { serializeVetroAssembly, serializeVetroSystem } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

async function makeLine() {
  const result = await createVetroSystem({ requestedWidthMm: 2700, heightMm: 2040, panelWidthsMm: [900, 900, 900] });
  assert.equal(result.success, true, result.reason);
  return result.object;
}

async function makeDoor(scene, x, z = 0, yaw = 0) {
  const frame = (await createVetroInstance({ config: { category: 'DOORS', productType: 'DOOR_FRAME', variant: 'SINGLE_WITHOUT_DUCT', nominalHeightCm: 204, finish: 'ANODIZED' } })).object;
  const leaf = (await createVetroInstance({ config: { category: 'DOORS', productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204 } })).object;
  scene.add(frame, leaf);
  const assembly = createVetroDoorAssembly({ frame, leaf, parent: scene }).object;
  assembly.position.set(x, 0, z);
  assembly.rotation.y = yaw;
  assembly.updateMatrixWorld(true);
  return { assembly, frame, leaf };
}

test('door snaps to either free line terminal, rotates from terminal direction, and moves as one root', async () => {
  const scene = new Group();
  const line = await makeLine(); scene.add(line);
  const { assembly, frame, leaf } = await makeDoor(scene, 1.35, -0.45, Math.PI / 2);
  const leafLocal = leaf.position.toArray();
  const candidate = previewVetroAssemblySnap(assembly, [line]);
  assert.equal(candidate?.sourceTerminalId, 'END');
  const result = connectVetroAssemblyToSystem({ assembly, system: line, preview: candidate });
  assert.equal(result.success, true, result.reason);
  assert.equal(result.relation.connectionType, 'DOOR_INTERFACE_PROVISIONAL');
  assert.equal(result.relation.kitSku, undefined);
  assert.equal(isVetroAssemblyConnectionAligned(assembly, result.relation, [line]), true);
  assert.ok(Math.abs(assembly.rotation.y) < 1e-9);
  assert.deepEqual(leaf.position.toArray(), leafLocal);
  assert.equal(frame.parent, assembly);
  line.position.x += 0.5;
  assert.deepEqual(translateVetroConnectedAssemblies([line], [assembly], [0.5, 0, 0]), [assembly]);
  line.updateMatrixWorld(true); assembly.updateMatrixWorld(true);
  assert.equal(isVetroAssemblyConnectionAligned(assembly, result.relation, [line]), true);
  const left = await makeDoor(scene, -1.3);
  const leftCandidate = previewVetroAssemblySnap(left.assembly, [line], [assembly, left.assembly]);
  assert.equal(leftCandidate?.sourceTerminalId, 'START');
  assert.equal(connectVetroAssemblyToSystem({ assembly: left.assembly, system: line, preview: leftCandidate, assemblies: [assembly, left.assembly] }).success, true);
});

test('occupied system terminal rejects another system or door, then disconnect frees it', async () => {
  const scene = new Group();
  const line = await makeLine(); scene.add(line);
  const { assembly } = await makeDoor(scene, 1.77);
  const relation = connectVetroAssemblyToSystem({ assembly, system: line }).relation;
  const second = await makeDoor(scene, 1.77);
  assert.equal(previewVetroAssemblySnap(second.assembly, [line], [assembly, second.assembly]), null);
  const otherLine = await makeLine(); otherLine.position.x = 2.7; scene.add(otherLine);
  const systemPreview = previewVetroSystemSnap(line, [otherLine], { additionalRelations: getVetroAssemblyRelations([assembly]) });
  assert.equal(systemPreview, null);
  const stalePreview = { sourceSystemId: line.userData.systemId, targetSystemId: otherLine.userData.systemId,
    sourceTerminalId: 'END', targetTerminalId: 'START', type: 'JOIN_180', deltaWorld: [0, 0, 0] };
  assert.equal((await connectVetroSystems({ source: line, target: otherLine, preview: stalePreview })).reason, 'VETRO_TERMINAL_OCCUPIED_BY_ASSEMBLY');
  assert.equal(disconnectVetroAssemblyFromSystem(assembly, relation.connectionId), true);
  assert.equal(previewVetroAssemblySnap(second.assembly, [line], [assembly, second.assembly])?.sourceTerminalId, 'END');
});

test('connect and disconnect replay through global history and survive serialization', async () => {
  const scene = new Group();
  const line = await makeLine(); scene.add(line);
  const { assembly } = await makeDoor(scene, 1.76);
  const history = createHistoryManager({ replayAction: (action, direction) =>
    applyVetroAssemblyConnectionState(assembly, direction === 'undo' ? action.before : action.after) });
  const before = captureVetroAssemblyConnectionState(assembly);
  const connected = connectVetroAssemblyToSystem({ assembly, system: line });
  assert.equal(connected.success, true);
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_ASSEMBLY_CONNECTION, before, after: captureVetroAssemblyConnectionState(assembly) });
  await history.undo();
  assert.equal(assembly.userData.externalConnections.length, 0);
  await history.redo();
  assert.equal(assembly.userData.externalConnections.length, 1);
  const saved = serializeVetroAssembly(assembly);
  const savedLine = serializeVetroSystem(line);
  const loadedLine = (await createVetroSystem(savedLine)).object;
  const loaded = await createVetroAssemblyFromEntity(saved);
  assert.equal(loaded.success, true, loaded.reason);
  const loadedScene = new Group(); loadedScene.add(loadedLine, loaded.object);
  assert.equal(loaded.object.userData.externalConnections[0].connectionId, connected.relation.connectionId);
  assert.equal(isVetroAssemblyConnectionAligned(loaded.object, loaded.object.userData.externalConnections[0], [loadedLine]), true);
  const beforeDisconnect = captureVetroAssemblyConnectionState(assembly);
  disconnectVetroAssemblyFromSystem(assembly, connected.relation.connectionId);
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_ASSEMBLY_CONNECTION, before: beforeDisconnect, after: captureVetroAssemblyConnectionState(assembly) });
  await history.undo();
  assert.equal(assembly.userData.externalConnections.length, 1);
  await history.redo();
  assert.equal(assembly.userData.externalConnections.length, 0);
  assert.equal(resolveVetroAssemblyConnectors(assembly).length, 2);
});

test('existing LINE/L/T terminal connections remain available', async () => {
  for (const shape of ['L', 'T']) {
    const scene = new Group();
    const line = await makeLine(); scene.add(line);
    const result = await createVetroSystem({ shape, requestedWidthMm: 1800, panelWidthsMm: [900, 900],
      returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 });
    assert.equal(result.success, true, result.reason);
    const target = result.object;
    target.position.x = 2.25;
    scene.add(target);
    assert.equal(previewVetroSystemSnap(line, [target])?.type, 'JOIN_180');
    assert.equal((await connectVetroSystems({ source: line, target })).success, true);
  }
  for (const shape of ['L', 'T']) {
    const scene = new Group();
    const create = async () => {
      const result = await createVetroSystem({ shape, requestedWidthMm: 1800, panelWidthsMm: [900, 900],
        returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 });
      assert.equal(result.success, true, result.reason);
      return result.object;
    };
    const first = await create();
    const second = await create();
    second.position.x = shape === 'L' ? -1.8 : 1.8;
    if (shape === 'L') second.rotation.y = Math.PI;
    scene.add(first, second);
    assert.equal(previewVetroSystemSnap(first, [second])?.type, 'JOIN_180');
    assert.equal((await connectVetroSystems({ source: first, target: second })).success, true);
  }
});
