// test/kuoAVBOM.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKuoAVBOM, buildKuoAVBOM } from '../src/mepal/kuoAV/bom/kuoAVBOMCatalog.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';

test('perimetral Melamina especial pintado reproduce las diez partidas oficiales por color', () => {
  for (const [kitFuenteColor, code, lookupTag, price, total, supportTotal] of [
    ['Negro', '22000126681', 'KITFUENTEKUAC1050000', 4552800, 7396200, 5871600],
    ['Gris', '22000128023', 'KITFUENTEKUAC1070000', 7096950, 9940350, 8415750],
    ['Blanco', '22000126680', 'KITFUENTEKUAC1040000', 4552800, 7396200, 5871600],
  ]) {
    const bom = generateKuoAVBOM({
      anchoMm: 1200, profundidadMm: 600, thickMm: 30,
      espesorTipo: 'Melamina 30', kitFuente: true, kitFuenteColor,
      acabadoGrommet: 'PAINTED', especial: true,
    });
    assert.equal(bom.length, 10);
    assert.equal(bom.reduce((sum, row) => sum + row.unitPrice * row.qty, 0), total);
    assert.ok(bom.every((row) => row.qty === 1 && row.complete === 'N'));
    const kit = bom.find((row) => row.type === 'kit_fuente');
    assert.equal(kit.code, code);
    assert.equal(kit.lookupTag, lookupTag);
    assert.equal(kit.unitPrice, price);
    assert.equal(kit.category, 'SOPORTE');
    assert.equal(bom.filter((row) => row.category === 'SOPORTE')
      .reduce((sum, row) => sum + row.unitPrice * row.qty, 0), supportTotal);
    assert.equal(bom.find((row) => row.type === 'vertebra').category, 'DUCTO');
    assert.equal(bom.find((row) => row.type === 'soporte_tomas').category, 'KIT');
    const surface = bom.find((row) => row.type === 'superficie');
    assert.equal(surface.code, 'KUO120060RECT2');
    assert.equal(surface.lookupTag, 'KUO120060RECT2-22008689');
    assert.equal(surface.description, '');
    assert.equal(surface.category, '-');
    assert.equal(surface.unitPrice, 0);
    assert.equal(bom.find((row) => row.type === 'ducto').lookupTag, '22000134911');
    assert.match(bom.find((row) => row.type === 'ducto').description, /^SPECIAL:/);
    for (const row of bom.filter((row) => row.type === 'columna')) {
      assert.match(row.description, /^\$specialSupport:/);
      assert.equal(row.lookupTag, row.code);
    }
  }
});

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

test('Kuo AV Builder conserva la vértebra central y permite quitar grommet opcional', () => {
  const builtWithoutGrommet = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    kitFuente: true,
    vertebraLateral: false,
    acabadoGrommet: 'NONE',
  });
  const bom = buildKuoAVBOM(builtWithoutGrommet);

  const hasVertebra = bom.some((it) => it.code === '22000116690');
  const hasGrommet = bom.some((it) => it.code === '22000023626');
  assert.equal(hasVertebra, true, 'Debe conservar la vértebra central estándar');
  assert.equal(hasGrommet, false, 'No debe incluir grommet si acabado es NONE');

  const total = bom.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.qty || 1), 0);
  assert.equal(total, 7878150 - 250950, 'El total debe descontar únicamente el grommet removido');
});

test('Puesto perimetral solo factura la pantalla frontal perimetral del catálogo', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
    pantalla: true,
    pantallaTipo: 'FORMICA',
  });
  const bom = buildKuoAVBOM(built);
  const screen = bom.find((item) => item.category === 'PANTALLA');

  assert.equal(screen?.code, '22000118213');
  assert.equal(screen?.lookupTag, 'KUOPRIVACYPERIMETRALGLASS_30_120-22006318');
  assert.equal(screen?.unitPrice, 1321950);
  assert.equal(bom.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), 9200100);
});
