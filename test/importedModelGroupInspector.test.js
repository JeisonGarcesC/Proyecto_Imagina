import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { createImportedModelGroupInspector, registerImportedGltfNodes } from '../src/importers/importedModelGroupInspector.js';

test('inspector conserva nodos y geometrías originales y atribuye grupos por índice GLTF', () => {
  const wrapper = new THREE.Group();
  const scene = new THREE.Group();
  const root = new THREE.Group(); root.name = 'root';
  const first = new THREE.Group(); first.name = 'Puesto candidato'; first.position.x = 5;
  const second = new THREE.Group(); second.name = 'Contexto';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3), new THREE.MeshBasicMaterial({ name: 'Madera' }));
  first.add(mesh); root.add(first, second); scene.add(root); wrapper.add(scene);
  registerImportedGltfNodes({ parser: { associations: new Map([
    [root, { type: 'nodes', index: 0 }], [first, { type: 'nodes', index: 1248 }],
    [mesh, { type: 'nodes', index: 1249 }], [second, { type: 'nodes', index: 2826 }],
  ]) } });
  const inspector = createImportedModelGroupInspector(wrapper);
  assert.deepEqual(inspector.groups.map((item) => item.id), [1248, 2826]);
  assert.equal(inspector.get(1248).meshes, 1);
  assert.equal(inspector.get(1248).triangles, 12);
  assert.deepEqual(inspector.get(1248).bounds.size, [2, 1, 3]);
  assert.deepEqual(inspector.ancestorsOf(mesh), [1249, 1248, 0]);
  assert.equal(inspector.object(1248), first);
  assert.deepEqual(inspector.meshDescendants(1248).map((item) => item.id), [1249]);
  assert.equal(inspector.compare(1248, 1248).directChildSimilarityPercent, 100);
  assert.equal(mesh.parent, first);
  assert.equal(mesh.material.name, 'Madera');
});

test('GLTFLoader entrega índices de nodos reales al inspector', async () => {
  const document = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: 'root', children: [1, 2] }, { name: 'grupo A' }, { name: 'grupo B' }] };
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(JSON.stringify(document), '', resolve, reject));
  registerImportedGltfNodes(gltf);
  const wrapper = new THREE.Group(); wrapper.add(gltf.scene);
  const inspector = createImportedModelGroupInspector(wrapper);
  assert.deepEqual(inspector.groups.map((group) => group.id), [1, 2]);
  assert.equal(inspector.get(1).path, 'Scene / 1');
});

test('familia estructural ignora orden de hijos y separa variantes de bounds', () => {
  const wrapper = new THREE.Group(), scene = new THREE.Group(), root = new THREE.Group();
  wrapper.add(scene); scene.add(root);
  const first = new THREE.Group(), second = new THREE.Group();
  const compact = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshBasicMaterial());
  const tiny = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const large = new THREE.Mesh(new THREE.BoxGeometry(200, 0.01, 200), new THREE.MeshBasicMaterial());
  const tinySecond = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  first.add(compact, tiny); second.add(tinySecond, large); root.add(first, second);
  registerImportedGltfNodes({ parser: { associations: new Map([
    [root, { nodes: 0 }], [first, { nodes: 1 }], [second, { nodes: 2 }],
    [compact, { nodes: 3 }], [tiny, { nodes: 4 }], [large, { nodes: 5 }], [tinySecond, { nodes: 6 }],
  ]) } });
  const inspector = createImportedModelGroupInspector(wrapper);
  assert.equal(inspector.get(1).structureHash, inspector.get(2).structureHash);
  assert.notEqual(inspector.get(1).signature, inspector.get(2).signature);
  assert.deepEqual(inspector.familyOf(1).memberIds, [1, 2]);
  assert.equal(inspector.familyOf(1).variants.length, 2);
  assert.equal(inspector.logicalCandidate(1).meshCount, 2);
  assert.deepEqual(inspector.logicalCandidate(1).childNodeIds, [3, 4]);
  assert.equal(inspector.compare(1, 2).exactStructure, true);
});
