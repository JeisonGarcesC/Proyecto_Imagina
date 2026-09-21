// test/kuoAVBOM.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKuoAVBOM, KUO_AV_BOM_CATALOG } from '../src/mepal/kuoAV/config/kuoAVBOMCatalog.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';

test('Kuo AV Puesto Perimetral 1.20 x 0.60 m genera el BOM exacto del Excel ($7,878,150)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1200,
    profundidadMm: 600,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 7878150, 'El total debe coincidir exactamente con el Excel ($7,878,150)');
  assert.equal(bom.length, 10, 'Debe contener 10 partidas');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000008989');
  assert.equal(surface?.unitPrice, 527100);

  const ducto = bom.find((it) => it.category === 'DUCTOS');
  assert.equal(ducto?.code, '22000134911');
  assert.equal(ducto?.unitPrice, 327600);

  const viga = bom.find((it) => it.category === 'VIGAS');
  assert.equal(viga?.code, '22000116693');
  assert.equal(viga?.unitPrice, 319200);
});

test('Kuo AV Puesto Perimetral 1.20 x 0.75 m genera el BOM exacto del Excel ($8,059,800)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1200,
    profundidadMm: 750,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 8059800, 'El total debe coincidir exactamente con el Excel ($8,059,800)');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000008992');
  assert.equal(surface?.unitPrice, 708750);
});

test('Kuo AV Puesto Perimetral 1.50 x 0.60 m genera el BOM exacto del Excel ($8,120,700)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1500,
    profundidadMm: 600,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 8120700, 'El total debe coincidir exactamente con el Excel ($8,120,700)');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000008990');
  assert.equal(surface?.unitPrice, 711900);

  const ducto = bom.find((it) => it.category === 'DUCTOS');
  assert.equal(ducto?.code, '22000134910');
  assert.equal(ducto?.unitPrice, 376950);

  const viga = bom.find((it) => it.category === 'VIGAS');
  assert.equal(viga?.code, '22000116336');
  assert.equal(viga?.unitPrice, 327600);
});

test('Kuo AV Puesto Perimetral 1.50 x 0.75 m genera el BOM exacto del Excel ($8,427,300)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1500,
    profundidadMm: 750,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 8427300, 'El total debe coincidir exactamente con el Excel ($8,427,300)');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000008993');
  assert.equal(surface?.unitPrice, 1018500);
});

test('Kuo AV Puesto Perimetral 1.60 x 0.60 m genera el BOM exacto del Excel ($8,333,850)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1650,
    profundidadMm: 600,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 8333850, 'El total debe coincidir exactamente con el Excel ($8,333,850)');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000114412');
  assert.equal(surface?.unitPrice, 895650);

  const ducto = bom.find((it) => it.category === 'DUCTOS');
  assert.equal(ducto?.code, '22000134912');
  assert.equal(ducto?.unitPrice, 401100);

  const viga = bom.find((it) => it.category === 'VIGAS');
  assert.equal(viga?.code, '22000116694');
  assert.equal(viga?.unitPrice, 332850);
});

test('Kuo AV Puesto Perimetral 1.65 x 0.75 m genera el BOM exacto del Excel ($8,614,200)', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1650,
    profundidadMm: 750,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
  });

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 8614200, 'El total debe coincidir exactamente con el Excel ($8,614,200)');

  const surface = bom.find((it) => it.category === 'SUPERFICIE');
  assert.equal(surface?.code, '22000114414');
  assert.equal(surface?.unitPrice, 1176000);
});

test('Kuo AV Builder adjunta el BOM din├ímico con eliminaci├│n de accesorios opcionales', () => {
  const builtWithoutVertebra = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraLateral: false,
    acabadoGrommet: 'NONE',
  });

  assert.ok(Array.isArray(builtWithoutVertebra.bom));
  const hasVertebra = builtWithoutVertebra.bom.some((it) => it.code === '22000116690');
  const hasGrommet = builtWithoutVertebra.bom.some((it) => it.code === '22000023626');
  assert.equal(hasVertebra, false, 'No debe incluir la v├®rtebra si fue desactivada');
  assert.equal(hasGrommet, false, 'No debe incluir grommet si acabado es NONE');

  const total = builtWithoutVertebra.bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 7878150 - 277200 - 250950, 'El total debe descontar los accesorios removidos');
});
