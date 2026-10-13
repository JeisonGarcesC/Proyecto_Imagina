import test from 'node:test';
import assert from 'node:assert/strict';
import { getDuctosConfig } from '../src/mepal/koncisaPlus/rules/koncisaRules.js';
import {
  resolveKoncisaSpecialTerminalGeometry,
  resolveKoncisaSpecialTerminalRotationOffsetX,
} from '../src/mepal/koncisaPlus/rules/koncisaSpecialTerminalGeometry.js';

const close = (actual, expected, context) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${context}: ${actual} ≠ ${expected}`);

test('terminal especial mantiene el pivote lateral de los GLB y gira al extremo opuesto', () => {
  for (const realWidthMm of [1100, 1150, 1300, 1400]) {
    for (const tipoPuesto of ['sencillo', 'doble']) {
      for (const tipoPasoCable of ['grommet', 'pasacable']) {
        for (const side of ['LEFT', 'RIGHT']) {
          const config = getDuctosConfig({ puestos: 1, tipoPuesto, largoRealMm: realWidthMm,
            anchoRealMm: tipoPuesto === 'doble' ? 1200 : 600,
            ductModes: ['TERMINAL'], tipoPasoCable, side })[0];
          const geometry = resolveKoncisaSpecialTerminalGeometry({
            realWidthMm, tipoPuesto, accesoCableado: tipoPasoCable,
          });
          const length = geometry.lengthMm / 1000;
          const pivot = config.x / 1000;
          const isReversed = config.rotY === Math.PI;
          const initialMinX = isReversed ? pivot - length : pivot;
          const initialMaxX = isReversed ? pivot : pivot + length;
          const surfaceMinX = -realWidthMm / 2000;
          const surfaceMaxX = realWidthMm / 2000;
          const atRight = tipoPuesto === 'sencillo' ? side === 'LEFT' : side === 'RIGHT';
          const context = `${tipoPuesto} ${tipoPasoCable} ${realWidthMm} ${side}`;
          close(atRight ? initialMaxX : initialMinX,
            atRight ? surfaceMaxX : surfaceMinX, `${context} anclaje inicial`);
          assert.ok(initialMinX >= surfaceMinX - 0.00001 && initialMaxX <= surfaceMaxX + 0.00001,
            `${context}: terminal fuera de la superficie antes de girar`);
          // Girar alrededor del centro mantiene los límites antes de trasladarlo.
          const delta = resolveKoncisaSpecialTerminalRotationOffsetX({
            baseX: 0, realWidthMm, initialMinX, initialMaxX,
            rotatedMinX: initialMinX, rotatedMaxX: initialMaxX,
          });
          close(atRight ? initialMinX + delta : initialMaxX + delta,
            atRight ? surfaceMinX : surfaceMaxX, `${context} anclaje tras 180°`);
          assert.ok(initialMinX + delta >= surfaceMinX - 0.00001 &&
            initialMaxX + delta <= surfaceMaxX + 0.00001,
          `${context}: terminal fuera de la superficie tras girar`);
          const depth = geometry.depthMm;
          const zMin = isReversed ? config.z : config.z - depth;
          const zMax = isReversed ? config.z + depth : config.z;
          const halfDepth = (tipoPuesto === 'doble' ? 1200 : 600) / 2;
          assert.ok(zMin >= -halfDepth && zMax <= halfDepth,
            `${context}: terminal fuera de la profundidad de la superficie`);
        }
      }
    }
  }
});

test('las dimensiones nativas siguen los GLB terminales sin cambiar estándar ni intermedio', () => {
  assert.deepEqual(resolveKoncisaSpecialTerminalGeometry({ realWidthMm: 1200,
    tipoPuesto: 'sencillo', accesoCableado: 'GROMMET' }),
  { lengthMm: 935.5, depthMm: 128, heightMm: 201 });
  assert.deepEqual(resolveKoncisaSpecialTerminalGeometry({ realWidthMm: 1200,
    tipoPuesto: 'doble', accesoCableado: 'PASACABLE' }),
  { lengthMm: 972.5, depthMm: 210, heightMm: 149 });
  assert.deepEqual(resolveKoncisaSpecialTerminalGeometry({ realWidthMm: 1200,
    tipoPuesto: 'sencillo', accesoCableado: 'PASACABLE' }),
  { lengthMm: 972.5, depthMm: 105, heightMm: 135.5 });
  const standard = getDuctosConfig({ puestos: 1, tipoPuesto: 'doble', largoRealMm: 1200,
    anchoRealMm: 1200, ductModes: ['TERMINAL'], tipoPasoCable: 'grommet' })[0];
  assert.deepEqual([standard.x, standard.z, standard.rotY], [600, -129, Math.PI]);
  const intermediate = getDuctosConfig({ puestos: 1, tipoPuesto: 'doble', largoRealMm: 1100,
    anchoRealMm: 1200, ductModes: ['INTERMEDIO'], tipoPasoCable: 'grommet' })[0];
  assert.deepEqual([intermediate.x, intermediate.z, intermediate.rotY], [0, 0, 0]);
});
