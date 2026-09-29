import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleCommercialSummary } from '../src/mepal/multiple/quotation/multipleCommercialSummary.js';

test('resumen comercial nace del BOM y enumera pendientes', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90 }); const summary = createMultipleCommercialSummary(product);
  assert.equal(summary.product, 'MULTIPLE'); assert.equal(summary.configuration.width, 90);
  assert.equal(summary.components.length, product.parts.filter((part) => part.commercial.includeInBOM !== false).length);
  assert.equal(summary.status.complete, false); assert.ok(summary.status.pendingComponents.length > 0);
});

test('resumen agrupa cantidades y calcula subtotales', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 166 });
  product.parts = [{ componentKey: 'a', componentRole: 'TILE_FORMICA', commercial: { code: '1', reference: 'R', description: 'Baldosa', price: 100, currency: 'COP' }, visual: { materialRole: 'FORMICA' } }, { componentKey: 'b', componentRole: 'TILE_FORMICA', commercial: { code: '1', reference: 'R', description: 'Baldosa', price: 100, currency: 'COP' }, visual: { materialRole: 'FORMICA' } }];
  const summary = createMultipleCommercialSummary(product); assert.equal(summary.components[0].cantidad, 2);
  assert.equal(summary.components[0].subtotal, 200); assert.equal(summary.totals.total, 200);
});
