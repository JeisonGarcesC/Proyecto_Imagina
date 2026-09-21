import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveKoncisaIntegrationCouple } from '../src/mepal/koncisaPlus/rules/koncisaIntegrationRules.js';

test('resuelve el acople a pared comercial disponible para Koncisa Plus', () => {
  const coupling = resolveKoncisaIntegrationCouple({ type: 'wall' });

  assert.equal(coupling.codigoPT, '22000132906');
  assert.equal(coupling.modelCode, '2KAC267000');
  assert.equal(coupling.modelSrc, '/assets/models/koncisaPlus/2KAC267000.glb');
  assert.equal(coupling.exists, true);
});
