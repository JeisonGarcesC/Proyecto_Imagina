import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDuctCoverPhysicalSides } from '../src/mepal/koncisaPlus/rules/koncisaDuctCoverRules.js';

test('ducto intermedio conserva la selección física izquierda y derecha', () => {
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'intermedio',
      tipoPuesto: 'sencillo',
      state: { left: true, right: true },
    }),
    ['left', 'right']
  );
});

test('terminal sencillo ubica la tapa en el extremo abierto de cada variante', () => {
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'terminal',
      tipoPuesto: 'sencillo',
      ductSide: 'LEFT',
      state: { single: true },
    }),
    ['right']
  );
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'terminal',
      tipoPuesto: 'sencillo',
      ductSide: 'RIGHT',
      state: { single: true },
    }),
    ['left']
  );
});

test('terminal doble respeta la orientación invertida de sus GLB', () => {
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'terminal',
      tipoPuesto: 'doble',
      ductSide: 'LEFT',
      state: { single: true },
    }),
    ['left']
  );
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'terminal',
      tipoPuesto: 'doble',
      ductSide: 'RIGHT',
      state: { single: true },
    }),
    ['right']
  );
});

test('terminal sin tapa activa no devuelve un extremo físico', () => {
  assert.deepEqual(
    resolveDuctCoverPhysicalSides({
      tipoModulo: 'terminal',
      tipoPuesto: 'sencillo',
      ductSide: 'RIGHT',
      state: { single: false },
    }),
    []
  );
});
