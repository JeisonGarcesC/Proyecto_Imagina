import assert from 'node:assert/strict';
import test from 'node:test';

import { getDuctosConfig } from '../src/mepal/koncisaPlus/rules/koncisaRules.js';
import {
  resolveKoncisaIntegrationPackage,
  resolveKoncisaIntegrationPlacement,
  resolveKoncisaIntegrationReinforcement,
} from '../src/mepal/koncisaPlus/rules/koncisaIntegrationRules.js';

function getDoubleDuct(tipoPasoCable, tipoModulo, side = 'LEFT') {
  return getDuctosConfig({
    puestos: 1,
    tipoPuesto: 'doble',
    largoRealMm: 1200,
    anchoRealMm: 600,
    ductModes: [tipoModulo],
    tipoPasoCable,
    side,
  })[0];
}

for (const tipoPasoCable of ['grommet', 'pasacable']) {
  for (const tipoModulo of ['TERMINAL', 'INTERMEDIO', 'INDIVIDUAL']) {
    test(`resuelve ducto doble ${tipoPasoCable} ${tipoModulo}`, () => {
      const duct = getDoubleDuct(tipoPasoCable, tipoModulo);
      assert.ok(duct);
      assert.equal(duct.tipoModulo, tipoModulo.toLowerCase());
      assert.equal(duct.accesoCableado, tipoPasoCable.toUpperCase());
      for (const key of ['x', 'y', 'z', 'rotY']) assert.equal(Number.isFinite(duct[key]), true);
    });
  }
}

test('conserva la orientación específica de cada lado en el terminal doble', () => {
  const left = getDoubleDuct('pasacable', 'TERMINAL', 'LEFT');
  const right = getDoubleDuct('pasacable', 'TERMINAL', 'RIGHT');
  assert.deepEqual(
    { x: left.x, z: left.z, rotY: left.rotY },
    { x: 632, z: -106, rotY: Math.PI }
  );
  assert.deepEqual(
    { x: right.x, z: right.z, rotY: right.rotY },
    { x: -632, z: 152, rotY: 0 }
  );
});

test('ubica cada terminal doble en su propio puesto y no depende de la profundidad', () => {
  const build = (anchoRealMm) =>
    getDuctosConfig({
      puestos: 3,
      tipoPuesto: 'doble',
      largoRealMm: 1200,
      anchoRealMm,
      ductModes: ['TERMINAL', 'TERMINAL', 'TERMINAL'],
      tipoPasoCable: 'grommet',
      side: 'LEFT',
    });

  const standard = build(1200);
  const deep = build(1500);

  assert.deepEqual(
    standard.map(({ moduleIndex, x }) => ({ moduleIndex, x })),
    [
      { moduleIndex: 0, x: 600 },
      { moduleIndex: 1, x: 1800 },
      { moduleIndex: 2, x: 3000 },
    ]
  );
  assert.deepEqual(
    deep.map(({ moduleIndex, x }) => ({ moduleIndex, x })),
    standard.map(({ moduleIndex, x }) => ({ moduleIndex, x }))
  );
});

test('el costado doble de integración usa el ensamble genérico para ambas medidas', () => {
  for (const widthMm of [1200, 1500]) {
    const leg = resolveKoncisaIntegrationPackage({ widthMm }).doubleIntegrationLeg;
    assert.equal(leg.nominalWidthMm, widthMm);
    assert.match(leg.assembly.leftLegSrc, /LEFT_2KSO347000_Generico\.glb$/);
    assert.match(leg.assembly.rightLegSrc, /RIGHT_2KSO347000_Generico\.glb$/);
    assert.match(leg.assembly.centerBracketSrc, /CENTER_BRACKET_DOBLE_INTEGRACION\.glb$/);
    assert.equal(leg.assembly.positioningMode, 'measured-depth-double-v1');
    assert.equal(leg.assembly.crossbar.offsetMm.y, 685);
  }
});


