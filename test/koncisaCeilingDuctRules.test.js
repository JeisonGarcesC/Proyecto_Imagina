import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultCeilingDuctState,
  normalizeCeilingDuctState,
  selectKoncisaCeilingDuctReference,
} from '../src/mepal/koncisaPlus/rules/koncisaCeilingDuctRules.js';

const duct = (tipoModulo, x) => ({
  position: { x },
  meta: { tipoModulo },
});

test('el bajante izquierdo se asocia al ducto válido más a la izquierda', () => {
  const ducts = [duct('INTERMEDIO', 1200), duct('TERMINAL', 0), duct('TERMINAL', 2400)];
  assert.equal(selectKoncisaCeilingDuctReference(ducts, 'LEFT'), ducts[1]);
});

test('el bajante derecho se asocia al ducto válido más a la derecha', () => {
  const ducts = [duct('TERMINAL', 0), duct('INTERMEDIO', 1200), duct('TERMINAL', 2400)];
  assert.equal(selectKoncisaCeilingDuctReference(ducts, 'RIGHT'), ducts[2]);
});

test('no crea referencia sin ducto terminal o intermedio', () => {
  assert.equal(selectKoncisaCeilingDuctReference([], 'LEFT'), null);
  assert.equal(selectKoncisaCeilingDuctReference([duct('INDIVIDUAL', 0)], 'RIGHT'), null);
});

test('el terminal solo admite un bajante automático', () => {
  assert.deepEqual(defaultCeilingDuctState('TERMINAL'), { single: false });
  assert.deepEqual(normalizeCeilingDuctState('TERMINAL', { single: true, left: true }), {
    single: true,
  });
});

test('el intermedio admite bajante izquierdo y derecho', () => {
  assert.deepEqual(normalizeCeilingDuctState('INTERMEDIO', { left: true, right: false }), {
    left: true,
    right: false,
  });
});

test('el intermedio nunca permite ambos bajantes simultáneamente', () => {
  assert.deepEqual(normalizeCeilingDuctState('INTERMEDIO', { left: true, right: true }), {
    left: true,
    right: false,
  });
});
