import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createImportedModelGroupInspector, registerImportedGltfNodes } from '../src/importers/importedModelGroupInspector.js';
import { createImportedModelGroupSelectionIndex } from '../src/importers/importedModelGroupSelection.js';

test('índice resuelve cada mesh a su grupo sin duplicar ni modificar la escena', () => {
  const wrapper = new THREE.Group(), scene = new THREE.Group(), root = new THREE.Group();
  wrapper.add(scene); scene.add(root);
  const groups = [1248, 2826, 1112].map(() => new THREE.Group());
  const meshes = groups.map(() => new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshBasicMaterial()));
  groups.forEach((group, index) => { group.position.x = index * 4; group.add(meshes[index]); root.add(group); });
  registerImportedGltfNodes({ parser: { associations: new Map([
    [root, { nodes: 0 }], ...groups.map((group, index) => [group, { nodes: [1248, 2826, 1112][index] }]),
    ...meshes.map((mesh, index) => [mesh, { nodes: index + 3000 }]),
  ]) } });
  const inspector = createImportedModelGroupInspector(wrapper);
  const index = createImportedModelGroupSelectionIndex(inspector);
  assert.equal(index.meshCount, 3);
  assert.equal(index.resolveMesh(meshes[0]).selectable, false);
  assert.equal(index.markFamily(1248, 'candidate'), 3);
  assert.equal(index.resolveMesh(meshes[0]).group.id, 1248);
  assert.equal(index.resolveMesh(meshes[1]).group.id, 2826);
  assert.equal(index.resolveMesh(meshes[2]).group.id, 1112);
  assert.equal(index.resolveMesh(meshes[0]).selectable, true);
  assert.equal(index.mark(2826, 'discarded'), true);
  assert.equal(index.resolveMesh(meshes[1]).selectable, false);
  assert.equal(index.resolveMesh(new THREE.Mesh()), null);
  assert.equal(index.mark(9999, 'candidate'), false);
  assert.equal(meshes[0].parent, groups[0]);
  assert.equal(meshes[0].geometry, groups[0].children[0].geometry);
  assert.equal(wrapper.children[0].children[0].children.length, 3);
});

test('marca familiar usa variante exacta y deja fuera superficies extensas', () => {
  const wrapper = new THREE.Group(), scene = new THREE.Group(), root = new THREE.Group();
  wrapper.add(scene); scene.add(root);
  const groups = [1, 2, 3].map(() => new THREE.Group());
  const meshes = [2, 2, 200].map((width) => new THREE.Mesh(new THREE.BoxGeometry(width, 1, width), new THREE.MeshBasicMaterial()));
  groups.forEach((group, index) => { group.add(meshes[index]); root.add(group); });
  registerImportedGltfNodes({ parser: { associations: new Map([
    [root, { nodes: 0 }], ...groups.map((group, index) => [group, { nodes: index + 1 }]),
    ...meshes.map((mesh, index) => [mesh, { nodes: index + 10 }]),
  ]) } });
  const index = createImportedModelGroupSelectionIndex(createImportedModelGroupInspector(wrapper));
  assert.equal(index.markFamily(1, 'candidate'), 2);
  assert.equal(index.resolveMesh(meshes[1]).selectable, true);
  assert.equal(index.resolveMesh(meshes[2]).selectable, false);
});
