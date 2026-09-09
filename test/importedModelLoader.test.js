import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createImportedModelObject,
  detectImportedModelFormat,
  resolveImportedModelUnitScale,
} from '../src/importers/importedModelLoader.js';
import { serializeEntity } from '../src/core/persistence/entitySerializers.js';

test('detecta los formatos admitidos sin depender de mayúsculas', () => {
  assert.equal(detectImportedModelFormat('Silla.GLB'), 'glb');
  assert.equal(detectImportedModelFormat('matera.stl'), 'stl');
  assert.equal(detectImportedModelFormat('bloque.DXF'), 'dxf');
  assert.equal(detectImportedModelFormat('imagen.png'), null);
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
