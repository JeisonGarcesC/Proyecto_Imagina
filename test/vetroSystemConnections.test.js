import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { getVetroSystemBOM } from '../src/mepal/vetro/bom/vetroSystemBOM.js';
import { previewVetroSystemSnap, connectVetroSystems, disconnectVetroSystems, restoreVetroSystemConnections, getVetroConnectedCluster, replayVetroConnectionState } from '../src/mepal/vetro/system/vetroSystemConnections.js';
import { serializeVetroSystem } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

async function line(widths, position = [0, 0, 0], rotationY = 0) {
  const result = await createVetroSystem({ requestedWidthMm: widths.reduce((a, b) => a + b, 0), heightMm: 2040, panelWidthsMm: widths });
  assert.equal(result.success, true, result.reason);
  result.object.position.fromArray(position);
  result.object.rotation.y = rotationY;
  result.object.updateMatrixWorld(true);
  return result.object;
}

test('Line + Line 180 connects with one commercial kit, disconnects and restores', async () => {
  const a = await line([900]);
  const b = await line([900], [0.9, 0, 0]);
  const scene = new Group(); scene.add(a, b);
  const preview = previewVetroSystemSnap(a, [b]);
  assert.equal(preview?.type, 'JOIN_180');
  const parts = [];
  const first = await connectVetroSystems({ source: a, target: b, preview, partsRegistry: parts });
  assert.equal(first.success, true, first.reason);
  assert.equal(getVetroSystemBOM(a).find((row) => row.code === '22000009791')?.quantity, 1);
  assert.deepEqual(getVetroConnectedCluster(a, [a, b]).map((item) => item.userData.systemId).sort(), [a.userData.systemId, b.userData.systemId].sort());
  assert.equal(previewVetroSystemSnap(a, [b]), null);
  const savedA = serializeVetroSystem(a);
  const savedB = serializeVetroSystem(b);
  assert.equal(disconnectVetroSystems(a, first.relation.connectionId, parts), true);
  assert.equal(getVetroSystemBOM(a).some((row) => row.code === '22000009791'), false);
  assert.equal(parts.length, 0);
  const second = await connectVetroSystems({ source: a, target: b, partsRegistry: parts });
  assert.equal(second.success, true, second.reason);
  assert.equal(getVetroSystemBOM(a).find((row) => row.code === '22000009791')?.quantity, 1);
  const restoredA = (await createVetroSystem(savedA)).object;
  const restoredB = (await createVetroSystem(savedB)).object;
  const restoredScene = new Group(); restoredScene.add(restoredA, restoredB);
  const restored = await restoreVetroSystemConnections([restoredA, restoredB], []);
  assert.equal(restored.length, 1);
  assert.equal(getVetroSystemBOM(restoredA).find((row) => row.code === '22000009791')?.quantity, 1);
  restoredA.position.x += 1;
  restoredB.position.x += 1;
  const movedA = serializeVetroSystem(restoredA);
  const movedB = serializeVetroSystem(restoredB);
  const reloadedA = (await createVetroSystem(movedA)).object;
  const reloadedB = (await createVetroSystem(movedB)).object;
  const movedScene = new Group(); movedScene.add(reloadedA, reloadedB);
  assert.equal((await restoreVetroSystemConnections([reloadedA, reloadedB], [])).length, 1);
});

test('Line + Line 90 and T resolve distinct kits', async () => {
  const source90 = await line([900]);
  const target90 = await line([900], [0.45, 0, 0.45], -Math.PI / 2);
  const scene = new Group(); scene.add(source90, target90);
  assert.equal(previewVetroSystemSnap(source90, [target90])?.type, 'JOIN_90');
  assert.equal((await connectVetroSystems({ source: source90, target: target90 })).success, true);
  assert.equal(getVetroSystemBOM(source90).find((row) => row.code === '22000009792')?.quantity, 1);
  const targetT = await line([900, 900]);
  const sourceT = await line([900], [0, 0, 0.45], -Math.PI / 2);
  const sceneT = new Group(); sceneT.add(targetT, sourceT);
  assert.equal(previewVetroSystemSnap(sourceT, [targetT])?.type, 'JOIN_T');
  assert.equal((await connectVetroSystems({ source: sourceT, target: targetT })).success, true);
  assert.equal(getVetroSystemBOM(sourceT).find((row) => row.code === '22000009793')?.quantity, 1);
});

