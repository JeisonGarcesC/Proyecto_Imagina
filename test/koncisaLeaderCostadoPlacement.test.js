import assert from 'node:assert/strict';
import test from 'node:test';

import { positionLeaderCostadoAssembly } from '../src/mepal/koncisaPlus/leader/rules/leaderCostadoPlacement.js';
import { resolveKoncisaCostadoTerminal } from '../src/mepal/koncisaPlus/rules/koncisaCostadoRules.js';

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
