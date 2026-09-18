import assert from 'node:assert/strict';
import test from 'node:test';

import { positionLeaderCostadoAssembly } from '../src/mepal/koncisaPlus/leader/rules/leaderCostadoPlacement.js';
import { resolveKoncisaCostadoTerminal } from '../src/mepal/koncisaPlus/rules/koncisaCostadoRules.js';
import { resolvePedestalFromCostado } from '../src/mepal/koncisaPlus/rules/koncisaPedestalRules.js';
import { resolveKoncisaDuctSupport } from '../src/mepal/koncisaPlus/rules/koncisaDuctSupportRules.js';

const DEPTH_MM = 600;
const FORMS = ['RECT', 'TEK', 'TRAP', 'CURVO', 'O'];

function createResolvedCostado({ forma, lado, initialZ }) {
  const resolved = resolveKoncisaCostadoTerminal({
    tipoPuesto: 'sencillo',
    depthMm: DEPTH_MM,
    forma,
    lado,
  });

  assert.ok(resolved.assembly, `${forma} ${lado} debe tener ensamble`);

  return {
    position: { x: 750, y: 0, z: initialZ },
    model: { kind: 'koncisa-costado-assembly' },
    meta: {
      forma,
      lado,
      costadoAssembly: resolved.assembly,
    },
  };
}

for (const leaderSide of ['LEFT', 'RIGHT']) {
  for (const forma of FORMS) {
    test(`centra costado líder ${forma} de 600 mm para orientación ${leaderSide}`, () => {
      const lado = leaderSide === 'RIGHT' ? 'izq' : 'der';
      const initialZ = leaderSide === 'RIGHT' ? DEPTH_MM / 2 : -DEPTH_MM / 2;
      const costado = createResolvedCostado({ forma, lado, initialZ });

      positionLeaderCostadoAssembly(costado, { x: 750, y: 0, z: 0 });

      assert.equal(Math.abs(initialZ), 300);
      assert.deepEqual(costado.position, { x: 750, y: 0, z: 0 });
      assert.equal(costado.meta.positioningMode, 'measured-depth-double-v1');
    });
  }
}

test('mantiene la raíz calculada del costado del retorno', () => {
  const costado = createResolvedCostado({ forma: 'TEK', lado: 'izq', initialZ: -900 });
  const returnRoot = { x: 450, y: 0, z: -750 };

  positionLeaderCostadoAssembly(costado, returnRoot);

  assert.deepEqual(costado.position, returnRoot);
});

test('ajusta el pedestal sencillo en z según la profundidad real del costado', () => {
  const costado = {
    userData: {
      meta: { tipoPuesto: 'sencillo', replaceZone: 'LEFT', realDepthMm: 750 },
    },
  };
  const pedestal = resolvePedestalFromCostado({ costado, placementSide: 'LEFT' });

  assert.equal(pedestal.realDepthMm, 750);
  assert.equal(pedestal.depthZAdjustmentMm, 150);
  assert.equal(pedestal.offsetMm.z, 485);
});

test('permite signos opuestos para los pedestales dobles de 1500 mm', () => {
  const costado = {
    userData: {
      meta: { tipoPuesto: 'doble', replaceZone: 'RIGHT', realDepthMm: 1500 },
    },
  };
  const left = resolvePedestalFromCostado({ costado, placementSide: 'LEFT' });
  const right = resolvePedestalFromCostado({ costado, placementSide: 'RIGHT' });

  assert.equal(left.depthZAdjustmentMm, 150);
  assert.equal(left.offsetMm.z, 784);
  assert.equal(right.depthZAdjustmentMm, -150);
  assert.equal(right.offsetMm.z, -784);
});

test('el soporte de ducto conserva una calibración adicional por profundidad', () => {
  const support = resolveKoncisaDuctSupport({
    tipoPuesto: 'doble',
    replaceZone: 'RIGHT',
    realDepthMm: 1500,
  });

  assert.equal(support.realDepthMm, 1500);
  assert.equal(support.depthZAdjustmentMm, 0);
  assert.equal(support.offsetMm.z, -549);
});
