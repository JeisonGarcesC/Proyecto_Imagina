import assert from 'node:assert/strict';
import test from 'node:test';

import { buildKoncisaLeader } from '../src/mepal/koncisaPlus/leader/KoncisaLeaderBuilder.js';

function buildLeader(overrides = {}) {
  return buildKoncisaLeader({ layoutType: 'LEADER', ...overrides });
}

function getMainGrommets(product) {
  return product.parts.filter((part) => part.type === 'grommet');
}

test('agrega grommet principal al incluir caja de tomas en el costado junto al retorno', () => {
  const product = buildLeader({ leaderJunctionHasOutletBox: true });
  const grommets = getMainGrommets(product);

  assert.equal(grommets.length, 1);
  assert.equal(grommets[0].meta.leaderRole, 'MAIN_GROMMET');
  assert.equal(grommets[0].code, '22000023626');
  assert.equal(
    product.parts.some((part) => part.code === '22000135010'),
    false
  );
});

test('agrega grommet principal al sustituir el retorno por credenza', () => {
  const product = buildLeader({ leaderCredenza: { enabled: true } });
  const grommets = getMainGrommets(product);

  assert.equal(grommets.length, 1);
  assert.equal(grommets[0].meta.leaderRole, 'MAIN_GROMMET');
  assert.equal(grommets[0].code, '22000023626');
  assert.equal(
    product.parts.some((part) => part.code === '22000135010'),
    false
  );
});

test('no agrega grommet automáticamente cuando ninguna condición aplica', () => {
  assert.equal(getMainGrommets(buildLeader()).length, 0);
});
