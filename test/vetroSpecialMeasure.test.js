import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { resolveVetroPanelSize } from '../src/mepal/vetro/rules/vetroPanelSize.js';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';

const standard = [
  [30, 204, 297], [60, 204, 597], [75, 242, 747], [90, 280, 897], [120, 318, 1197],
];
for (const [nominalWidthCm, nominalHeightCm, realWidthMm] of standard) {
  test(`Vetro commercial panel ${nominalWidthCm} × ${nominalHeightCm} remains nominal in description`, async () => {
    const config = { productType: 'PANEL', category: 'PANELS', material: 'TEMPERED_GLASS_10MM', nominalWidthCm, nominalHeightCm };
    const size = resolveVetroPanelSize(config);
    const result = await createVetroInstance({ config });
    assert.equal(result.success, true);
    assert.equal(size.realWidthMm, realWidthMm);
    assert.equal(result.object.userData.description.includes('MEDIDA ESPECIAL'), false);
    assert.equal(result.object.userData.code, result.product.codeResolution.code);
  });
}
for (const [label, patch, expected] of [
  ['width', { specialWidthMm: 850 }, [850, 2040]],
  ['height', { specialHeightMm: 2500 }, [897, 2500]],
  ['both', { specialWidthMm: 850, specialHeightMm: 2500 }, [850, 2500]],
]) {
  test(`Vetro special ${label} preserves requested physical dimensions and nominal billing SKU`, async () => {
    const config = { productType: 'PANEL', category: 'PANELS', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 90, nominalHeightCm: 204, ...patch };
    const result = await createVetroInstance({ config });
    assert.equal(result.success, true, result.diagnostics?.[0]?.code);
    assert.equal(result.product.special.special, true);
    assert.equal(result.object.userData.description.includes('MEDIDA ESPECIAL'), true);
    assert.equal(result.object.userData.code, patch.specialHeightMm ? '22000009785' : '22000009783');
    const box = new Box3().setFromObject(result.object).getSize(new Vector3());
    assert.ok(Math.abs(box.x * 1000 - expected[0]) < 0.001);
    assert.ok(Math.abs(box.y * 1000 - (patch.specialHeightMm ? expected[1] - 69.5 : expected[1])) < 0.001);
  });
}
