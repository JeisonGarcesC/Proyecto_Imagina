import test from 'node:test';
import assert from 'node:assert/strict';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';
import { buildMultipleSystem } from '../src/mepal/multiple/system/MultipleSystemBuilder.js';
import { resolveMultipleSystemBOM } from '../src/mepal/multiple/system/multipleSystemBOM.js';
import { createMultipleSystemQuotation } from '../src/mepal/multiple/quotation/multipleQuotation.js';
import { createMultipleConfigurationState } from '../src/mepal/multiple/configurator/multipleConfigurationState.js';

const config = () => createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
test('BOM del sistema agrupa filas de productos sin recorrer meshes', () => {
  const built = buildMultipleSystem(new MultipleSystem().addModule(config()).addModule(config()).layoutLinear());
  const bom = resolveMultipleSystemBOM(built.products); const individual = built.products[0].userData.bom;
  assert.equal(bom.rows.reduce((sum, row) => sum + row.quantity, 0), individual.reduce((sum, row) => sum + row.quantity, 0) * 2);
  assert.ok(bom.rows.every((row) => row.moduleIds.length === 2));
});

test('cotización del sistema conserva subtotales por módulo', () => {
  const built = buildMultipleSystem(new MultipleSystem().addModule(config()).addModule(config()).layoutLinear());
  const quotation = createMultipleSystemQuotation(built.object);
  assert.equal(quotation.modules.length, 2); assert.equal(quotation.total, quotation.modules.reduce((sum, module) => sum + module.quotation.total, 0));
  assert.equal(quotation.total, quotation.subtotals.modules + quotation.subtotals.doors + quotation.subtotals.accessories);
});
