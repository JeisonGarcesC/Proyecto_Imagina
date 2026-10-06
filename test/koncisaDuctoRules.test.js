import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveKoncisaDucto } from '../src/mepal/koncisaPlus/rules/koncisaDuctoRules.js';

test('ducto sencillo intermedio con grommet usa la familia 2KSO332000', () => {
  const result = resolveKoncisaDucto({
    tipoPuesto: 'sencillo',
    tipoModulo: 'intermedio',
    nominalWidthMm: 1200,
    accesoCableado: 'GROMMET',
  });

  assert.equal(result.codigoPT, '22000132412');
  assert.equal(result.modelSrc, '/assets/models/koncisaPlus/2KSO332000_120.glb');
});

test('ducto sencillo intermedio con pasacable conserva su modelo dedicado', () => {
  const result = resolveKoncisaDucto({
    tipoPuesto: 'sencillo',
    tipoModulo: 'intermedio',
    nominalWidthMm: 1200,
    accesoCableado: 'PASACABLE',
  });

  assert.equal(result.codigoPT, '22000136088');
  assert.equal(result.modelSrc, '/assets/models/koncisaPlus/2KSO367000_PASACABLE_120.glb');
});
