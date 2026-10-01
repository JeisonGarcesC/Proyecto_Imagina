import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMultipleCode } from '../src/mepal/multiple/resolvers/multipleCodeResolver.js';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';

const entry = { codigoPT: '123', type: 'TILE', width: 90, height: 76, thickness: 1.5, material: 'FORMICA', finish: null, variant: null };
test('resolver MULTIPLE exige coincidencia comercial exacta', () => {
  assert.equal(resolveMultipleCode({ productType: 'tile', width: 90, height: 76, thickness: 1.5, material: 'formica', finish: null, variant: null }, [entry]).codigoPT, '123');
  const missing = resolveMultipleCode({ productType: 'TILE', width: 75, height: 76, thickness: 1.5, material: 'FORMICA' }, [entry]);
  assert.equal(missing.supported, false);
  assert.equal(missing.diagnostics[0].code, 'MULTIPLE_CODE_NOT_DOCUMENTED');
});

test('resolver MULTIPLE no elige entre coincidencias ambiguas', () => {
  const result = resolveMultipleCode({ productType: 'TILE', width: 90, height: 76, thickness: 1.5, material: 'FORMICA' }, [entry, { ...entry, codigoPT: '456' }]);
  assert.equal(result.codigoPT, null);
  assert.equal(result.diagnostics[0].code, 'MULTIPLE_AMBIGUOUS_COMMERCIAL_MATCH');
});

test('resolver MULTIPLE diferencia baldosa de tela por gama documentada', () => {
  const result = resolveMultipleCode({ productType: 'TILE', width: 90, height: 38, material: 'TELA', variant: 'GAMA_1' });
  assert.equal(result.supported, true); assert.equal(result.codigoPT, '22191200878');
});

test('builder resuelve la baldosa TELA GAMA 1 seleccionada en el editor', () => {
  const composition = { frameHeightCm: 90, baseboardHeightCm: 14, slots: [
    { slotKey: 'fabric-0', componentKey: 'fabric-0', type: 'TILE', tileType: 'FABRIC', variant: 'GAMA_1', heightCm: 38 },
    { slotKey: 'fabric-1', componentKey: 'fabric-1', type: 'TILE', tileType: 'FABRIC', variant: 'GAMA_1', heightCm: 38 },
  ] };
  const product = buildMultiple({ widthCm: 90, heightCm: 90, composition });
  const tiles = product.parts.filter((part) => part.componentRole === 'TILE_FABRIC');
  assert.equal(tiles.length, 2); assert.ok(tiles.every((tile) => tile.commercial.code === '22191200878'));
});
