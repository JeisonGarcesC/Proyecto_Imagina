import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  getPrivacyPanelSupportConfig,
  getPrivacyPanelSupportAnchors,
  resolveKoncisaPrivacyPanelCode,
  resolveKoncisaPrivacyPanelPlacement,
  resolveKoncisaPrivacyPanelPlacements,
  resolveKoncisaLateralPanelStations,
  createKoncisaPrivacyPanelProcedural,
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

test('ubica laterales en límites de superficies según el modo elegido', () => {
  assert.deepEqual(resolveKoncisaLateralPanelStations({
    puestos: 2, largoRealMm: 1200, mode: 'ALL_BOUNDARIES',
  }), [-600, 600, 1800]);
  assert.deepEqual(resolveKoncisaLateralPanelStations({
    puestos: 2, largoRealMm: 1200, mode: 'INTERSECTIONS_ONLY',
  }), [600]);
});

test('ancla los soportes laterales en el extremo exterior de cada mitad doble', () => {
  const start = getPrivacyPanelSupportAnchors({
    tipo: 'lateral', material: 'formica', lengthMm: 590, supportEdge: 'start',
  });
  const end = getPrivacyPanelSupportAnchors({
    tipo: 'lateral', material: 'formica', lengthMm: 590, supportEdge: 'end',
  });
  assert.equal(start[0].position[2], -0.295);
  assert.equal(end[0].position[2], 0.295);
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
    tipo: 'frontal', moduleIndex: 1, largoRealMm: 1200, anchoRealMm: 600,
    largoNominalMm: 1200, anchoNominalMm: 600,
  };
  assert.deepEqual(resolveKoncisaPrivacyPanelPlacement({ ...common, tipoPuesto: 'sencillo' }), {
    lengthMm: 1100, skuLengthMm: 1200, descriptionLengthMm: 1200,
    x: 1200, y: 900, z: -270,
  });
  assert.equal(resolveKoncisaPrivacyPanelPlacement({ ...common, tipoPuesto: 'doble' }).z, 0);
});

test('usa nominal real menos 100 mm para pantalla frontal especial y SKU superior', () => {
  for (const tipoPuesto of ['sencillo', 'doble']) {
    const [placement] = resolveKoncisaPrivacyPanelPlacements({
      tipo: 'frontal', tipoPuesto, modoEspecial: true,
      moduleIndex: 0, largoRealMm: 1300, anchoRealMm: tipoPuesto === 'doble' ? 1200 : 600,
      largoNominalMm: 1500, anchoNominalMm: tipoPuesto === 'doble' ? 1200 : 600,
    });
    assert.equal(placement.lengthMm, 1200);
    assert.equal(placement.skuLengthMm, 1500);
    assert.equal(placement.descriptionLengthMm, 1300);
  }
  assert.equal(resolveKoncisaPrivacyPanelCode({
    tipo: 'frontal', material: 'formica', heightMm: 300,
    lengthMm: 1500, finishCode: '22008689',
  }), '22000132936');
});

test('la medida exterior con cantos queda en 1200 mm y la descripción conserva 130 cm', () => {
  const panel = createKoncisaPrivacyPanelProcedural({
    tipo: 'frontal', material: 'formica', lengthMm: 1200, skuLengthMm: 1500,
    surfaceThicknessMm: 30, modoEspecial: true, heightMm: 300,
    descriptionLengthMm: 1300,
    finishCode: '22008689',
  });
  panel.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(panel).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - 1.2) < 1e-6);
  assert.match(panel.userData.description, /^ESPECIAL - /);
  assert.match(panel.userData.description, /Medida real 130 cm$/);
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
