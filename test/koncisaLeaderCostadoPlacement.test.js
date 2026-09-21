import assert from 'node:assert/strict';
import test from 'node:test';

import { positionLeaderCostadoAssembly } from '../src/mepal/koncisaPlus/leader/rules/leaderCostadoPlacement.js';
import { resolveKoncisaCostadoTerminal } from '../src/mepal/koncisaPlus/rules/koncisaCostadoRules.js';
import {
  KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM,
  KONCISA_LEADER_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM,
  KONCISA_LEADER_PEDESTAL_OFFSETS_FROM_COSTADO,
  KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO,
  resolvePedestalFromCostado,
} from '../src/mepal/koncisaPlus/rules/koncisaPedestalRules.js';
import {
  KONCISA_DUCT_SUPPORT_DEPTH_Z_ADJUSTMENTS_MM,
  KONCISA_DUCT_SUPPORT_OFFSETS_FROM_PEDESTAL,
  resolveKoncisaDuctSupport,
  shouldCreateKoncisaPedestalDuctSupport,
} from '../src/mepal/koncisaPlus/rules/koncisaDuctSupportRules.js';
import {
  resolveKoncisaPedestalReinforcementPosition,
  shouldReplaceKoncisaBeamWithPedestalReinforcement,
} from '../src/mepal/koncisaPlus/rules/koncisaPedestalReinforcementRules.js';

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
  const adjustment = KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM.sencillo.LEFT.LEFT[750];
  assert.equal(pedestal.depthZAdjustmentMm, adjustment);
  assert.equal(
    pedestal.offsetMm.z,
    KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO.sencillo.LEFT.LEFT.z + adjustment
  );
});

test('los puestos líder resuelven offsets desde una configuración independiente', () => {
  const costado = {
    userData: {
      meta: {
        layoutType: 'LEADER',
        leaderSide: 'LEFT',
        tipoPuesto: 'sencillo',
        replaceZone: 'RETURN_END',
        realDepthMm: 750,
      },
    },
  };
  const pedestal = resolvePedestalFromCostado({ costado, placementSide: 'RIGHT' });
  const base = KONCISA_LEADER_PEDESTAL_OFFSETS_FROM_COSTADO.LEFT.RIGHT;
  const adjustment = KONCISA_LEADER_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM.LEFT.RIGHT[750];

  assert.equal(pedestal.layoutType, 'LEADER');
  assert.equal(pedestal.leaderSide, 'LEFT');
  assert.equal(pedestal.offsetMm.x, base.x);
  assert.equal(pedestal.offsetMm.z, base.z + adjustment);
});

test('aplica independientemente los ajustes de cada pedestal doble de 1500 mm', () => {
  const costado = {
    userData: {
      meta: { tipoPuesto: 'doble', replaceZone: 'RIGHT', realDepthMm: 1500 },
    },
  };
  const left = resolvePedestalFromCostado({ costado, placementSide: 'LEFT' });
  const right = resolvePedestalFromCostado({ costado, placementSide: 'RIGHT' });

  const leftAdjustment = KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM.doble.RIGHT.LEFT[1500];
  const rightAdjustment = KONCISA_PEDESTAL_DEPTH_Z_ADJUSTMENTS_MM.doble.RIGHT.RIGHT[1500];
  assert.equal(left.depthZAdjustmentMm, leftAdjustment);
  assert.equal(
    left.offsetMm.z,
    KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO.doble.RIGHT.LEFT.z + leftAdjustment
  );
  assert.equal(right.depthZAdjustmentMm, rightAdjustment);
  assert.equal(
    right.offsetMm.z,
    KONCISA_PEDESTAL_OFFSETS_FROM_COSTADO.doble.RIGHT.RIGHT.z + rightAdjustment
  );
});

test('el soporte de ducto conserva una calibración adicional por profundidad', () => {
  const support = resolveKoncisaDuctSupport({
    tipoPuesto: 'doble',
    replaceZone: 'RIGHT',
    realDepthMm: 1500,
  });

  assert.equal(support.realDepthMm, 1500);
  const adjustment = KONCISA_DUCT_SUPPORT_DEPTH_Z_ADJUSTMENTS_MM.doble.RIGHT[1500];
  assert.equal(support.depthZAdjustmentMm, adjustment);
  assert.equal(
    support.offsetMm.z,
    KONCISA_DUCT_SUPPORT_OFFSETS_FROM_PEDESTAL.doble.RIGHT.z + adjustment
  );
});

test('omite el soporte de ducto en pedestales de puestos líder', () => {
  assert.equal(shouldCreateKoncisaPedestalDuctSupport({ layoutType: 'LEADER' }), false);
  assert.equal(shouldCreateKoncisaPedestalDuctSupport({ layoutType: 'STANDARD' }), true);
  assert.equal(shouldCreateKoncisaPedestalDuctSupport({}), true);
});

test('conserva la viga refuerzo original en puestos líder', () => {
  assert.equal(
    shouldReplaceKoncisaBeamWithPedestalReinforcement({ layoutType: 'LEADER' }),
    false
  );
  assert.equal(
    shouldReplaceKoncisaBeamWithPedestalReinforcement({ layoutType: 'STANDARD' }),
    true
  );
  assert.equal(shouldReplaceKoncisaBeamWithPedestalReinforcement({}), true);
});

test('mueve el refuerzo 120 mm hacia el costado sin depender del eje global', () => {
  const alongX = resolveKoncisaPedestalReinforcementPosition({
    reinforcementPositionMm: { x: 0, y: 590, z: 0 },
    costadoPositionMm: { x: -600, y: 0, z: 0 },
    towardCostadoMm: 120,
  });
  const alongZ = resolveKoncisaPedestalReinforcementPosition({
    reinforcementPositionMm: { x: 0, y: 590, z: 0 },
    costadoPositionMm: { x: 0, y: 0, z: 600 },
    towardCostadoMm: 120,
  });

  assert.deepEqual(alongX, { x: -120, y: 590, z: 0 });
  assert.deepEqual(alongZ, { x: 0, y: 590, z: 120 });
});
