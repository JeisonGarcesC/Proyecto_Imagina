import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveKuoAVDimensionOptions, formatKuoAVCm, resolveKuoAVNominalWidth } from '../src/mepal/kuoAV/config/kuoAVTunables.js';

test('combos Kuo AV: nominales estándar y remate cada 1 cm (mapa)', () => {
  assert.deepEqual(resolveKuoAVDimensionOptions('width', false), [1200, 1500, 1650]);
  assert.deepEqual(resolveKuoAVDimensionOptions('depth', false), [600, 750]);
  const widths = resolveKuoAVDimensionOptions('width', true);
  assert.equal(widths[0], 1200);
  assert.equal(widths[1], 1210);
  assert.equal(widths.at(-1), 1650);
  assert.equal(widths.length, 46);
  assert.equal(resolveKuoAVDimensionOptions('depth', true).length, 16);
  assert.equal(formatKuoAVCm(1205), '120,5');
  assert.equal(formatKuoAVCm(1500), '150');
  assert.equal(formatKuoAVCm(1400), '140');
  assert.ok(resolveKuoAVDimensionOptions('width', true).every((mm) => mm % 10 === 0));
  assert.equal(resolveKuoAVNominalWidth(1210), 1500);
  assert.equal(resolveKuoAVNominalWidth(1510), 1650);
});
