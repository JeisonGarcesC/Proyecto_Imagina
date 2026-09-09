import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBomExportQuantities } from '../src/utils/bomExportQuantities.js';

test('exporta la cantidad física acumulada para dos tipologías iguales', () => {
  assert.deepEqual(resolveBomExportQuantities(4, 2, true), {
    quantity: 4,
    typologies: 2,
    totalQuantity: 4,
  });
});

test('conserva las cantidades de una sola tipología', () => {
  assert.deepEqual(resolveBomExportQuantities(2, 1, true), {
    quantity: 2,
    typologies: 1,
    totalQuantity: 2,
  });
});

test('conserva la cantidad de elementos sin tipología', () => {
  assert.deepEqual(resolveBomExportQuantities(3, 0, false), {
    quantity: 3,
    typologies: 0,
    totalQuantity: 3,
  });
});
