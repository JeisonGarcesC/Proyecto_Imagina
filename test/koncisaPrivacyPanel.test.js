import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPrivacyPanelSupportConfig,
  getPrivacyPanelSupportAnchors,
  resolveKoncisaPrivacyPanelCode,
  resolveKoncisaPrivacyPanelPlacement,
  resolveKoncisaPrivacyPanelPlacements,
} from '../src/mepal/koncisaPlus/parts/pantallas.js';
import { KONCISA_PRIVACY_PANEL_FINISH_OPTIONS } from '../src/mepal/koncisaPlus/rules/koncisaPrivacyPanelFinishOptions.js';

test('expone exactamente los cinco tipos comerciales de pantalla frontal', () => {
  const frontOptions = KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.filter(
    (option) => option.tipo === 'frontal'
  );
  assert.equal(frontOptions.length, 5);
  assert.deepEqual(
    new Set(frontOptions.map((option) => option.material)),
    new Set(['vidrio', 'melamina', 'formica', 'tela-backer', 'tela'])
  );
});

test('expone los cuatro tipos comerciales de pantalla lateral', () => {
  const lateralOptions = KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.filter(
    (option) => option.tipo === 'lateral'
  );
  assert.deepEqual(
    lateralOptions.map((option) => option.material),
    ['vidrio', 'melamina', 'formica', 'tela']
  );
});

test('duplica la pantalla lateral de un puesto doble desde el centro hacia ambos frentes', () => {
  const placements = resolveKoncisaPrivacyPanelPlacements({
    tipo: 'lateral', tipoPuesto: 'doble', moduleIndex: 0,
    largoRealMm: 1200, anchoRealMm: 1200, largoNominalMm: 1200, anchoNominalMm: 1200,
  });
  assert.equal(placements.length, 2);
  assert.deepEqual(placements.map(({ lengthMm, skuLengthMm, z }) => ({ lengthMm, skuLengthMm, z })), [
    { lengthMm: 590, skuLengthMm: 600, z: -295 },
    { lengthMm: 590, skuLengthMm: 600, z: 295 },
  ]);
});

test('resuelve SKU lateral por material, profundidad y espesor de superficie', () => {
  assert.equal(resolveKoncisaPrivacyPanelCode({
    tipo: 'lateral', material: 'vidrio', lengthMm: 600, surfaceThicknessMm: 18,
  }), '22000134164');
  assert.equal(resolveKoncisaPrivacyPanelCode({
    tipo: 'lateral', material: 'formica', lengthMm: 750, surfaceThicknessMm: 30,
  }), '22000134181');
});

test('ubica la pantalla frontal en el extremo sencillo y en el centro doble', () => {
  const common = {
    tipo: 'frontal', moduleIndex: 1, largoRealMm: 1100, anchoRealMm: 600,
    largoNominalMm: 1200, anchoNominalMm: 600,
  };
  assert.deepEqual(resolveKoncisaPrivacyPanelPlacement({ ...common, tipoPuesto: 'sencillo' }), {
    lengthMm: 1100, skuLengthMm: 1200, x: 1100, y: 900, z: -270,
  });
  assert.equal(resolveKoncisaPrivacyPanelPlacement({ ...common, tipoPuesto: 'doble' }).z, 0);
});

test('resuelve productos y soportes frontales para los cinco materiales', () => {
  const cases = [
    ['vidrio', '22006318', '22000132929', '2KAC252000'],
    ['melamina', '22008556', '22000132932', '2KAC253000'],
    ['formica', '22008689', '22000132935', '2KAC254000'],
    ['tela-backer', '22010282', '22000132962', '2KAC255000'],
    ['tela', '22010282', '22000133978', '2KAC271000'],
  ];
  for (const [material, finishCode, productCode, supportCode] of cases) {
    assert.equal(resolveKoncisaPrivacyPanelCode({
      tipo: 'frontal', material, heightMm: 300, lengthMm: 1200, finishCode,
    }), productCode);
    assert.equal(getPrivacyPanelSupportConfig({ tipo: 'frontal', material }).code, supportCode);
  }
});

test('aplica el ajuste vertical vigente a los soportes frontales', () => {
  const supportConfig = getPrivacyPanelSupportConfig({ tipo: 'frontal', material: 'formica' });
  const anchors = getPrivacyPanelSupportAnchors({
    tipo: 'frontal', material: 'formica', lengthMm: 1100, heightMm: 300,
  });
  const expectedY = -0.15 + supportConfig.offsetYMm / 1000;
  assert.equal(anchors.length, 2);
  assert.ok(Math.abs(anchors[0].position[1] - expectedY) < 1e-12);
  assert.ok(Math.abs(anchors[1].position[1] - expectedY) < 1e-12);
});
