import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { serializeProjectEntities, serializeVetroEntity } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';

const config={category:'ACCESSORIES',productType:'ACCESSORY',variant:'FLOATING_JOIN_180'};
test('serializa y despacha una entidad VETRO', async () => {
  const created=await createVetroInstance({config,transform:{position:[1,0,2]}});
  const entity=serializeVetroEntity(created.object);
  assert.equal(entity.kind,'VETRO_PRODUCT'); assert.equal(entity.codigoPT,'22000011010'); assert.deepEqual(entity.transform.position,[1,0,2]);
  let received=null;
  const restored=await loadPersistedEntity(entity,{createVetro(value){received=value;return {userData:{kind:'VETRO_PRODUCT'}};}});
  assert.equal(received.instanceId,entity.instanceId); assert.equal(restored.userData.kind,'VETRO_PRODUCT');
});
test('proyecto mixto conserva VETRO y otras entidades sin duplicar', async () => {
  const vetro=(await createVetroInstance({config})).object;
  const other=new THREE.Group(); other.userData={kind:'PART',code:'OTHER',codigoPT:'OTHER',instanceId:'OTHER'};
  const result=serializeProjectEntities([{code:vetro.userData.code,obj:vetro},{code:'OTHER',obj:other}]);
  assert.equal(result.entities.filter(x=>x.kind==='VETRO_PRODUCT').length,1);
  assert.equal(result.entities.some(x=>x.codigoPT==='OTHER'),true);
});
