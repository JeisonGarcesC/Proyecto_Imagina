import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyMaterialToMesh, getVisualFinishIdentity, setVisualFinishIdentity }
  from '../src/materials/applyMaterial.js';
import { snapshotSpecialFinish, finishFromSnapshot }
  from '../src/specialFinishes/specialFinishPersistence.js';
import { collectProjectSpecialFinishes, restoreProjectSpecialFinishes }
  from '../src/specialFinishes/specialFinishProjectState.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const assetId = '33333333-3333-4333-8333-333333333333';
const path = (owner, mesh) => owner === mesh ? '' : mesh.name;
const makePart = () => {
  const owner = new THREE.Group();
  owner.userData.instanceId = 'PART_1';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.name = 'TOP';
  owner.add(mesh);
  return { owner, mesh, parts: [{ obj: owner }] };
};

test('RGB conserva canales, ID y revisión mediante JSON y restaura apariencia', async () => {
  const { mesh, parts } = makePart();
  const snapshot = snapshotSpecialFinish({ id, revision: 2, name: 'Rojo', type: 'RGB',
    rgb: { r: 255, g: 0, b: 16 } });
  applyMaterialToMesh(mesh, null, { color: '#ff0010' }, { visualOnly: true,
    identity: { source: 'SPECIAL_FINISH', specialFinishId: id, revision: 2, snapshot, scope: 'PART' } });
  const entries = JSON.parse(JSON.stringify(collectProjectSpecialFinishes(parts, path)));
  assert.equal(entries[0].snapshot.r, 255);
  assert.equal(entries[0].snapshot.b, 16);
  const recreated = makePart();
  const failures = await restoreProjectSpecialFinishes({ specialFinishes: entries }, recreated.parts, path);
  assert.deepEqual(failures, []);
  assert.equal(recreated.mesh.material.color.getHexString(), 'ff0010');
  assert.equal(getVisualFinishIdentity(recreated.mesh).revision, 2);
});

test('TEXTURE conserva solo referencia inmutable y restaura desde asset archivado', async () => {
  const { mesh, parts } = makePart();
  const snapshot = snapshotSpecialFinish({ id, revision: 1, name: 'Nogal Especial',
    type: 'TEXTURE', asset: { id: assetId, version: 1, url: 'blob:temporary' } });
  setVisualFinishIdentity(mesh, { source: 'SPECIAL_FINISH', specialFinishId: id,
    revision: 1, snapshot, scope: 'ALL', assetUrl: 'blob:temporary' });
  const entries = JSON.parse(JSON.stringify(collectProjectSpecialFinishes(parts, path)));
  const json = JSON.stringify(entries);
  assert.equal(json.includes('blob:'), false);
  assert.equal(json.includes('base64'), false);
  assert.equal(entries[0].snapshot.assetId, assetId);
  let requested = null;
  const recreated = makePart();
  const failures = await restoreProjectSpecialFinishes({ specialFinishes: entries }, recreated.parts, path, {
    prepareVisual: async (finish) => {
      requested = finish.asset.id;
      return { identity: { source: 'SPECIAL_FINISH', specialFinishId: id, revision: 1 },
        definition: { mapTexture: new THREE.Texture(), color: '#ffffff' } };
    },
  });
  assert.deepEqual(failures, []);
  assert.equal(requested, assetId);
  assert.ok(recreated.mesh.material.map.isTexture);
});

test('proyectos antiguos, recurso ausente, nombres repetidos y revisiones', async () => {
  const { parts } = makePart();
  assert.deepEqual(await restoreProjectSpecialFinishes({}, parts, path), []);
  const a = snapshotSpecialFinish({ id, revision: 1, name: 'Igual', type: 'RGB', rgb: { r: 1, g: 2, b: 3 } });
  const b = snapshotSpecialFinish({ id: otherId, revision: 1, name: 'Igual', type: 'RGB', rgb: { r: 4, g: 5, b: 6 } });
  const c = snapshotSpecialFinish({ id, revision: 2, name: 'Igual', type: 'RGB', rgb: { r: 7, g: 8, b: 9 } });
  assert.notDeepEqual(finishFromSnapshot(a), finishFromSnapshot(b));
  assert.notDeepEqual(finishFromSnapshot(a), finishFromSnapshot(c));
  const texture = snapshotSpecialFinish({ id, revision: 3, name: 'Falta', type: 'TEXTURE',
    asset: { id: assetId, version: 1 } });
  const failures = await restoreProjectSpecialFinishes({ specialFinishes: [{
    source: 'SPECIAL_FINISH', specialFinishId: id, revision: 3, snapshot: texture,
    ownerInstanceId: 'PART_1', meshPath: 'TOP',
  }] }, parts, path, { prepareVisual: async () => { throw new Error('404'); } });
  assert.equal(failures[0].reason, '404');
});

test('historial global revierte y reaplica el material de acabado', async () => {
  const { mesh } = makePart();
  const before = mesh.material;
  const after = new THREE.MeshStandardMaterial({ color: '#ff0000' });
  const history = createHistoryManager({ replayAction: (action, direction) => {
    mesh.material = direction === 'undo' ? action.before : action.after;
  } });
  mesh.material = after;
  history.pushAction({ type: HISTORY_ACTION_TYPES.APPLY_SPECIAL_FINISH, before, after });
  await history.undo();
  assert.equal(mesh.material, before);
  await history.redo();
  assert.equal(mesh.material, after);
});

test('assembly conserva identidad estable al guardar una pieza interna', async () => {
  const assembly = new THREE.Group();
  assembly.userData.instanceId = 'KONCISA_ASSEMBLY_1';
  const component = new THREE.Group();
  component.userData.instanceId = 'TEMP_COMPONENT_1';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.name = 'TOP';
  assembly.add(component);
  component.add(mesh);
  const snapshot = snapshotSpecialFinish({ id, revision: 1, name: 'Rojo', type: 'RGB',
    rgb: { r: 255, g: 0, b: 0 } });
  setVisualFinishIdentity(mesh, { source: 'SPECIAL_FINISH', specialFinishId: id,
    revision: 1, snapshot });
  const key = (owner, target) => {
    const segments = [];
    for (let node = target; node && node !== owner; node = node.parent) segments.unshift(node.name || 'GROUP');
    return segments.join('/');
  };
  const entries = collectProjectSpecialFinishes([{ obj: component }], key,
    [{ instanceId: 'KONCISA_ASSEMBLY_1' }]);
  assert.equal(entries[0].ownerInstanceId, 'KONCISA_ASSEMBLY_1');
  const failures = await restoreProjectSpecialFinishes({ specialFinishes: entries },
    [{ obj: component }], key);
  assert.deepEqual(failures, []);
});