test('la integracion con grommet usa el modelo LKAC250000', () => {
  const cableAccess = resolveKoncisaIntegrationPackage({
    cableAccessType: 'grommet',
  }).cableAccess;

  assert.equal(cableAccess.modelCode, 'LKAC250000');
  assert.match(cableAccess.modelSrc, /LKAC250000\.glb$/);
});


test('usa GLB exacto para refuerzos de integracion de 100, 120 y 150 cm', () => {
  for (const widthMm of [1000, 1200, 1500]) {
    const reinforcement = resolveKoncisaIntegrationReinforcement({ widthMm });
    assert.equal(reinforcement.nominalWidthMm, widthMm);
    assert.equal(reinforcement.usesStandardModel, true);
    assert.match(reinforcement.modelSrc, new RegExp('2KAC262000_' + widthMm / 10 + '\\.glb$'));
  }
});

test('marca medidas especiales para usar el refuerzo nativo', () => {
  const reinforcement = resolveKoncisaIntegrationReinforcement({ widthMm: 1350 });
  assert.equal(reinforcement.nominalWidthMm, 1350);
  assert.equal(reinforcement.usesStandardModel, false);
});

test('conserva las coordenadas calibradas de la integración derecha', () => {
  const placement600 = resolveKoncisaIntegrationPlacement({
    widthMm: 1200,
    depthMm: 600,
    side: 'RIGHT',
    cableAccessType: 'grommet',
  });

  const rotateRight = ({ x, z }) => ({ x: -x, z: -z });

  assert.deepEqual(rotateRight(placement600.surfaceCenter), { x: 300, z: -0 });
  assert.deepEqual(placement600.unitLegs, [
    { x: -599, z: 602, rotY: 0 },
    { x: -600, z: -599, rotY: -Math.PI / 2 },
  ]);
  assert.deepEqual(rotateRight(placement600.duct), { x: 29, z: -347 });
  assert.deepEqual(placement600.couple, {
    x: -72,
    z: 123,
    rotY: Math.PI,
    rotZ: Math.PI / 2,
  });
  assert.deepEqual(placement600.cableAccess, {
    x: -104,
    z: 0,
    rotY: Math.PI / 2,
  });
  assert.deepEqual(placement600.reinforcement, {
    x: -222,
    z: 320,
    rotY: Math.PI / 2,
  });

  const placement750 = resolveKoncisaIntegrationPlacement({
    widthMm: 1500,
    depthMm: 750,
    side: 'RIGHT',
  });
  assert.deepEqual(rotateRight(placement750.surfaceCenter), { x: 375, z: -0 });
  assert.deepEqual(rotateRight(placement750.duct), { x: 29, z: -347 });
  assert.deepEqual(placement750.couple, {
    x: -70,
    z: 123,
    rotY: Math.PI,
    rotZ: Math.PI / 2,
  });
  assert.deepEqual(placement750.reinforcement, {
    x: -297,
    z: 470,
    rotY: Math.PI / 2,
  });
});

test('refleja toda la integración al convertir el costado izquierdo', () => {
  const right = resolveKoncisaIntegrationPlacement({
    widthMm: 1200,
    depthMm: 600,
    side: 'RIGHT',
  });
  const left = resolveKoncisaIntegrationPlacement({
    widthMm: 1200,
    depthMm: 600,
    side: 'LEFT',
  });

  for (const key of ['surfaceCenter', 'duct', 'couple', 'cableAccess', 'reinforcement']) {
    assert.deepEqual(left[key], right[key], `${key} debe usar la misma referencia local`);
  }
  for (const [index, rightLeg] of right.unitLegs.entries()) {
    assert.deepEqual(left.unitLegs[index], rightLeg);
  }
});

test('mantiene el ajuste exclusivo del grommet de 600 mm', () => {
  const grommet = resolveKoncisaIntegrationPlacement({
    depthMm: 600,
    side: 'RIGHT',
    cableAccessType: 'grommet',
  });
  const pasacable = resolveKoncisaIntegrationPlacement({
    depthMm: 600,
    side: 'RIGHT',
    cableAccessType: 'pasacable',
  });

  assert.equal(grommet.cableAccess.x, -104);
  assert.equal(pasacable.cableAccess.x, -29);
});
