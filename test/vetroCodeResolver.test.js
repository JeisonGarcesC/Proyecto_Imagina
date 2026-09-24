import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVetroProductCode } from '../src/mepal/vetro/resolvers/vetroProductCodeResolver.js';
import { resolveVetroProduct } from '../src/mepal/vetro/resolvers/vetroProductResolver.js';
import { resolveVetroPanelTrim, validateVetroDoorTrim } from '../src/mepal/vetro/rules/vetroTrimRules.js';

test('resuelve solamente coincidencia exacta documentada', () => {
  const result=resolveVetroProductCode({productType:'PANEL',material:'TEMPERED_GLASS_10MM',nominalWidthCm:60,nominalHeightCm:242});
  assert.deepEqual([result.supported,result.code],[true,'22000009776']);
});
test('codigo faltante no usa fallback de altura acabado o variante', () => {
  const result=resolveVetroProductCode({productType:'DOOR_FRAME',variant:'SINGLE_WITH_DUCT',nominalHeightCm:242,finish:'PAINTED'});
  assert.equal(result.supported,false); assert.equal(result.code,null); assert.equal(result.diagnostics[0].code,'VETRO_CODE_NOT_DOCUMENTED');
});
test('remate de panel factura nominal superior y puertas no rematan ancho', () => {
  assert.deepEqual(resolveVetroPanelTrim({requestedWidthCm:50,requestedHeightCm:230}),{supported:true,requestedWidthCm:50,requestedHeightCm:230,billingNominalWidthCm:60,billingNominalHeightCm:242});
  assert.equal(validateVetroDoorTrim({requestedWidthCm:85,nominalWidthCm:90,requestedHeightCm:230}).errors.includes('VETRO_DOOR_WIDTH_TRIM_NOT_ALLOWED'),true);
});
test('318 conserva codigo comercial y conflicto tecnico pendiente', () => {
  const result=resolveVetroProduct({productType:'DOOR_LEAF',category:'DOORS',subcategory:'DOOR_LEAF',variant:'SINGLE',nominalHeightCm:318});
  assert.equal(result.codeResolution.code,'22000010925');
  const conflict=result.diagnostics.find(x=>x.code==='VETRO_HEIGHT_280_318_CONFLICT');
  assert.equal(conflict.status,'PENDING_DEFINITION');
  assert.equal(Object.hasOwn(conflict,'allowed'),false); assert.equal(Object.hasOwn(conflict,'blocked'),false);
});
