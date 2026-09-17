import test from 'node:test';
import assert from 'node:assert/strict';
import { VETRO_PANEL_CODE_CATALOG, VETRO_PANEL_WIDTHS } from '../src/mepal/vetro/catalog/panelCatalog.js';
import { VETRO_DOOR_LEAF_CODE_CATALOG } from '../src/mepal/vetro/catalog/doorLeafCatalog.js';
import { VETRO_DOOR_FRAME_CODE_CATALOG } from '../src/mepal/vetro/catalog/doorFrameCatalog.js';
import { VETRO_JUNCTION_KIT_CATALOG } from '../src/mepal/vetro/catalog/junctionKitCatalog.js';
import { VETRO_PROFILE_CODE_CATALOG } from '../src/mepal/vetro/catalog/profileCatalog.js';
import { VETRO_ACCESSORY_CATALOG } from '../src/mepal/vetro/catalog/accessoryCatalog.js';

test('catalogo de paneles conserva anchos nominales y reales', () => {
  assert.deepEqual(VETRO_PANEL_WIDTHS.map(({ nominalCm, realCm }) => [nominalCm, realCm]), [[30,29.7],[60,59.7],[75,74.7],[90,89.7],[120,119.7]]);
  assert.equal(VETRO_PANEL_CODE_CATALOG.length, 50);
});
test('variantes F100 comparten referencia y conservan matrices distintas', () => {
  const a=VETRO_PANEL_CODE_CATALOG.find(x=>x.material==='COMPACT_FORMICA_F100'&&x.nominalWidthCm===60&&x.nominalHeightCm===242);
  const b=VETRO_PANEL_CODE_CATALOG.find(x=>x.material==='COMPACT_BOARD_FORMICA_F100'&&x.nominalWidthCm===60&&x.nominalHeightCm===242);
  assert.equal(a.reference,'VTPN070000'); assert.equal(b.reference,'VTPN070000'); assert.notEqual(a.code,b.code);
});
test('naves sencillas y dobles tienen cuatro alturas documentadas', () => {
  assert.equal(VETRO_DOOR_LEAF_CODE_CATALOG.filter(x=>x.variant==='SINGLE').length,4);
  assert.equal(VETRO_DOOR_LEAF_CODE_CATALOG.find(x=>x.variant==='DOUBLE'&&x.nominalHeightCm===318).code,'22000032912');
});
test('marcos conservan acabados y celdas vacias', () => {
  assert.equal(VETRO_DOOR_FRAME_CODE_CATALOG.find(x=>x.variant==='SINGLE_WITHOUT_DUCT'&&x.nominalHeightCm===204&&x.finish==='PAINTED').code,'22000108459');
  assert.equal(VETRO_DOOR_FRAME_CODE_CATALOG.some(x=>x.variant==='SINGLE_WITH_DUCT'&&x.nominalHeightCm===242&&x.finish==='PAINTED'),false);
  assert.equal(VETRO_DOOR_FRAME_CODE_CATALOG.some(x=>x.variant==='DOUBLE_WITH_DUCT'&&x.nominalHeightCm===318),false);
});
test('kits perfiles y accesorios conservan codigos documentados', () => {
  assert.equal(VETRO_JUNCTION_KIT_CATALOG.length,3);
  assert.equal(VETRO_PROFILE_CODE_CATALOG.find(x=>x.variant==='SQUARE_COLUMN'&&x.finish==='PAINTED').code,'22000122199');
  assert.equal(VETRO_ACCESSORY_CATALOG.find(x=>x.variant==='DOOR_LOCK_REPLACEMENT').code,'22000026880');
});
