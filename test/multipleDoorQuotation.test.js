import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { resolveMultipleBOM } from '../src/mepal/multiple/bom/multipleBOM.js';
import { createMultipleQuotation } from '../src/mepal/multiple/quotation/multipleQuotation.js';

test('herrajes visuales están incluidos en el conjunto y no crean pendientes independientes', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' } });
  const hardware = product.parts.filter((part) => ['DOOR_HINGES', 'DOOR_HARDWARE'].includes(part.componentRole));
  assert.equal(hardware.length, 2); assert.ok(hardware.every((part) => part.commercial.includeInBOM === false));
  const bom = resolveMultipleBOM(product); assert.ok(bom.rows.every((row) => !['DOOR_HINGES', 'DOOR_HARDWARE'].includes(row.componentRole)));
  const quotation = createMultipleQuotation(product);
  assert.equal(quotation.status.pendingComponents.some((item) => /Bisagras|Herrajes/.test(item.descripcion)), false);
});
