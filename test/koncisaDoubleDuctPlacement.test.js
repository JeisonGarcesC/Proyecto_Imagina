import assert from 'node:assert/strict';
import test from 'node:test';

import { getDuctosConfig } from '../src/mepal/koncisaPlus/rules/koncisaRules.js';

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
    { x: 300, z: -129, rotY: Math.PI }
  );
  assert.deepEqual(
    { x: right.x, z: right.z, rotY: right.rotY },
    { x: -300, z: 129, rotY: 0 }
  );
});
