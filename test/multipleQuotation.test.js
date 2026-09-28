import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleComposition } from '../src/mepal/multiple/definitions/MultipleComposition.js';
import { createMultipleQuotation } from '../src/mepal/multiple/quotation/multipleQuotation.js';
import { validateMultipleQuotation } from '../src/mepal/multiple/quotation/multipleQuotationRules.js';
import { resolveMultipleBOM } from '../src/mepal/multiple/bom/multipleBOM.js';

const product = (commercial) => { const composition = MultipleComposition.documented(90).toJSON(); return { config: { widthCm: 90, heightCm: 90, thicknessCm: 8, frameMode: 'HALF_HEIGHT', composition }, composition, diagnostics: [], parts: [{ componentKey: 'frame-0', componentRole: 'FRAME', commercial: { description: 'Marco', ...commercial }, visual: { materialRole: 'PAINTED_METAL' } }] }; };
test('cotización MULTIPLE calcula cantidades y valores documentados', () => {
  const quote = createMultipleQuotation(product({ code: '100', reference: 'MMA', price: 250000, currency: 'COP' }));
  assert.equal(quote.title, 'MULTIPLE_PANEL 90x90'); assert.equal(quote.total, 250000);
  assert.equal(quote.components[0].cantidad, 1); assert.equal(quote.status.complete, true);
});

test('reglas impiden cotizar componentes sin código o precio', () => {
  const input = product({ code: null, price: null }); const validation = validateMultipleQuotation(input, resolveMultipleBOM(input));
  assert.equal(validation.valid, false); assert.equal(validation.code, 'MULTIPLE_QUOTATION_INCOMPLETE');
  assert.deepEqual(validation.reasons, ['Componente sin código comercial', 'Componente sin precio disponible']);
});
