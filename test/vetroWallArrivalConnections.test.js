import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { createVetroDoorAssemblyFromConfig } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { previewVetroAssemblySnap, getVetroAssemblyRelations } from '../src/mepal/vetro/assembly/vetroAssemblyConnections.js';
import { previewVetroSystemSnap, connectVetroSystems } from '../src/mepal/vetro/system/vetroSystemConnections.js';
import { resolveVetroConnectionPoints } from '../src/mepal/vetro/system/vetroConnectionPoints.js';
import { isVetroWallArrivalKit, getVetroWallArrivalRelations, previewVetroWallArrivalSnap, connectVetroWallArrivalToSystem, disconnectVetroWallArrival, isVetroWallArrivalAligned, captureVetroWallArrivalState, applyVetroWallArrivalState, translateVetroConnectedWallArrivals } from '../src/mepal/vetro/system/vetroWallArrivalConnections.js';
import { serializeVetroEntity, serializeVetroSystem } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

async function line() {
  const result = await createVetroSystem({ requestedWidthMm: 2700, heightMm: 2040, panelWidthsMm: [900, 900, 900] });
  assert.equal(result.success, true, result.reason);
  return result.object;
}

async function kit(x = 1.3) {
  const result = await createVetroInstance({ config: { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', nominalLengthCm: 204, finish: 'ANODIZED' } });
  assert.equal(result.success, true, result.reason);
  result.object.position.x = x;
  return result.object;
}

test('wall arrival snaps to a free terminal, follows its system and remains its own commercial product', async () => {
  const scene = new Group();
  const system = await line(); scene.add(system);
  const product = await kit(); scene.add(product);
  assert.equal(isVetroWallArrivalKit(product), true);
  assert.equal(product.userData.code, '22000017673');
  assert.equal(product.userData.shape2D?.semanticType, 'VETRO_PROFILE');
  const preview = previewVetroWallArrivalSnap(product, [system]);
  assert.equal(preview?.sourceTerminalId, 'END');
  const connected = connectVetroWallArrivalToSystem({ product, system, preview });
  assert.equal(connected.success, true, connected.reason);
  assert.equal(connected.relation.connectionType, 'WALL_ARRIVAL_TERMINATION');
  assert.equal(connected.relation.kitSku, undefined);
  assert.equal(isVetroWallArrivalAligned(product, connected.relation, [system]), true);
  const terminal = resolveVetroConnectionPoints(system).find((item) => item.id === 'END');
  assert.ok(product.getWorldPosition(new Vector3()).distanceTo(new Vector3(...terminal.position)) < 1e-9);
  system.position.x += 0.5;
  translateVetroConnectedWallArrivals([system], [product], [0.5, 0, 0]);
  assert.equal(isVetroWallArrivalAligned(product, connected.relation, [system]), true);
  const saved = serializeVetroEntity(product);
  const loaded = await createVetroInstance({ config: saved.config, instanceId: saved.instanceId, transform: saved.transform });
  loaded.object.userData.externalConnections = saved.externalConnections;
  const loadedSystem = (await createVetroSystem(serializeVetroSystem(system))).object;
  const loadedScene = new Group(); loadedScene.add(loadedSystem, loaded.object);
  assert.equal(isVetroWallArrivalAligned(loaded.object, saved.externalConnections[0], [loadedSystem]), true);
  assert.equal(saved.code, '22000017673');
  assert.equal(saved.externalConnections.length, 1);
});

test('start terminal turns the wall-facing side outward and rejects a different height', async () => {
  const scene = new Group();
  const system = await line(); scene.add(system);
  const product = await kit(-1.3); scene.add(product);
  const preview = previewVetroWallArrivalSnap(product, [system]);
  assert.equal(preview?.sourceTerminalId, 'START');
  assert.equal(connectVetroWallArrivalToSystem({ product, system, preview }).success, true);
  assert.equal(isVetroWallArrivalAligned(product, product.userData.externalConnections[0], [system]), true);
  const wrongHeight = await createVetroInstance({ config: { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', nominalLengthCm: 242, finish: 'ANODIZED' } });
  assert.equal(wrongHeight.success, true);
  wrongHeight.object.position.x = 1.35;
  scene.add(wrongHeight.object);
  assert.equal(previewVetroWallArrivalSnap(wrongHeight.object, [system], [product, wrongHeight.object]), null);
});

test('terminal occupation is shared with system and door connections; disconnect, undo and redo restore it', async () => {
  const scene = new Group();
  const system = await line(); scene.add(system);
  const product = await kit(1.35); scene.add(product);
  const before = captureVetroWallArrivalState(product);
  const connected = connectVetroWallArrivalToSystem({ product, system });
  assert.equal(connected.success, true);
  const history = createHistoryManager({ replayAction: (action, direction) =>
    applyVetroWallArrivalState(product, action[direction === 'undo' ? 'before' : 'after']) });
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_WALL_ARRIVAL_CONNECTION, before, after: captureVetroWallArrivalState(product) });
  assert.equal(getVetroWallArrivalRelations([product]).length, 1);
  const second = await kit(1.35); scene.add(second);
  assert.equal(previewVetroWallArrivalSnap(second, [system], [product, second]), null);
  const otherLine = await line(); otherLine.position.x = 2.7; scene.add(otherLine);
  assert.equal(previewVetroSystemSnap(system, [otherLine], { additionalRelations: getVetroWallArrivalRelations([product]) }), null);
  const door = await createVetroDoorAssemblyFromConfig({ category: 'DOORS', productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204 }, scene);
  door.object.position.x = 1.8;
  assert.equal(previewVetroAssemblySnap(door.object, [system], [door.object], { additionalRelations: getVetroWallArrivalRelations([product]) }), null);
  await history.undo();
  assert.equal(previewVetroWallArrivalSnap(second, [system], [product, second])?.sourceTerminalId, 'END');
  await history.redo();
  assert.equal(previewVetroWallArrivalSnap(second, [system], [product, second]), null);
  assert.equal(disconnectVetroWallArrival(product, connected.relation.connectionId), true);
  assert.equal(previewVetroWallArrivalSnap(second, [system], [product, second])?.sourceTerminalId, 'END');
  assert.equal(product.userData.code, '22000017673');
  assert.equal(product.userData.parentAssemblyId, undefined);
  const stalePreview = { sourceSystemId: system.userData.systemId, targetSystemId: otherLine.userData.systemId,
    sourceTerminalId: 'END', targetTerminalId: 'START', type: 'JOIN_180', deltaWorld: [0, 0, 0] };
  connectVetroWallArrivalToSystem({ product, system });
  assert.equal((await connectVetroSystems({ source: system, target: otherLine, preview: stalePreview })).reason,
    'VETRO_TERMINAL_OCCUPIED_BY_ASSEMBLY');
});
