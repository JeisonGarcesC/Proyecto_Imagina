import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  analyzeImportedModelBounds,
  MAX_IMPORTED_MODEL_DIMENSION,
  resolveImportedModelBoundsDecision,
} from '../src/importers/importedModelBounds.js';

function project(width = 300, depth = 400, height = 8) {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial()));
  return scene;
}

function floor(scene, { size = 1001, width = size, depth = size, x = 0, z = 0,
  materialName = 'white floor', textured = false } = {}) {
  const material = new THREE.MeshStandardMaterial();
  material.name = materialName;
  if (textured) material.normalMap = new THREE.Texture();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, -0.001, z);
  scene.add(mesh);
  return mesh;
}

function floorPair(scene, options) {
  return [floor(scene, options), floor(scene, options)];
}

test('escena completa dentro de 1000 m se acepta sin exclusiones', () => {
  const analysis = analyzeImportedModelBounds(project());
  assert.equal(MAX_IMPORTED_MODEL_DIMENSION, 1000);
  assert.equal(analysis.decision, 'accept');
  assert.deepEqual(analysis.total.size, analysis.principal.size);
  assert.equal(analysis.context.length, 0);
});

test('contexto repetido con varias señales permite importar sin quitar geometría', () => {
  const scene = project();
  const original = [];
  for (let index = 0; index < 4; index++) {
    original.push(...floorPair(scene, { x: index * 2, z: index * 3 }));
  }
  const countBefore = scene.children.length;
  const analysis = analyzeImportedModelBounds(scene);
  assert.equal(analysis.decision, 'accept');
  assert.ok(analysis.total.size[0] > 1000);
  assert.deepEqual(analysis.principal.size, [300, 8, 400]);
  assert.equal(analysis.context.length, 8);
  assert.equal(analysis.ambiguous.length, 0);
  assert.equal(scene.children.length, countBefore);
  assert.ok(original.every((mesh) => mesh.parent === scene && mesh.visible));
});

test('proyecto arquitectónico de 3000 m conserva protección de escala', async () => {
  const analysis = analyzeImportedModelBounds(project(3000, 3000, 20));
  assert.equal(analysis.decision, 'scale');
  assert.equal(analysis.principal.size[0], 3000);
  let asked = false;
  assert.equal(await resolveImportedModelBoundsDecision(analysis, {
    confirm: async () => { asked = true; return true; },
  }), 'scale');
  assert.equal(await resolveImportedModelBoundsDecision(analysis, { restoring: true }), 'scale');
  assert.equal(asked, false);
});

test('cuatro pares de losas de 3000 m no se aceptan como fondo', () => {
  const scene = project();
  for (let index = 0; index < 4; index++) floorPair(scene, { size: 3000, x: index * 2 });
  const analysis = analyzeImportedModelBounds(scene);
  assert.equal(analysis.context.length, 0);
  assert.equal(analysis.ambiguous.length, 0);
  assert.equal(analysis.decision, 'scale');
});

test('una losa grande legítima no se clasifica solo por forma o nombre', () => {
  const scene = project();
  floorPair(scene, { size: 1200 });
  const analysis = analyzeImportedModelBounds(scene);
  assert.equal(analysis.context.length, 0);
  assert.equal(analysis.ambiguous.length, 2);
  assert.equal(analysis.decision, 'requires_confirmation');
});

test('un plano extenso sin nombre y con textura normal permanece ambiguo', () => {
  const scene = project();
  for (let index = 0; index < 4; index++) floorPair(scene, { x: index * 2, z: index * 3 });
  floorPair(scene, { size: 1000.45, materialName: '', textured: true });
  const analysis = analyzeImportedModelBounds(scene);
  assert.equal(analysis.context.length, 8);
  assert.equal(analysis.ambiguous.length, 2);
  assert.equal(analysis.decision, 'requires_confirmation');
  assert.ok(analysis.principal.size[0] > 1000);
});

test('distribución equivalente a SIESA conserva los 126 planos y separa la ambigüedad', () => {
  const scene = project(348.1866138212671, 471.80383302103195, 7.977999944239861);
  scene.children[0].position.set(88.70549832618288, 0.7740000579505862, -213.03499888712818);
  for (let index = 0; index < 4; index++) floorPair(scene, { size: 500, x: 20 + index, z: -130 });
  for (const [width, depth, x, z] of [
    [1000.9000244140625, 1000.9000244140625, -84.13241968224176, -37.07244603823335],
    [1006.5, 1001.4360656738284, 49.933305995654905, -59.14917220320663],
    [1001.4072570800781, 1003.5999450683596, 26.50287361027131, -136.65935450540292],
    [1000.9000244140625, 1000.9000244140625, -84.0756269941296, -31.779637930467175],
  ]) floorPair(scene, { width, depth, x, z });
  for (let index = 0; index < 50; index++) floorPair(scene, {
    size: 1001, x: 20 + index * 0.01, z: -100 + index * 0.01,
  });
  for (let index = 0; index < 4; index++) {
    floorPair(scene, { size: 1000.8, x: 20 + index * 0.5, z: -100 + index * 0.4,
      materialName: 'FONDO BLANCO' });
  }
  floorPair(scene, { size: 1000.45, x: 44.84156953271466, z: -98.48629556430592,
    materialName: '', textured: true });
  const analysis = analyzeImportedModelBounds(scene);
  assert.equal(analysis.renderableCount, 127);
  assert.equal(analysis.context.length, 124);
  assert.equal(analysis.ambiguous.length, 2);
  assert.equal(analysis.decision, 'requires_confirmation');
  assert.ok(Math.abs(analysis.total.size[0] - 1137.765737884928) < 0.02);
  assert.ok(Math.abs(analysis.total.size[1] - 7.977999944239861) < 0.02);
  assert.ok(Math.abs(analysis.total.size[2] - 1107.129701316147) < 0.02);
  assert.ok(Math.abs(analysis.principal.size[0] - 1000.45) < 0.02);
  assert.ok(Math.abs(analysis.principal.size[2] - 1000.45) < 0.02);
  assert.ok(Math.abs(analysis.principal.size[1] - 7.977999944239861) < 1e-6);
  assert.ok(Math.abs(analysis.estimatedPrincipal.size[0] - 348.1866138212671) < 1e-4);
  assert.ok(Math.abs(analysis.estimatedPrincipal.size[2] - 471.80383302103195) < 1e-4);
  assert.equal(scene.children.length, 127);
});

test('confirmación se limita a la operación y no altera los bounds ni la escena', async () => {
  const scene = project();
  for (let index = 0; index < 4; index++) floorPair(scene, { x: index * 2 });
  floorPair(scene, { size: 1000.45, materialName: '' });
  const analysis = analyzeImportedModelBounds(scene);
  const before = JSON.stringify(analysis.total);
  const childCount = scene.children.length;
  assert.equal(analysis.decision, 'requires_confirmation');
  assert.equal(await resolveImportedModelBoundsDecision(analysis, { confirm: async () => true }), 'confirmed');
  assert.equal(await resolveImportedModelBoundsDecision(analysis, { confirm: async () => false }), 'cancelled');
  assert.equal(await resolveImportedModelBoundsDecision(analysis), 'requires_confirmation');
  assert.equal(await resolveImportedModelBoundsDecision(analysis, { restoring: true }), 'restored');
  assert.equal(scene.children.length, childCount);
  assert.equal(JSON.stringify(analysis.total), before);
});
