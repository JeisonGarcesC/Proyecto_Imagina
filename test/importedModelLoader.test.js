import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import * as THREE from 'three';

import {
  createImportedModelObject,
  detectImportedModelFormat,
  ImportedModelImportCancelled,
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

test('GLTF sobredimensionado informa el límite sin sugerir cambiar la unidad', async () => {
  const binary = Buffer.from(new Float32Array([0, 0, 0, 1201, 0, 0, 0, 1, 0]).buffer);
  const { document } = triangleGltf(`data:application/octet-stream;base64,${binary.toString('base64')}`);
  document.accessors[0].max = [1201, 1, 0];
  const dataUrl = `data:model/gltf+json;base64,${Buffer.from(JSON.stringify(document)).toString('base64')}`;
  const previousInfo = console.info;
  console.info = () => {};
  try {
    await assert.rejects(createImportedModelObject({ dataUrl, format: 'gltf', unit: 'mm' }),
      /El modelo supera el límite máximo de 1000 m/);
  } finally {
    console.info = previousInfo;
  }
});

test('OBJ y STL conservan el rechazo de geometría superior a 1000 m', async () => {
  const obj = ['v 0 0 0', 'v 1001 0 0', 'v 0 1 0', 'f 1 2 3'].join('\n');
  const stl = [
    'solid test', 'facet normal 0 0 1', 'outer loop',
    'vertex 0 0 0', 'vertex 1001 0 0', 'vertex 0 1 0',
    'endloop', 'endfacet', 'endsolid test',
  ].join('\n');
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    await assert.rejects(createImportedModelObject({
      dataUrl: `data:text/plain,${encodeURIComponent(obj)}`, format: 'obj', unit: 'm',
    }), /Revisa la unidad seleccionada/);
    await assert.rejects(createImportedModelObject({
      dataUrl: `data:model/stl;base64,${btoa(stl)}`, format: 'stl', unit: 'm',
    }), /Revisa la unidad seleccionada/);
  } finally {
    console.warn = previousWarn;
  }
});

test('DXF conserva el rechazo de geometría superior a 1000 m', async () => {
  const dxf = [
    '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '1001', '21', '0',
    '0', 'ENDSEC', '0', 'EOF',
  ].join('\n');
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    await assert.rejects(createImportedModelObject({
      dataUrl: `data:application/dxf,${encodeURIComponent(dxf)}`, format: 'dxf', unit: 'm',
    }), /Revisa la unidad seleccionada/);
  } finally {
    console.warn = previousWarn;
  }
});

function ambiguousContextGltf() {
  const core = Buffer.from(new Float32Array([
    -150, -4, -200, 150, 4, 200, -150, 4, 200,
  ]).buffer);
  const floor = Buffer.from(new Float32Array([
    -500.5, -0.001, -500.5, 500.5, -0.001, -500.5,
    500.5, -0.001, 500.5, -500.5, -0.001, 500.5,
  ]).buffer);
  const ambiguous = Buffer.from(new Float32Array([
    -500.225, -0.001, -500.225, 500.225, -0.001, -500.225,
    500.225, -0.001, 500.225, -500.225, -0.001, 500.225,
  ]).buffer);
  const indices = Buffer.from(new Uint16Array([0, 1, 2, 0, 2, 3]).buffer);
  const chunks = [core, floor, indices, ambiguous, indices];
  let offset = 0;
  const bufferViews = chunks.map((chunk) => {
    const view = { buffer: 0, byteOffset: offset, byteLength: chunk.length };
    offset += chunk.length;
    return view;
  });
  const binary = Buffer.concat(chunks);
  const document = {
    asset: { version: '2.0' }, scene: 0,
    scenes: [{ nodes: Array.from({ length: 11 }, (_, index) => index) }],
    nodes: [
      { mesh: 0 },
      ...Array.from({ length: 8 }, (_, index) => ({ mesh: 1,
        translation: [Math.floor(index / 2) * 2, 0, Math.floor(index / 2) * 3] })),
      { mesh: 2 }, { mesh: 2 },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0 } }] },
      { primitives: [{ attributes: { POSITION: 1 }, indices: 2, material: 0 }] },
      { primitives: [{ attributes: { POSITION: 3 }, indices: 4, material: 1 }] },
    ],
    materials: [{ name: 'white floor' }, {}],
    buffers: [{ byteLength: binary.length, uri: `data:application/octet-stream;base64,${binary.toString('base64')}` }],
    bufferViews,
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-150, -4, -200], max: [150, 4, 200] },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC3', min: [-500.5, -0.001, -500.5], max: [500.5, -0.001, 500.5] },
      { bufferView: 2, componentType: 5123, count: 6, type: 'SCALAR' },
      { bufferView: 3, componentType: 5126, count: 4, type: 'VEC3', min: [-500.225, -0.001, -500.225], max: [500.225, -0.001, 500.225] },
      { bufferView: 4, componentType: 5123, count: 6, type: 'SCALAR' },
    ],
  };
  return `data:model/gltf+json;base64,${Buffer.from(JSON.stringify(document)).toString('base64')}`;
}

test('GLTF ambiguo espera confirmación y continúa con la geometría original', async () => {
  const dataUrl = ambiguousContextGltf();
  const previousInfo = console.info;
  console.info = () => {};
  let confirmed = 0;
  try {
    const object = await createImportedModelObject({
      dataUrl, format: 'gltf', unit: 'mm',
      confirmAmbiguous: async ({ totalBounds, validatedBounds, ambiguousCount }) => {
        confirmed++;
        assert.ok(totalBounds.size[0] > 1000);
        assert.ok(validatedBounds.size[0] > 1000);
        assert.equal(ambiguousCount, 2);
        return true;
      },
    });
    const meshes = [];
    object.traverse((child) => { if (child.isMesh) meshes.push(child); });
    assert.equal(confirmed, 1);
    assert.equal(meshes.length, 11);
    assert.equal(object.scale.x, 1);
    assert.equal(meshes.filter((mesh) => mesh.material.name === 'white floor').length, 8);
    assert.equal(meshes.filter((mesh) => !mesh.material.name).length, 3);
    assert.equal(meshes[1].geometry.attributes.position.count, 4);
  } finally {
    console.info = previousInfo;
  }
});

test('cancelación de GLTF ambiguo no devuelve objeto y reapertura no repregunta', async () => {
  const dataUrl = ambiguousContextGltf();
  const previousInfo = console.info;
  console.info = () => {};
  try {
    await assert.rejects(createImportedModelObject({
      dataUrl, format: 'gltf', confirmAmbiguous: async () => false,
    }), ImportedModelImportCancelled);
    const restored = await createImportedModelObject({
      dataUrl, format: 'gltf', restoring: true,
      confirmAmbiguous: async () => { throw new Error('No debe preguntar al reabrir.'); },
    });
    assert.equal(restored.scale.x, 1);
  } finally {
    console.info = previousInfo;
  }
});
