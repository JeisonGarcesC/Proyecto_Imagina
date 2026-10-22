import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveKuoAVDimensionOptions, resolveKuoAVSpecialSize, formatKuoAVCm, resolveKuoAVNominalWidth } from '../src/mepal/kuoAV/config/kuoAVTunables.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

test('combos Kuo AV: nominales intactos y oferta especial cada 10 cm de largo y 5 cm de fondo', () => {
  assert.deepEqual(resolveKuoAVDimensionOptions('width', false), [1200, 1500, 1650]);
  assert.deepEqual(resolveKuoAVDimensionOptions('depth', false), [600, 750]);
  const widths = resolveKuoAVDimensionOptions('width', true);
  assert.deepEqual(widths, [1200, 1300, 1400, 1500, 1600]);
  assert.deepEqual(resolveKuoAVDimensionOptions('depth', true), [600, 650, 700, 750]);
  assert.equal(formatKuoAVCm(1205), '120,5');
  assert.equal(formatKuoAVCm(1500), '150');
  assert.equal(formatKuoAVCm(1400), '140');
  assert.equal(resolveKuoAVNominalWidth(1210), 1500);
  assert.equal(resolveKuoAVNominalWidth(1510), 1650);
});

test('activar especial ajusta medidas a la oferta mas cercana, incluido nominal 165 cm', () => {
  assert.equal(resolveKuoAVSpecialSize('width', 1650), 1600);
  assert.equal(resolveKuoAVSpecialSize('width', 1370), 1400);
  assert.equal(resolveKuoAVSpecialSize('depth', 680), 700);
  assert.equal(resolveKuoAVSpecialSize('depth', 625), 600);
  assert.throws(() => resolveKuoAVSpecialSize('width', 'invalid'), /numerica/);
});

test('ambos constructores conservan todas las combinaciones comerciales especiales', () => {
  for (const build of [buildKuoAV, buildKuoAVDoble]) {
    for (const anchoMm of resolveKuoAVDimensionOptions('width', true)) {
      for (const profundidadMm of resolveKuoAVDimensionOptions('depth', true)) {
        const built = build({ anchoMm, profundidadMm, especial: true, kitFuente: true });
        assert.equal(built.config.anchoMm, anchoMm);
        assert.equal(built.config.profundidadMm, profundidadMm);
      }
    }
  }
});
