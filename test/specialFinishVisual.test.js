import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyMaterialToMesh, applyMaterialToObject3D, getVisualFinishIdentity } from '../src/materials/applyMaterial.js';
import { loadTextureFromBlob, prepareSpecialFinishVisual, specialFinishVisualKey } from '../src/specialFinishes/specialFinishVisual.js';
import { resolveSpecialVisualTargets } from '../src/specialFinishes/resolveSpecialVisualTargets.js';

const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const identity = { source: 'SPECIAL_FINISH', specialFinishId: firstId, revision: 1 };
const rgb = (id, revision, channels = { r: 100, g: 50, b: 25 }) =>
  ({ id, revision, type: 'RGB', rgb: channels });

test('RGB usa colorUtils, mantiene identidad y caché por ID y revisión', async () => {
  const first = await prepareSpecialFinishVisual(rgb(firstId, 1));
  assert.ok(first.definition.color.isColor);
  assert.equal(first.identity.source, 'SPECIAL_FINISH');
  assert.equal(first.identity.specialFinishId, firstId);
  assert.equal(await prepareSpecialFinishVisual(rgb(firstId, 1)), first);
  const other = await prepareSpecialFinishVisual(rgb(secondId, 1));
  const revised = await prepareSpecialFinishVisual(rgb(firstId, 2, { r: 0, g: 0, b: 255 }));
  assert.notEqual(first, other);
  assert.notEqual(first, revised);
  assert.notEqual(specialFinishVisualKey(rgb(firstId, 1)), specialFinishVisualKey(rgb(firstId, 2)));
});

test('TEXTURE obtiene recurso autenticado mediante adaptador y no repite descarga', async () => {
  const finish = { id: secondId, revision: 3, type: 'TEXTURE', asset: { id: 'asset-3', version: 1 } };
  let downloads = 0;
  let decodes = 0;
  const options = { fetchTexture: async (id) => { assert.equal(id, 'asset-3'); downloads++; return new Blob(['image']); },
    decodeTexture: async () => { decodes++; return new THREE.Texture(); } };
  const first = await prepareSpecialFinishVisual(finish, options);
  const second = await prepareSpecialFinishVisual(finish, options);
  assert.equal(first, second);
  assert.equal(downloads, 1);
  assert.equal(decodes, 1);
  assert.equal(first.identity.assetId, 'asset-3');
  assert.ok(first.definition.mapTexture.isTexture);
});

test('URL temporal se libera tanto al cargar como al fallar la textura', async (t) => {
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const revoked = [];
  URL.createObjectURL = () => 'blob:temporary';
  URL.revokeObjectURL = (url) => revoked.push(url);
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  const texture = await loadTextureFromBlob(new Blob(['image']), { loadAsync: async () => new THREE.Texture() });
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  await assert.rejects(() => loadTextureFromBlob(new Blob(['bad']), { loadAsync: async () => { throw new Error('decode'); } }));
  assert.deepEqual(revoked, ['blob:temporary', 'blob:temporary']);
});

test('modo visual reutiliza aplicación existente sin escribir materialCode ni alterar selección', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#888888' }));
  root.add(mesh);
  root.userData.materialCode = 'CORPORATE_ROOT';
  mesh.userData.materialCode = 'CORPORATE_PART';
  const selected = [mesh.uuid];
  applyMaterialToMesh(mesh, null, { color: '#ff0000' }, { visualOnly: true, identity });
  assert.equal(mesh.userData.materialCode, 'CORPORATE_PART');
  assert.equal(mesh.material.color.getHexString(), 'ff0000');
  assert.deepEqual(getVisualFinishIdentity(mesh), identity);
  applyMaterialToObject3D(root, null, { color: '#0000ff' }, { visualOnly: true, identity });
  assert.equal(root.userData.materialCode, 'CORPORATE_ROOT');
  assert.equal(mesh.userData.materialCode, 'CORPORATE_PART');
  assert.equal(mesh.material.color.getHexString(), '0000ff');
  assert.deepEqual(selected, [mesh.uuid]);
  applyMaterialToMesh(mesh, 'CORPORATE_NEW', { color: '#00ff00' });
  assert.equal(mesh.userData.materialCode, 'CORPORATE_NEW');
  assert.equal(getVisualFinishIdentity(mesh), null);
  applyMaterialToObject3D(root, null, { color: '#000000' }, { visualOnly: true, identity });
  applyMaterialToObject3D(root, null, null);
  assert.equal(getVisualFinishIdentity(root), null);
  assert.equal(getVisualFinishIdentity(mesh), null);
});

test('definición de textura utiliza mapTexture ya cargada sin URL persistente', () => {
  const mapTexture = new THREE.Texture();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  applyMaterialToMesh(mesh, null, { color: '#ffffff', mapTexture }, { visualOnly: true, identity });
  assert.equal(mesh.material.map, mapTexture);
  assert.equal(mesh.userData.materialCode, undefined);
});

test('resolutor conserva Parte y Objeto y trata KUO y LINK por sus componentes', () => {
  const root = new THREE.Group();
  const component = new THREE.Group();
  component.userData.componentKey = 'TOP';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  root.add(component);
  component.add(mesh);
  const common = { activePart: root, activeSubMesh: mesh, editablePart: root,
    usesKuoAVPropertyFinishes: () => false, getKuoAVSurfaceTargets: () => [],
    getLinkRoot: () => null, getFinishGroupTargets: () => [component], isSurfaceEdgeMesh: () => false };
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'PART' }), [{ object: mesh, meshOnly: true }]);
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'ALL' }), [{ object: root }]);
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'GROUP' }), [{ object: component }]);
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'PART', getLinkRoot: () => root }), [{ object: component }]);
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'ALL', getLinkRoot: () => root }), [{ object: root }]);
  assert.deepEqual(resolveSpecialVisualTargets({ ...common, scope: 'PART',
    usesKuoAVPropertyFinishes: () => true, getKuoAVSurfaceTargets: () => [component] }), [{ object: component }]);
});

test('canto de superficie sigue aplicándose a todos los cantos, sin tocar tablero', () => {
  const root = new THREE.Group();
  root.userData.kind = 'SURFACE';
  const edges = [0, 1].map(() => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  edges.forEach((edge) => { edge.userData.subKey = 'canto'; root.add(edge); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  root.add(board);
  const targets = resolveSpecialVisualTargets({ activePart: root, activeSubMesh: edges[0], editablePart: root,
    scope: 'PART', usesKuoAVPropertyFinishes: () => false, getKuoAVSurfaceTargets: () => [],
    getLinkRoot: () => null, getFinishGroupTargets: () => [],
    isSurfaceEdgeMesh: (node) => node?.userData?.subKey === 'canto' });
  assert.deepEqual(targets.map(({ object }) => object), edges);
  assert.ok(targets.every(({ meshOnly }) => meshOnly));
});
