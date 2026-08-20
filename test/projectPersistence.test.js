import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { buildVersionedProject } from '../src/core/persistence/projectPersistence.js';
import { createCritterium8Instance } from '../src/mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../src/mepal/critterium8/integration/critterium8Registration.js';

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

async function createRegisteredCritterium(config, identity = {}) {
  const scene = new THREE.Scene();
  const parts = [];
  const pickables = [];
  const instance = await createCritterium8Instance({ ...config, ...identity });
  registerCritterium8Instance({ instance, parent: scene, partsRegistry: parts, pickables });
  return { instance, parts, pickables, scene };
}

test('serializa Critterium 8 como una sola entidad lógica sin derivados', async () => {
  const { instance, parts } = await createRegisteredCritterium(
    {
      widthCm: 60,
      heightCm: 110,
      compositionMode: 'MODULAR',
      tiles: [
        { tileType: 'FORMICA' },
        { tileType: 'GLASS' },
        { tileType: 'FABRIC' },
      ],
    },
    { instanceId: 'C8_SAVE_1', assemblyId: 'C8_ASSEMBLY_1', groupId: 'C8_GROUP_1', frameId: 'C8_FRAME_1' }
  );
  instance.assembly.position.set(2, 0.5, -3);
  instance.assembly.rotation.y = Math.PI / 4;
  instance.assembly.scale.set(1.1, 1.1, 1.1);
  const { entities } = serializeProjectEntities(parts);
  assert.equal(entities.length, 1);
  const entity = entities[0];
  assert.equal(entity.kind, 'CRITTERIUM_8');
  assert.equal(entity.instanceId, 'C8_SAVE_1');
  assert.equal(entity.assemblyId, 'C8_ASSEMBLY_1');
  assert.equal(entity.groupId, 'C8_GROUP_1');
  assert.equal(entity.frameId, 'C8_FRAME_1');
  assert.equal(entity.config.tiles.length, 3);
  assert.equal('composition' in entity, false);
  assert.equal('layout' in entity, false);
  assert.equal('partsDefinition' in entity, false);
  assert.deepEqual(entity.transform.position, [2, 0.5, -3]);
  assert.doesNotThrow(() => JSON.stringify(entity));
});

test('persiste FULL_TILE, floor-to-ceiling y growth modules desde config', async () => {
  const full = await createRegisteredCritterium({ widthCm: 120, heightCm: 204, compositionMode: 'FULL_TILE', tiles: [{ tileType: 'FORMICA' }] }, { instanceId: 'C8_FULL' });
  const floor = await createRegisteredCritterium({ widthCm: 90, heightCm: 204, frameMode: 'FLOOR_TO_CEILING', projectHeightCm: 242 }, { instanceId: 'C8_FLOOR' });
  const growth = await createRegisteredCritterium({ widthCm: 60, heightCm: 90, growthModules: [{ index: 0 }] }, { instanceId: 'C8_GROWTH' });
  const { entities } = serializeProjectEntities([...full.parts, ...floor.parts, ...growth.parts]);
  assert.equal(entities.length, 3);
  assert.equal(entities.find((item) => item.instanceId === 'C8_FULL').config.compositionMode, 'FULL_TILE');
  assert.equal(entities.find((item) => item.instanceId === 'C8_FLOOR').config.projectHeightCm, 242);
  assert.equal(entities.find((item) => item.instanceId === 'C8_GROWTH').config.growthModules.length, 1);
});

test('dispatcher Critterium usa creator especializado y no catálogo', async () => {
  const expected = { userData: { kind: 'CRITTERIUM_8_ASSEMBLY' } };
  let received = null;
  let catalogCalls = 0;
  const object = await loadPersistedEntity(
    { kind: 'CRITTERIUM_8', instanceId: 'C8_LOAD', config: { widthCm: 90, heightCm: 128 } },
    {
      createCritterium8(entity) { received = entity; return expected; },
      addCatalogItem() { catalogCalls += 1; },
    }
  );
  assert.equal(object, expected);
  assert.equal(received.instanceId, 'C8_LOAD');
  assert.equal(catalogCalls, 0);
});

test('dos Critterium y productos mixtos conservan entidades independientes', async () => {
  const first = await createRegisteredCritterium({ widthCm: 90, heightCm: 128 }, { instanceId: 'C8_A' });
  const second = await createRegisteredCritterium({ widthCm: 120, heightCm: 204, compositionMode: 'FULL_TILE' }, { instanceId: 'C8_B' });
  const project = buildVersionedProject({
    parts: [...first.parts, ...second.parts, createPart('CLAK'), createPart('EDUK')],
    floor: {},
    camera: {},
    legacyParts: [],
  });
  assert.equal(project.schemaVersion, 2);
  assert.equal(project.entities.filter((item) => item.kind === 'CRITTERIUM_8').length, 2);
  assert.equal(project.entities.filter((item) => item.kind === 'CLAK').length, 1);
  assert.equal(project.entities.filter((item) => item.kind === 'EDUK').length, 1);
  assert.doesNotThrow(() => JSON.stringify(project));
});

test('config Critterium inválida propaga fallo especializado', async () => {
  await assert.rejects(
    loadPersistedEntity(
      { kind: 'CRITTERIUM_8', instanceId: 'C8_INVALID', config: { widthCm: 999, heightCm: 111 } },
      { createCritterium8: () => { const error = new Error('INVALID_FRAME_HEIGHT'); error.diagnostics = [{ code: 'INVALID_FRAME_HEIGHT' }]; throw error; } }
    ),
    /INVALID_FRAME_HEIGHT/
  );
});
