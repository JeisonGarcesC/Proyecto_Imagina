import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { createVetroSystem } from '../src/mepal/vetro/factories/createVetroSystem.js';
import { registerVetroSystem } from '../src/mepal/vetro/integration/vetroSystemRegistration.js';
import { getVetroSystemBOM } from '../src/mepal/vetro/bom/vetroSystemBOM.js';
import { connectVetroSystems } from '../src/mepal/vetro/system/vetroSystemConnections.js';
import { collectVetroDeletionConnections, detachVetroDeletionConnections, restoreVetroDeletionConnections } from '../src/mepal/vetro/system/vetroSystemDeletion.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const configurations = [
  { shape: 'LINE', requestedWidthMm: 900, panelWidthsMm: [900] },
  { shape: 'L', requestedWidthMm: 900, panelWidthsMm: [900], returnWidthMm: 900, returnPanelWidthsMm: [900] },
  { shape: 'T', requestedWidthMm: 1800, panelWidthsMm: [900, 900], returnWidthMm: 900, returnPanelWidthsMm: [900] },
];

for (const configuration of configurations) {
  test(`delete ${configuration.shape} removes root and all registered children; undo and redo restore state`, async () => {
    const scene = new Group(); const parts = []; const pickables = [];
    const instance = await createVetroSystem({ ...configuration, heightMm: 2040 });
    const root = registerVetroSystem({ instance, parent: scene, partsRegistry: parts, pickables });
    const savedRecords = [...parts];
    const history = createHistoryManager({ replayAction: (action, direction) => {
      if (direction === 'undo') { scene.add(root); parts.push(...savedRecords); pickables.push(root); }
      else { scene.remove(root); parts.length = 0; pickables.length = 0; }
    } });
    scene.remove(root); parts.length = 0; pickables.length = 0;
    history.pushAction({ type: HISTORY_ACTION_TYPES.DELETE, deletedObjects: [root] });
    assert.equal(serializeProjectEntities(parts).entities.some((entity) => entity.kind === 'VETRO_SYSTEM'), false);
    assert.equal(scene.children.length, 0);
    await history.undo();
    assert.equal(serializeProjectEntities(parts).entities.filter((entity) => entity.kind === 'VETRO_SYSTEM').length, 1);
    assert.equal(parts.length, savedRecords.length);
    await history.redo();
    assert.equal(scene.children.length, 0);
    assert.equal(parts.length, 0);
  });
}

test('deleting one connected system detaches only its relation and undo restores kit and BOM', async () => {
  const scene = new Group(); const parts = []; const pickables = [];
  const a = registerVetroSystem({ instance: await createVetroSystem({ requestedWidthMm: 900, panelWidthsMm: [900], heightMm: 2040 }), parent: scene, partsRegistry: parts, pickables });
  const b = registerVetroSystem({ instance: await createVetroSystem({ requestedWidthMm: 900, panelWidthsMm: [900], heightMm: 2040 }), parent: scene, partsRegistry: parts, pickables });
  b.position.x = 0.9;
  const connection = await connectVetroSystems({ source: b, target: a, partsRegistry: parts });
  assert.equal(connection.success, true, connection.reason);
  const snapshots = collectVetroDeletionConnections([a, b], [a.userData.systemId]);
  assert.equal(snapshots.length, 1);
  detachVetroDeletionConnections([a, b], snapshots, parts);
  const aRecords = parts.filter(({ obj }) => obj === a || obj.parent === a);
  const removeA = () => { scene.remove(a); for (let i = parts.length - 1; i >= 0; i--) if (aRecords.includes(parts[i])) parts.splice(i, 1); pickables.splice(pickables.indexOf(a), 1); };
  const restoreA = async () => { scene.add(a); parts.push(...aRecords); pickables.push(a); await restoreVetroDeletionConnections([a, b], snapshots, parts); };
  removeA();
  const history = createHistoryManager({ replayAction: async (_, direction) => {
    if (direction === 'undo') await restoreA();
    else { detachVetroDeletionConnections([a, b], snapshots, parts); removeA(); }
  } });
  history.pushAction({ type: HISTORY_ACTION_TYPES.DELETE, deletedObjects: [a], vetroConnections: snapshots });
  assert.equal(scene.children.length, 1);
  assert.equal(getVetroSystemBOM(b).some((row) => row.code === '22000009791'), false);
  const deletedSave = serializeProjectEntities(parts);
  assert.equal(deletedSave.entities.filter((entity) => entity.kind === 'VETRO_SYSTEM').length, 1);
  const reloadedB = await createVetroSystem(deletedSave.entities.find((entity) => entity.kind === 'VETRO_SYSTEM'));
  assert.equal(reloadedB.success, true, reloadedB.reason);
  assert.deepEqual(reloadedB.object.userData.externalConnections, []);
  assert.equal(getVetroSystemBOM(reloadedB.object).some((row) => row.code === '22000009791'), false);
  await history.undo();
  assert.equal(scene.children.length, 2);
  assert.equal(getVetroSystemBOM(b).find((row) => row.code === '22000009791')?.quantity, 1);
  await history.redo();
  assert.equal(scene.children.length, 1);
  assert.equal(getVetroSystemBOM(b).some((row) => row.code === '22000009791'), false);
  assert.equal(serializeProjectEntities(parts).entities.filter((entity) => entity.kind === 'VETRO_SYSTEM').length, 1);
});
