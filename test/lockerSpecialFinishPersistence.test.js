import test from 'node:test';
import assert from 'node:assert/strict';
import { createLockerInstance } from '../src/mepal/lockers/factories/createLockerInstance.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { applyMaterialToObject3D, getVisualFinishIdentity } from '../src/materials/applyMaterial.js';
import { collectProjectSpecialFinishes, restoreProjectSpecialFinishes } from '../src/specialFinishes/specialFinishProjectState.js';
import { getMeshPathKey } from '../src/specialFinishes/meshPathKey.js';
import { snapshotSpecialFinish } from '../src/specialFinishes/specialFinishPersistence.js';

const finishId = '11111111-1111-4111-8111-111111111111';

test('LOCKERS RGB ALL conserva 39 mallas, rutas e identidad al serializar y reconstruir', async () => {
  const original = createLockerInstance({ config: { bayCount: 4 }, instanceId: 'LOCKER_TEST_1' }).object;
  const snapshot = snapshotSpecialFinish({ id: finishId, revision: 2, name: 'Rojo', type: 'RGB',
    rgb: { r: 255, g: 0, b: 16 } });
  applyMaterialToObject3D(original, null, { color: '#ff0010' }, { visualOnly: true,
    identity: { source: 'SPECIAL_FINISH', specialFinishId: finishId, revision: 2,
      snapshot, scope: 'ALL' } });
  const project = {
    entities: serializeProjectEntities([{ obj: original }]).entities,
    specialFinishes: collectProjectSpecialFinishes([{ obj: original }], getMeshPathKey),
  };
  assert.equal(project.entities.length, 1);
  assert.equal(project.specialFinishes.length, 39);
  assert.equal(new Set(project.specialFinishes.map((entry) => entry.meshPath)).size, 39);
  assert.ok(project.specialFinishes.every((entry) => entry.ownerInstanceId === 'LOCKER_TEST_1' &&
    entry.scope === 'ALL' && entry.specialFinishId === finishId && entry.revision === 2 &&
    entry.snapshot?.r === 255));

  const serialized = JSON.parse(JSON.stringify(project));
  assert.equal(serialized.specialFinishes.length, 39);
  assert.equal(serialized.entities[0].materialCode, undefined);
  const restored = await loadPersistedEntity(serialized.entities[0], {
    createLocker: (entity) => createLockerInstance({ config: entity.config,
      instanceId: entity.instanceId, transform: entity.transform }).object,
  });
  assert.equal(restored.userData.materialCode, 'LOCKER_METALICA_LISO');
  const failures = await restoreProjectSpecialFinishes(serialized, [{ obj: restored }], getMeshPathKey);
  assert.deepEqual(failures, []);
  const entries = collectProjectSpecialFinishes([{ obj: restored }], getMeshPathKey);
  assert.equal(entries.length, 39);
  assert.deepEqual(new Set(entries.map((entry) => entry.meshPath)),
    new Set(serialized.specialFinishes.map((entry) => entry.meshPath)));
  assert.ok(entries.every((entry) => entry.ownerInstanceId === 'LOCKER_TEST_1' &&
    entry.scope === 'ALL' && entry.specialFinishId === finishId && entry.revision === 2));
  let count = 0;
  restored.traverse((mesh) => {
    if (!mesh.isMesh) return;
    count++;
    assert.equal(mesh.material.color.getHexString(), 'ff0010');
    assert.equal(getVisualFinishIdentity(mesh).specialFinishId, finishId);
  });
  assert.equal(count, 39);
});

test('rutas de otras familias mantienen el formato anterior y el proyecto antiguo no requiere acabados', async () => {
  const other = createLockerInstance({ config: { bayCount: 4 } }).object;
  other.userData.kind = 'OTHER_PRODUCT';
  const hinges = other.getObjectByName('HINGES').children;
  assert.equal(getMeshPathKey(other, hinges[0]), getMeshPathKey(other, hinges[1]));
  assert.deepEqual(await restoreProjectSpecialFinishes({}, [{ obj: other }], getMeshPathKey), []);
});

test('LOCKERS guardado con rutas repetidas recupera los 39 acabados existentes', async () => {
  const original = createLockerInstance({ config: { bayCount: 4 }, instanceId: 'LOCKER_OLD_1' }).object;
  const snapshot = snapshotSpecialFinish({ id: finishId, revision: 1, name: 'Rojo', type: 'RGB',
    rgb: { r: 255, g: 0, b: 16 } });
  applyMaterialToObject3D(original, null, { color: '#ff0010' }, { visualOnly: true,
    identity: { source: 'SPECIAL_FINISH', specialFinishId: finishId, revision: 1,
      snapshot, scope: 'ALL' } });
  const oldPaths = (owner, mesh) => getMeshPathKey(owner, mesh, { legacyLockerNames: true });
  const oldEntries = collectProjectSpecialFinishes([{ obj: original }], oldPaths);
  assert.equal(oldEntries.length, 39);
  assert.equal(new Set(oldEntries.map((entry) => entry.meshPath)).size, 31);
  const restored = createLockerInstance({ config: { bayCount: 4 }, instanceId: 'LOCKER_OLD_1' }).object;
  const failures = await restoreProjectSpecialFinishes({ specialFinishes: oldEntries },
    [{ obj: restored }], getMeshPathKey);
  assert.deepEqual(failures, []);
  assert.equal(collectProjectSpecialFinishes([{ obj: restored }], getMeshPathKey).length, 39);
});
