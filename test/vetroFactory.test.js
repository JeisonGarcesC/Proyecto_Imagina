import test from 'node:test';
import assert from 'node:assert/strict';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';

test('fabrica crea entidad comercial con geometria nativa cuando no hay GLB', async () => {
  const result=await createVetroInstance({config:{category:'PANELS',productType:'PANEL',material:'TEMPERED_GLASS_10MM',nominalWidthCm:60,nominalHeightCm:204}});
  assert.equal(result.success,true); assert.equal(result.object.userData.codigoPT,'22000009775');
  assert.equal(result.object.userData.description,'PANEL VIDRIO TEMPLADO 10 MM 60X204CM VETRO VTPN020000');
  assert.equal(result.object.userData.renderStatus,'NATIVE_AVAILABLE');
  assert.equal(result.object.userData.hasVisual,true); assert.equal(result.object.userData.visualSource,'NATIVE');
  assert.ok(result.object.children.length>0);
});
test('fabrica conserva en la descripcion la variante, medida, acabado y referencia documentados', async () => {
  const result=await createVetroInstance({config:{category:'DOORS',subcategory:'DOOR_FRAME',productType:'DOOR_FRAME',variant:'SINGLE_WITHOUT_DUCT',nominalHeightCm:204,finish:'ANODIZED'}});
  assert.equal(result.success,true);
  assert.equal(result.object.userData.description,'MARCO PUERTA SENCILLA SIN DUCTO 90X204CM ANODIZADO VETRO VTMP030000');
});
test('fabrica no crea objeto ni BOM potencial para combinacion no documentada', async () => {
  const result=await createVetroInstance({config:{category:'DOORS',subcategory:'DOOR_FRAME',productType:'DOOR_FRAME',variant:'DOUBLE_WITH_DUCT',nominalHeightCm:318,finish:'PAINTED'}});
  assert.equal(result.success,false); assert.equal(result.object,null); assert.equal(result.product.codeResolution.code,null);
});
