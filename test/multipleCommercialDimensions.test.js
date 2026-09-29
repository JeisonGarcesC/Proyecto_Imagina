import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleCommercialQuery } from '../src/mepal/multiple/resolvers/multipleCompositionResolver.js';

test('espesor visual de baldosa no participa en resolución comercial', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90 }); const tile = product.parts.find((part) => part.componentRole === 'TILE_FORMICA');
  const query = createMultipleCommercialQuery(tile, product);
  assert.equal(tile.visual.visualThicknessCm, 1.5); assert.equal(query.thickness, null);
  assert.ok(product.diagnostics.some((item) => item.code === 'MULTIPLE_VISUAL_DIMENSION_APPROXIMATION' && item.componentKey === tile.componentKey));
});

test('espesor comercial documentado sí participa en resolución', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90 }); const tile = product.parts.find((part) => part.componentRole === 'TILE_FORMICA');
  tile.commercial.commercialThickness = 2; assert.equal(createMultipleCommercialQuery(tile, product).thickness, 2);
});
