import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMultipleBOM } from '../src/mepal/multiple/bom/multipleBOM.js';

test('BOM MULTIPLE agrupa descriptores comerciales iguales', () => {
  const commercial = { code: '123', reference: 'REF', description: 'Baldosa', material: 'FORMICA' };
  const result = resolveMultipleBOM({ parts: [
    { componentKey: 'tile-0', componentRole: 'TILE_FORMICA', commercial, visual: {} },
    { componentKey: 'tile-1', componentRole: 'TILE_FORMICA', commercial, visual: {} },
  ] });
  assert.equal(result.rows.length, 1); assert.equal(result.rows[0].quantity, 2);
  assert.equal(result.rows[0].codigoPT, '123'); assert.equal(result.status, 'COMPLETE');
});

test('BOM MULTIPLE explica códigos pendientes', () => {
  const result = resolveMultipleBOM({ parts: [{ componentKey: 'growth-0', componentRole: 'GROWTH_MODULE', commercial: { code: null, description: 'Crecimiento' }, visual: { materialRole: 'PAINTED_METAL' } }] });
  assert.equal(result.status, 'PARTIAL'); assert.equal(result.rows[0].pending, true);
  assert.equal(result.rows[0].reason, 'CODE_NOT_DOCUMENTED');
});
