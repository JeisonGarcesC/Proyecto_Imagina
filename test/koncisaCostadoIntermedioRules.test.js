import assert from 'node:assert/strict';
import test from 'node:test';

import { getCostadosConfig } from '../src/mepal/koncisaPlus/rules/koncisaRules.js';
import { resolveKoncisaCostadoIntermedio } from '../src/mepal/koncisaPlus/rules/resolveKoncisaCostadoIntermedio.js';

test('resuelve un intermedio sencillo especial con geometría real y código nominal', () => {
  const resolved = resolveKoncisaCostadoIntermedio({
    tipoPuesto: 'sencillo',
    depthMm: 650,
  });

  assert.equal(resolved.codigoPT, '22000132395');
  assert.equal(resolved.realDepthMm, 650);
  assert.equal(resolved.billingDepthMm, 750);
  assert.equal(resolved.isSpecial, true);
  assert.equal(resolved.assembly.crossbar.lengthFactor, 0.5);
  assert.equal(resolved.assembly.crossbar.lengthOffsetMm, 125.8);
  assert.equal(resolved.assembly.crossbar.negativeDepthInsetMm, 25);
  assert.equal(resolved.assembly.crossbar.offsetMm.x, 0);
  assert.match(resolved.assembly.centerBracketSrc, /CENTER_BRACKET_INTERMEDIO_SENCILLO\.glb$/);
  assert.equal(Number.isFinite(resolved.assembly.centerBracketOffsetMm.x), true);
  assert.equal(resolved.assembly.centerBracketOffsetMm.y, 658);
  assert.equal(resolved.assembly.centerBracketOffsetMm.z, 87);
  assert.equal(650 * resolved.assembly.crossbar.lengthFactor + 125.8, 450.8);

  const crossbarLengthMm = 450.8;
  const crossbarCenterZMm = -650 / 2 + 25 + crossbarLengthMm / 2;
  assert.equal(crossbarCenterZMm, -74.6);
  assert.equal(crossbarCenterZMm - crossbarLengthMm / 2, -300);
});

test('resuelve un intermedio doble especial con las piezas genéricas correctas', () => {
  const resolved = resolveKoncisaCostadoIntermedio({
    tipoPuesto: 'doble',
    depthMm: 1350,
  });

  assert.equal(resolved.codigoPT, '22000132391');
  assert.equal(resolved.billingDepthMm, 1500);
  assert.equal(resolved.isSpecial, true);
  assert.match(resolved.assembly.leftLegSrc, /LEFT_2KSO329000_Generico\.glb$/);
  assert.match(resolved.assembly.rightLegSrc, /RIGHT_2KSO329000_Generico\.glb$/);
  assert.equal(resolved.assembly.centerBracketSrc, null);
  assert.equal(resolved.assembly.crossbar.negativeDepthInsetMm, null);
  assert.equal(resolved.assembly.crossbar.offsetMm.x, 0);
  assert.equal(resolved.assembly.centerBracketOffsetMm.y, 0);
  assert.equal(resolved.assembly.centerBracketOffsetMm.z, 0);
  assert.equal(1350 * resolved.assembly.crossbar.lengthFactor + 125.8, 800.8);
});

test('mantiene los intermedios en la unión y centrados sobre la profundidad', () => {
  const sencillo = getCostadosConfig({
    puestos: 3,
    tipoPuesto: 'sencillo',
    largoRealMm: 1500,
    anchoRealMm: 650,
  }).filter(({ tipo }) => tipo === 'intermedio');

  assert.deepEqual(
    sencillo.map(({ x, z }) => ({ x, z })),
    [
      { x: 750, z: 0 },
      { x: 2250, z: 0 },
    ]
  );
});