test('Line + L and L + L use available terminal points without merging roots', async () => {
  const first = await line([900]);
  const l1 = (await createVetroSystem({ shape: 'L', requestedWidthMm: 900, panelWidthsMm: [900], returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 })).object;
  l1.position.set(0.9, 0, 0);
  const scene = new Group(); scene.add(first, l1);
  assert.equal(previewVetroSystemSnap(first, [l1])?.type, 'JOIN_180');
  assert.equal((await connectVetroSystems({ source: first, target: l1 })).success, true);
  const l2 = (await createVetroSystem({ shape: 'L', requestedWidthMm: 900, panelWidthsMm: [900], returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 })).object;
  l2.position.set(1.8, 0, 1.8);
  l2.rotation.y = Math.PI;
  scene.add(l2);
  const preview = previewVetroSystemSnap(l1, [l2]);
  assert.ok(preview);
  assert.notEqual(l1.userData.systemId, l2.userData.systemId);
});

test('a structural T exposes three terminals and never reuses its occupied central join', async () => {
  const t = (await createVetroSystem({ shape: 'T', requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 900, returnPanelWidthsMm: [900], heightMm: 2040 })).object;
  const { resolveVetroConnectionPoints } = await import('../src/mepal/vetro/system/vetroConnectionPoints.js');
  const points = resolveVetroConnectionPoints(t);
  assert.deepEqual(points.filter((point) => point.kind === 'TERMINAL').map((point) => point.id), ['START', 'END', 'BRANCH_END']);
  assert.equal(points.some((point) => point.kind === 'SEAM' && Math.abs(point.position[0]) < 1e-9), false);
  const far = await line([900], [5, 0, 5]);
  assert.equal(previewVetroSystemSnap(far, [t]), null);
});

test('global history replays connect, disconnect, undo and redo with BOM synchronization', async () => {
  const source = await line([900]);
  const target = await line([900], [0.9, 0, 0]);
  const scene = new Group(); scene.add(source, target);
  const registry = [];
  const history = createHistoryManager({ replayAction: async (action, direction) => {
    await replayVetroConnectionState({ source, target, relation: action.relation, state: direction === 'undo' ? action.before : action.after, partsRegistry: registry });
  } });
  const beforePosition = source.position.toArray();
  const connected = await connectVetroSystems({ source, target, partsRegistry: registry });
  assert.equal(connected.success, true, connected.reason);
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_SYSTEM_CONNECTION, relation: connected.relation,
    before: { connected: false, position: beforePosition }, after: { connected: true, position: source.position.toArray() } });
  assert.equal(getVetroSystemBOM(source).find((row) => row.code === '22000009791')?.quantity, 1);
  await history.undo();
  assert.equal(getVetroSystemBOM(source).some((row) => row.code === '22000009791'), false);
  await history.redo();
  assert.equal(getVetroSystemBOM(source).find((row) => row.code === '22000009791')?.quantity, 1);
  disconnectVetroSystems(source, connected.relation.connectionId, registry);
  history.pushAction({ type: HISTORY_ACTION_TYPES.VETRO_SYSTEM_CONNECTION, relation: connected.relation,
    before: { connected: true, position: source.position.toArray() }, after: { connected: false, position: source.position.toArray() } });
  await history.undo();
  assert.equal(getVetroSystemBOM(source).find((row) => row.code === '22000009791')?.quantity, 1);
  await history.redo();
  assert.equal(getVetroSystemBOM(source).some((row) => row.code === '22000009791'), false);
  assert.equal(registry.length, 0);
});
