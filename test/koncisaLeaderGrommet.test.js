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

test('agrega el acople a pared de la caja lateral cuando está habilitado', () => {
  const product = buildLeader({
    leaderJunctionHasOutletBox: true,
    leaderCostadoOutletCoupling: { enabled: true },
  });
  const coupling = product.parts.find(
    (part) => part.meta?.leaderRole === 'COSTADO_OUTLET_WALL_COUPLING'
  );

  assert.equal(coupling?.code, '22000137143');
  assert.equal(coupling?.name, 'ACOPLE CAJA TOMAS A PARED');
});

test('omite el acople a pared de la caja lateral cuando está deshabilitado', () => {
  const product = buildLeader({
    leaderJunctionHasOutletBox: true,
    leaderCostadoOutletCoupling: { enabled: false },
  });

  assert.equal(
    product.parts.some((part) => part.meta?.leaderRole === 'COSTADO_OUTLET_WALL_COUPLING'),
    false
  );
});

test('permite quitar el grommet principal cuando el retorno se sustituye por credenza', () => {
  const product = buildLeader({ leaderCredenza: { enabled: true } });
  const grommets = getMainGrommets(product);

  assert.equal(grommets.length, 0);
  assert.equal(
    product.parts.some((part) => part.code === '22000135010'),
    false
  );
});

test('permite incluir grommet pintado con credenza y conserva su código comercial', () => {
  const product = buildLeader({
    leaderCredenza: { enabled: true },
    surfaceOverrides: {
      MAIN_SURFACE: { cableAccessType: 'GROMMET', grommetFinish: 'PAINTED' },
    },
  });
  const grommets = getMainGrommets(product);

  assert.equal(grommets.length, 1);
  assert.equal(grommets[0].meta.leaderRole, 'MAIN_GROMMET');
  assert.equal(grommets[0].meta.commercialCode, '22000126725');
  assert.equal(grommets[0].description, 'GROMMET LKAC670000 - PINTADO');
});

test('resuelve grommet anodizado con el código comercial correcto', () => {
  const product = buildLeader({
    leaderCredenza: { enabled: true },
    surfaceOverrides: {
      MAIN_SURFACE: { cableAccessType: 'GROMMET', grommetFinish: 'ALUMINIUM' },
    },
  });
  const grommet = getMainGrommets(product)[0];

  assert.equal(grommet.meta.commercialCode, '22000126724');
  assert.equal(grommet.description, 'GROMMET LKAC670000 - ALUMINIO ANODIZADO');
});

for (const { position, expectedMovementMm } of [
  { position: 'LEFT', expectedMovementMm: 189 },
  { position: 'RIGHT', expectedMovementMm: -189 },
]) {
  for (const leaderSide of ['LEFT', 'RIGHT']) {
    test(`desplaza ${expectedMovementMm} mm en Z el grommet ${position} del retorno ${leaderSide} desde su posición base`, () => {
      const product = buildLeader({
        leaderSide,
        surfaceOverrides: {
          RETURN_SURFACE: {
            cableAccessType: 'GROMMET',
            grommetPosition: position,
          },
        },
      });
      const returnSurface = product.parts.find(
        (part) => part.type === 'superficie' && part.meta?.leaderRole === 'RETURN'
      );
      const returnGrommet = product.parts.find(
        (part) => part.type === 'grommet' && part.meta?.leaderRole === 'RETURN_GROMMET'
      );
      const localX = position === 'LEFT' ? -900 / 4 : 900 / 4;
      const baseZOffset = -localX * Math.sin(returnSurface.rotation.y);

      assert.equal(
        returnGrommet.position.z - returnSurface.position.z - baseZOffset,
        expectedMovementMm
      );
    });
  }
}

test('no agrega grommet automáticamente cuando ninguna condición aplica', () => {
  assert.equal(getMainGrommets(buildLeader()).length, 0);
});

test('omite el ducto bajante principal cuando la credenza está activa', () => {
  const product = buildLeader({
    leaderCredenza: { enabled: true },
    leaderMainFloorDuct: { enabled: true },
  });

  assert.equal(
    product.parts.some((part) => part.type === 'ductoPiso'),
    false
  );
});

test('omite el ducto bajante principal si no hay caja de tomas en la superficie principal', () => {
  const product = buildLeader({ leaderMainFloorDuct: { enabled: true } });

  assert.equal(
    product.parts.some((part) => part.type === 'ductoPiso'),
    false
  );
});

test('permite el ducto bajante principal cuando su superficie tiene caja de tomas', () => {
  const product = buildLeader({
    leaderMainGrommet: { enabled: true },
    leaderMainFloorDuct: { enabled: true },
  });

  assert.equal(product.parts.filter((part) => part.type === 'ductoPiso').length, 1);
});

test('el ducto bajante de retorno requiere la caja de tomas de esa superficie', () => {
  const withoutOutletBox = buildLeader({ leaderReturnFloorDuct: { enabled: true } });
  const withOutletBox = buildLeader({
    leaderReturnGrommet: { enabled: true },
    leaderReturnFloorDuct: { enabled: true },
  });

  assert.equal(
    withoutOutletBox.parts.some((part) => part.type === 'ductoPiso'),
    false
  );
  assert.equal(withOutletBox.parts.filter((part) => part.type === 'ductoPiso').length, 1);
});

test('los accesorios de cada caja LEADER se generan desde el override de su superficie', () => {
  const product = buildLeader({
    surfaceOverrides: {
      MAIN_SURFACE: {
        cableAccessType: 'GROMMET',
        floorDuctEnabled: true,
        outletCouplingEnabled: true,
      },
      RETURN_SURFACE: {
        cableAccessType: 'GROMMET',
        floorDuctEnabled: true,
        outletCouplingEnabled: true,
      },
    },
  });

  const floorDucts = product.parts.filter((part) => part.type === 'ductoPiso');
  const couplings = product.parts.filter((part) => part.subtype === 'leader-outlet-wall-coupling');
  assert.deepEqual(
    floorDucts.map((part) => part.meta.targetSurfaceKey),
    ['MAIN_SURFACE', 'RETURN_SURFACE']
  );
  assert.deepEqual(
    couplings.map((part) => part.meta.targetSurfaceKey),
    ['MAIN_SURFACE', 'RETURN_SURFACE']
  );
});

test('no agrega caja ni acople de costado cuando la credenza está activa', () => {
  const product = buildLeader({
    leaderCredenza: { enabled: true },
    leaderJunctionHasOutletBox: true,
    leaderCostadoOutletCoupling: { enabled: true },
  });

  assert.equal(
    product.parts.some((part) => part.meta?.leaderRole === 'MAIN_RETURN_JUNCTION'),
    false
  );
  assert.equal(
    product.parts.some((part) => part.meta?.leaderRole === 'COSTADO_OUTLET_WALL_COUPLING'),
    false
  );
});
