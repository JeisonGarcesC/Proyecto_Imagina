import test from 'node:test';
import assert from 'node:assert/strict';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';

test('fabrica crea entidad comercial sin geometria falsa ni pickable implicito', async () => {
  const result=await createVetroInstance({config:{category:'PANELS',productType:'PANEL',material:'TEMPERED_GLASS_10MM',nominalWidthCm:60,nominalHeightCm:204}});
  assert.equal(result.success,true); assert.equal(result.object.userData.codigoPT,'22000009775');
  assert.equal(result.object.userData.renderStatus,'ASSET_NOT_AVAILABLE');
  assert.equal(result.object.userData.hasVisual,false); assert.equal(result.object.children.length,0);
});
test('fabrica no crea objeto ni BOM potencial para combinacion no documentada', async () => {
  const result=await createVetroInstance({config:{category:'DOORS',subcategory:'DOOR_FRAME',productType:'DOOR_FRAME',variant:'DOUBLE_WITH_DUCT',nominalHeightCm:318,finish:'PAINTED'}});
  assert.equal(result.success,false); assert.equal(result.object,null); assert.equal(result.product.codeResolution.code,null);
});
