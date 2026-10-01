import test from 'node:test';
import assert from 'node:assert/strict';
import { isMultipleFinishAllowed, resolveMultipleFinish } from '../src/mepal/multiple/catalog/multipleFinishCatalog.js';

test('acabados MULTIPLE se validan por material del componente', () => {
  assert.equal(isMultipleFinishAllowed('FORMICA', 'FORMICA_WHITE'), true);
  assert.equal(isMultipleFinishAllowed('GLASS', 'FORMICA_WHITE'), false);
  assert.equal(resolveMultipleFinish('GLASS', 'FORMICA_WHITE').diagnostics[0].code, 'MULTIPLE_FINISH_NOT_AVAILABLE');
});

test('acabado visual válido no inventa código comercial', () => {
  const result = resolveMultipleFinish('FORMICA', 'FORMICA_GRAY');
  assert.equal(result.supported, true);
  assert.equal(result.commercial, false);
  assert.equal(result.diagnostics[0].code, 'MULTIPLE_FINISH_CODE_NOT_DOCUMENTED');
});
