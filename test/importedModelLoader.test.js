import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import * as THREE from 'three';

import {
  createImportedModelObject,
  detectImportedModelFormat,
  resolveImportedModelUnitScale,
  MAX_IMPORTED_MODEL_SIZE,
  validateImportedModelSize,
} from '../src/importers/importedModelLoader.js';
import { serializeEntity } from '../src/core/persistence/entitySerializers.js';

// FileLoader emite ProgressEvent en navegador; Node 20 no expone esa clase.
globalThis.ProgressEvent ||= class ProgressEvent {
  constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
};

test('detecta los formatos admitidos sin depender de mayúsculas', () => {
  assert.equal(detectImportedModelFormat('Silla.GLB'), 'glb');
  assert.equal(detectImportedModelFormat('matera.stl'), 'stl');
  assert.equal(detectImportedModelFormat('bloque.DXF'), 'dxf');
  assert.equal(detectImportedModelFormat('imagen.png'), null);
});

test('límite físico inclusivo de 50 MiB sin crear archivos grandes', () => {
  assert.equal(MAX_IMPORTED_MODEL_SIZE, 52_428_800);
  for (const mebibytes of [1, 49.9, 50]) {
    assert.equal(validateImportedModelSize(Math.floor(mebibytes * 1024 * 1024)), true);
  }
  for (const bytes of [MAX_IMPORTED_MODEL_SIZE + 1, 100 * 1024 * 1024,
    150 * 1024 * 1024, 200 * 1024 * 1024]) {
    assert.throws(() => validateImportedModelSize(bytes), /límite permitido de 50 MiB/);
  }
});

test('convierte las unidades seleccionadas a metros para formatos sin unidad', () => {
  assert.equal(resolveImportedModelUnitScale('mm', 'stl'), 0.001);
  assert.equal(resolveImportedModelUnitScale('cm', 'obj'), 0.01);
  assert.equal(resolveImportedModelUnitScale('m', 'dxf'), 1);
});

test('GLB y GLTF conservan la unidad estándar en metros', () => {
  assert.equal(resolveImportedModelUnitScale('mm', 'glb'), 1);
  assert.equal(resolveImportedModelUnitScale('cm', 'gltf'), 1);
});

function triangleGltf(binaryUri) {
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const binary = Buffer.from(vertices.buffer);
  return {
    binary,
    document: {
      asset: { version: '2.0' },
      scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      buffers: [{ byteLength: binary.length, ...(binaryUri ? { uri: binaryUri } : {}) }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3',
        min: [0, 0, 0], max: [1, 1, 0] }],
    },
  };
}

test('importa un GLTF embebido pequeño conservando su geometría', async () => {
  const { binary } = triangleGltf();
  const { document } = triangleGltf(`data:application/octet-stream;base64,${binary.toString('base64')}`);
  const dataUrl = `data:model/gltf+json;base64,${Buffer.from(JSON.stringify(document)).toString('base64')}`;
  const object = await createImportedModelObject({ dataUrl, format: 'gltf', fileName: 'triangulo.gltf' });
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.equal(size.x, 1);
  assert.equal(size.y, 1);
});

test('importa un GLB pequeño conservando su geometría', async () => {
  const { binary, document } = triangleGltf();
  const json = Buffer.from(JSON.stringify(document));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const glb = Buffer.alloc(12 + 8 + jsonLength + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  glb.fill(0x20, 20, 20 + jsonLength);
  json.copy(glb, 20);
  const binOffset = 20 + jsonLength;
  glb.writeUInt32LE(binary.length, binOffset);
  glb.writeUInt32LE(0x004e4942, binOffset + 4);
  binary.copy(glb, binOffset + 8);
  const object = await createImportedModelObject({
    dataUrl: `data:model/gltf-binary;base64,${glb.toString('base64')}`,
    format: 'glb', fileName: 'triangulo.glb',
  });
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.equal(size.x, 1);
  assert.equal(size.y, 1);
});

test('serializa el archivo y la escala necesarios para reconstruir un objeto importado', () => {
  const object = new THREE.Group();
  object.userData = {
    kind: 'IMPORTED_MODEL',
    instanceId: 'IMPORTED_1',
    codigoPT: 'IMPORTED_1',
    fileName: 'matera.stl',
    format: 'stl',
    unit: 'mm',
    assetDataUrl: 'data:model/stl;base64,AA==',
    bounds2d: { localCenter: [0, 0, 0], sizeLocal: [0.6, 0.7, 0.6] },
  };

  const entity = serializeEntity({ code: 'IMPORTED_1', obj: object });
  assert.equal(entity.kind, 'IMPORTED_MODEL');
  assert.equal(entity.metadata.fileName, 'matera.stl');
  assert.equal(entity.metadata.assetDataUrl, 'data:model/stl;base64,AA==');
  assert.deepEqual(entity.metadata.bounds2d.sizeLocal, [0.6, 0.7, 0.6]);
});

test('crea geometría STL y aplica milímetros como metros', async () => {
  const stl = [
    'solid test',
    'facet normal 0 0 1',
    'outer loop',
    'vertex 0 0 0',
    'vertex 1000 0 0',
    'vertex 0 1000 0',
    'endloop',
    'endfacet',
    'endsolid test',
  ].join('\n');
  const object = await createImportedModelObject({
    dataUrl: `data:model/stl;base64,${btoa(stl)}`,
    format: 'stl',
    unit: 'mm',
    fileName: 'test.stl',
  });
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.equal(size.x, 1);
  assert.equal(size.y, 1);
});

test('crea geometría OBJ con la escala seleccionada', async () => {
  const obj = ['v 0 0 0', 'v 100 0 0', 'v 0 100 0', 'f 1 2 3'].join('\n');
  const object = await createImportedModelObject({
    dataUrl: `data:text/plain,${encodeURIComponent(obj)}`,
    format: 'obj',
    unit: 'cm',
    fileName: 'test.obj',
  });
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.equal(size.x, 1);
  assert.equal(size.y, 1);
});
