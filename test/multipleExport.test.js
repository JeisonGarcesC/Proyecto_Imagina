import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiple } from '../src/mepal/multiple/builders/MultipleBuilder.js';
import { createMultipleCommercialExport } from '../src/mepal/multiple/export/multipleExport.js';
import { createMultipleExcelData } from '../src/mepal/multiple/export/multipleExcelExport.js';
import { createMultiplePdfData } from '../src/mepal/multiple/export/multiplePdfExport.js';

test('exportación JSON comercial es independiente de persistencia interna', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90 });
  const output = createMultipleCommercialExport(product, { customer: { name: 'Cliente' }, generatedAt: '2026-09-25T00:00:00.000Z' });
  assert.equal(output.product, 'MULTIPLE'); assert.equal(output.customer.name, 'Cliente');
  assert.equal(output.generatedAt, '2026-09-25T00:00:00.000Z'); assert.equal(output.instanceId, undefined);
});

test('estructuras Excel y PDF contienen resumen, componentes y totales', () => {
  const product = buildMultiple({ widthCm: 90, heightCm: 90 });
  const excel = createMultipleExcelData(product); const pdf = createMultiplePdfData(product);
  assert.deepEqual(excel.sheets.map((sheet) => sheet.name), ['Resumen', 'Componentes']);
  assert.equal(pdf.documentType, 'MULTIPLE_COMMERCIAL_QUOTATION'); assert.deepEqual(pdf.totals, createMultipleCommercialExport(product).totals);
});
