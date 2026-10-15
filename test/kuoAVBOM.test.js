// test/kuoAVBOM.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKuoAVBOM, buildKuoAVBOM } from '../src/mepal/kuoAV/bom/kuoAVBOMCatalog.js';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';

test('perimetral Melamina especial pintado usa la superficie melamina del mapa de producto por color', () => {
  for (const [kitFuenteColor, code, lookupTag, price, total, supportTotal] of [
    ['Negro', '22000126681', 'KITFUENTEKUAC1050000', 4552800, 7746900, 5871600],
    ['Gris', '22000128023', 'KITFUENTEKUAC1070000', 7096950, 10291050, 8415750],
    ['Blanco', '22000126680', 'KITFUENTEKUAC1040000', 4552800, 7746900, 5871600],
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
    assert.equal(surface.code, '22000114423');
    assert.equal(surface.lookupTag, '22000114423-22015138');
    assert.match(surface.description, /^SPECIAL: SUPERFICIE PRINCIPAL INTERMEDIA MELAMINA 120X60X3CM LINK LKSU010010/);
    assert.equal(surface.category, 'SUPERFICIE');
    assert.equal(surface.unitPrice, 350700);
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

test('remate perimetral usa c?digos de la nominal superior y medidas reales', () => {
  const bom = generateKuoAVBOM({
    anchoMm: 1400,
    profundidadMm: 700,
    kitFuente: true,
    vertebraLateral: true,
    acabadoGrommet: 'ALUMINIUM',
    especial: true,
  });
  const byCode = new Map(bom.map((row) => [row.code, row]));

  assert.match(byCode.get('22000008993').description,
    /^SPECIAL: .*150X75X3CM LINK LKSU010020 {2}- Profundidad: 70 cm - Largo: 140 cm/);
  assert.match(byCode.get('22000134910').description, /Largo: 140 cm$/);
  assert.equal(byCode.get('22000116336').unitPrice, 327600);
  assert.match(byCode.get('22000128083').description, / 60CM CON BASE/);
});

test('remate escala viga y ducto al largo real del mapa', async () => {
  const built = buildKuoAV({ anchoMm: 1400, profundidadMm: 600, especial: true });
  const viga = built.parts.find((part) => part.type === 'viga');
  const ducto = built.parts.find((part) => part.type === 'ducto');

  assert.ok(Math.abs(viga.scale.x - 1396 / 1496) < 1e-9);
  assert.ok(Math.abs(ducto.scale.x - 1309 / 1409.1) < 1e-4);
});

test('lote de 3 sencillos: terminales solo en extremos y 2 intermedios KUSO810000 (mapa pág. 8)', () => {
  const rows = [0, 1, 2].flatMap((kuoBatchIndex) => generateKuoAVBOM({
    anchoMm: 1200, profundidadMm: 600, kuoBatchIndex, kuoBatchSize: 3,
  }));
  const qty = (code) => rows.filter((row) => row.code === code).reduce((sum, row) => sum + row.qty, 0);
  assert.equal(qty('22000128083'), 1);
  assert.equal(qty('22000128084'), 1);
  assert.equal(qty('22000128085'), 2);
  const intermediate = rows.find((row) => row.code === '22000128085');
  assert.equal(intermediate.unitPrice, 868350);
  assert.equal(intermediate.category, 'SOPORTE');
});

test('puesto sencillo suelto conserva ambos costados terminales', () => {
  const codes = generateKuoAVBOM({ anchoMm: 1200, profundidadMm: 600 }).map((row) => row.code);
  assert.ok(codes.includes('22000128083'));
  assert.ok(codes.includes('22000128084'));
  assert.equal(codes.includes('22000128085'), false);
});

test('botonera única según mapa de producto: DPBK06 22024327', () => {
  const byDefault = generateKuoAVBOM({ anchoMm: 1200, profundidadMm: 600 })
    .find((row) => row.type === 'control');
  assert.equal(byDefault.code, '22024327');
  const legacy = generateKuoAVBOM({ anchoMm: 1200, profundidadMm: 600, botoneraCode: '22021302' })
    .find((row) => row.type === 'control');
  assert.equal(legacy.code, '22024327');
  assert.equal(legacy.unitPrice, 77700);
  assert.equal(legacy.category, 'BOTONERA');
});
