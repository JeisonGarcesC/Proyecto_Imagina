import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';

function vector(values) {
  return { toArray: () => [...values] };
}

function createPart(kind, overrides = {}) {
  const object = {
    uuid: `${kind}_UUID`,
    position: vector([1, 2, 3]),
    quaternion: vector([0, 0, 0, 1]),
    rotation: { x: 0.1, y: 0.2, z: 0.3 },
    scale: vector([1, 1, 1]),
    userData: {
      kind,
      codigoPT: `${kind}_CODE`,
      code: `${kind}_CODE`,
      instanceId: `${kind}_INSTANCE`,
      ...overrides,
    },
  };
  return { code: object.userData.codigoPT, obj: object };
}

test('serializa productos simples con identidad y quaternion', () => {
  const { entities, skipped } = serializeProjectEntities([createPart('CLAK')]);
  assert.equal(skipped.length, 0);
  assert.equal(entities[0].kind, 'CLAK');
  assert.equal(entities[0].instanceId, 'CLAK_INSTANCE');
  assert.deepEqual(entities[0].transform.quaternion, [0, 0, 0, 1]);
});

test('excluye Koncisa de la fase 2A', () => {
  const part = createPart('SURFACE', { groupId: 'KONCISA_PLUS_123' });
  const { entities, skipped } = serializeProjectEntities([part]);
  assert.equal(entities.length, 0);
  assert.equal(skipped.length, 0);
});

test('serializa una sola entidad lógica por assembly Koncisa', () => {
  const assembly = new THREE.Group();
  assembly.userData = {
    kind: 'KONCISA_PLUS_ASSEMBLY',
    instanceId: 'ASSEMBLY_1',
    groupId: 'GROUP_1',
    groupName: 'Puesto 1',
    layoutType: 'STANDARD',
    config: { layoutType: 'STANDARD', puestos: 1 },
  };
  const surface = new THREE.Object3D();
  surface.userData = {
    kind: 'SURFACE',
    type: 'superficie',
    codigoPT: 'SURFACE_1',
    groupId: 'GROUP_1',
    parentAssemblyId: 'ASSEMBLY_1',
    meta: { surfaceRole: 'MAIN' },
  };
  const beam = new THREE.Object3D();
  beam.userData = {
    kind: 'viga',
    type: 'viga',
    codigoPT: 'BEAM_1',
    groupId: 'GROUP_1',
    parentAssemblyId: 'ASSEMBLY_1',
    meta: { moduleIndex: 0 },
  };
  assembly.add(surface, beam);

  const { entities } = serializeProjectEntities([
    { code: 'SURFACE_1', obj: surface },
    { code: 'BEAM_1', obj: beam },
  ]);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].kind, 'KONCISA_PLUS');
  assert.equal(entities[0].assemblyId, 'ASSEMBLY_1');
  assert.equal(entities[0].recipe.diagnostics.componentCount, 2);
});

test('dispatcher usa el creator especializado y devuelve su objeto', async () => {
  const expected = { userData: {} };
  let receivedCode = null;
  const object = await loadPersistedEntity(
    { kind: 'EDUK', codigoPT: '220001' },
    {
      addEduk(code) {
        receivedCode = code;
        return expected;
      },
    }
  );
  assert.equal(receivedCode, '220001');
  assert.equal(object, expected);
});

test('dispatcher Koncisa no utiliza el catálogo genérico', async () => {
  const expected = { userData: { kind: 'KONCISA_PLUS_ASSEMBLY' } };
  let catalogCalls = 0;
  const object = await loadPersistedEntity(
    { kind: 'KONCISA_PLUS', codigoPT: 'ASSEMBLY_1', assemblyId: 'ASSEMBLY_1' },
    {
      createKoncisaPlus: () => expected,
      addCatalogItem: () => {
        catalogCalls += 1;
        return null;
      },
    }
  );
  assert.equal(object, expected);
  assert.equal(catalogCalls, 0);
});

test('un creator fallido no utiliza otro objeto como fallback', async () => {
  await assert.rejects(
    loadPersistedEntity(
      { kind: 'CLAK', codigoPT: 'INVALID' },
      { addClak: () => null }
    ),
    /CREATOR_DID_NOT_RETURN_OBJECT/
  );
});
