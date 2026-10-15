import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';
import {
  buildKuoAVDobleBOM,
  calculateKuoAVDobleTotal,
} from '../src/mepal/kuoAVDoble/bom/kuoAVDobleBOMCatalog.js';

const BASE_CONFIG = {
  profundidadMm: 600,
  thickMm: 30,
  espesorTipo: 'Formica 30',
  kitFuente: true,
  kitFuenteColor: 'Blanco',
  acabadoGrommet: 'Anodizado',
  especial: false,
  baldosaFormica: false,
};

function byCode(bom) {
  return new Map(bom.map((item) => [item.code, item]));
}

test('BOM doble reproduce los totales base CET de 1200, 1500 y 1650', () => {
  const expectedTotals = new Map([
    [1200, 14272650],
    [1500, 14710500],
    [1650, 14464800 + 665700],
  ]);

  for (const [anchoMm, expectedTotal] of expectedTotals) {
    const bom = buildKuoAVDobleBOM({ ...BASE_CONFIG, anchoMm });
    assert.equal(calculateKuoAVDobleTotal(bom), expectedTotal, `${anchoMm} mm`);
    assert.equal(bom.every((item) => /^\d+$/.test(item.code)), true);
  }
});

test('BOM doble selecciona los SAP estructurales confirmados por ancho', () => {
  const cases = [
    [1200, '22000134915', '22000008989', '22000116693'],
    [1500, '22000134914', '22000008990', '22000116336'],
    [1650, '22000134916', '22000114412', '22000116694'],
  ];

  for (const [anchoMm, ductCode, surfaceCode, beamCode] of cases) {
    const codes = new Set(buildKuoAVDobleBOM({ ...BASE_CONFIG, anchoMm }).map((item) => item.code));
    assert.equal(codes.has(ductCode), true);
    assert.equal(codes.has(surfaceCode), true);
    if (beamCode) {
      assert.equal(codes.has(beamCode), true);
    } else {
      assert.equal(
        Array.from(codes).some((code) => code === '22000116693' || code === '22000116336'),
        false
      );
    }
  }
});

test('BOM doble reproduce las variantes confirmadas de profundidad total 1500', () => {
  const cases = [
    [1200, '22000008992', 14701050, 14791350, 13396950],
    [1500, '22000008993', 15388800, 15479100, 14084700],
  ];

  for (const [anchoMm, surfaceCode, baseTotal, paintedTotal, raisedTileTotal] of cases) {
    const config = { ...BASE_CONFIG, anchoMm, profundidadMm: 750 };
    const base = buildKuoAVDobleBOM(config);
    const painted = buildKuoAVDobleBOM({ ...config, acabadoGrommet: 'Pintado' });
    const special = buildKuoAVDobleBOM({
      ...config,
      acabadoGrommet: 'Pintado',
      especial: true,
    });
    const raisedTile = buildKuoAVDobleBOM({
      ...config,
      acabadoGrommet: 'Pintado',
      especial: true,
      baldosaFormica: true,
    });
    const rows = byCode(base);

    assert.equal(calculateKuoAVDobleTotal(base), baseTotal, `${anchoMm}x1500 base`);
    assert.equal(calculateKuoAVDobleTotal(painted), paintedTotal, `${anchoMm}x1500 pintado`);
    assert.equal(calculateKuoAVDobleTotal(special), paintedTotal, `${anchoMm}x1500 especial`);
    assert.equal(
      calculateKuoAVDobleTotal(raisedTile),
      raisedTileTotal,
      `${anchoMm}x1500 baldosa`
    );
    assert.equal(rows.has(surfaceCode), true);
    assert.equal(rows.get('22000134919').quantity, 2);
    assert.equal(rows.get('22000134919').unitPrice, 697200);
    assert.match(rows.get(surfaceCode).description, /X75X3CM LINK LKSU010020/);
    assert.equal(
      byCode(raisedTile).get('00000000').lookupTag,
      'KUOPAINTEDLEGTERMINAL_18_150IZQSENC'
    );
  }
});

test('profundidad 1500 de ancho 1650 usa los c?digos del mapa de producto', () => {
  const built = buildKuoAVDoble({
    ...BASE_CONFIG,
    anchoMm: 1650,
    profundidadMm: 750,
  });
  const rows = byCode(built.bom);

  assert.equal(rows.get('22000114414').unitPrice, 1176000);
  assert.equal(rows.get('22000134919').unitPrice, 697200);
  assert.equal(rows.get('22000116694').quantity, 2);
  assert.equal(rows.get('22000116694').unitPrice, 332850);
});

test('acabado pintado reemplaza ambos grommets y suma el delta CET', () => {
  const anodized = buildKuoAVDobleBOM({ ...BASE_CONFIG, anchoMm: 1200 });
  const painted = buildKuoAVDobleBOM({
    ...BASE_CONFIG,
    anchoMm: 1200,
    acabadoGrommet: 'Pintado',
  });
  const paintedByCode = byCode(painted);

  assert.equal(byCode(anodized).has('22000023626'), true);
  assert.equal(paintedByCode.has('22000023626'), false);
  assert.equal(paintedByCode.get('22000116523').quantity, 2);
  assert.equal(calculateKuoAVDobleTotal(painted), 14362950);
});

test('opciones acumulativas reproducen los totales CET en los tres anchos', () => {
  const cases = [
    [1200, 14362950, 13033650],
    [1500, 14800800, 13471500],
    [1650, 14555100 + 665700, 13225800 + 665700],
  ];

  for (const [anchoMm, paintedTotal, raisedTileTotal] of cases) {
    const painted = buildKuoAVDobleBOM({
      ...BASE_CONFIG,
      anchoMm,
      acabadoGrommet: 'Pintado',
    });
    const special = buildKuoAVDobleBOM({
      ...BASE_CONFIG,
      anchoMm,
      acabadoGrommet: 'Pintado',
      especial: true,
    });
    const raisedTile = buildKuoAVDobleBOM({
      ...BASE_CONFIG,
      anchoMm,
      acabadoGrommet: 'Pintado',
      especial: true,
      baldosaFormica: true,
    });
    const remainingOptions = buildKuoAVDobleBOM({
      ...BASE_CONFIG,
      anchoMm,
      acabadoGrommet: 'Pintado',
      especial: true,
      baldosaFormica: true,
      costadoIntermedio: true,
      aumentarAltura: true,
      elevarKitFIzquierdo: true,
      vertebraLateral: true,
    });

    assert.equal(calculateKuoAVDobleTotal(painted), paintedTotal, `${anchoMm} pintado`);
    assert.equal(calculateKuoAVDobleTotal(special), paintedTotal, `${anchoMm} especial`);
    assert.equal(calculateKuoAVDobleTotal(raisedTile), raisedTileTotal, `${anchoMm} baldosa`);
    assert.equal(
      calculateKuoAVDobleTotal(remainingOptions),
      raisedTileTotal,
      `${anchoMm} opciones visuales`
    );
  }
});

test('especial conserva precios y usa las descripciones y tags de CET', () => {
  const standard = buildKuoAVDobleBOM({
    ...BASE_CONFIG,
    anchoMm: 1500,
    acabadoGrommet: 'Pintado',
  });
  const special = buildKuoAVDobleBOM({
    ...BASE_CONFIG,
    anchoMm: 1500,
    acabadoGrommet: 'Pintado',
    especial: true,
  });
  const duct = byCode(special).get('22000134914');

  assert.equal(calculateKuoAVDobleTotal(special), calculateKuoAVDobleTotal(standard));
  assert.equal(duct.lookupTag, '22000134914');
  assert.match(duct.description, /^SPECIAL:/);
  assert.match(byCode(special).get('22000008990').description, /^SPECIAL:/);
});

test('baldosa Formica refleja el placeholder y la altura comercial de CET', () => {
  const bom = buildKuoAVDobleBOM({
    ...BASE_CONFIG,
    anchoMm: 1200,
    acabadoGrommet: 'Pintado',
    especial: true,
    baldosaFormica: true,
  });
  const rows = byCode(bom);

  assert.equal(rows.has('22000134918'), false);
  assert.equal(rows.get('00000000').quantity, 2);
  assert.equal(rows.get('00000000').unitPrice, 0);
  assert.equal(rows.get('22000116693').lookupTag, 'KUOSUPCHANNEL_18_020_120');
  assert.equal(calculateKuoAVDobleTotal(bom), 13033650);
});

test('builder publica el BOM oficial y no factura piezas visuales duplicadas', () => {
  const built = buildKuoAVDoble({ ...BASE_CONFIG, anchoMm: 1200 });
  const rows = byCode(built.bom);

  assert.equal(calculateKuoAVDobleTotal(built.bom), 14272650);
  assert.equal(rows.get('22000126680').quantity, 2);
  assert.equal(rows.get('22000116690').quantity, 2);
  assert.equal(rows.has('KUBAL01'), false);
});

test('lote doble factura dos terminales y un intermedio aunque la opción esté desmarcada', () => {
  const first = buildKuoAVDoble({
    ...BASE_CONFIG,
    costadoIntermedio: false,
    kuoBatchIndex: 0,
    kuoBatchSize: 2,
  }).bom;
  const second = buildKuoAVDoble({
    ...BASE_CONFIG,
    costadoIntermedio: false,
    kuoBatchIndex: 1,
    kuoBatchSize: 2,
  }).bom;
  const rows = byCode([...first, ...second]);

  assert.equal(rows.get('22000134918').quantity, 2);
  assert.equal(rows.get('22000134920').quantity, 1);
  assert.equal(rows.get('22000134920').lookupTag, 'KUOPAINTEDLEGINTERMEDIATE_16_120SENC');
  assert.equal(rows.get('22000134918').category, 'SOPORTE');
  assert.equal(rows.get('22000134920').category, 'SOPORTE');
  assert.equal(
    calculateKuoAVDobleTotal([...first, ...second]),
    28250250
  );
});

test('puesto doble factura las tres opciones de pantalla y centra la perimetral', () => {
  const cases = [
    ['FORMICA', '22000116713', 1203300, 15475950],
    ['VIDRIO', '22000116695', 1293600, 15566250],
    ['FRONTAL_PERIMETRAL', '22000118213', 1321950, 15594600],
  ];

  for (const [pantallaTipo, code, price, total] of cases) {
    const built = buildKuoAVDoble({
      ...BASE_CONFIG,
      anchoMm: 1200,
      pantalla: true,
      pantallaTipo,
      pantallaPosicion: 'FRONTAL',
    });
    const screenPart = built.parts.find((part) => part.type === 'pantalla');
    const screenRow = byCode(built.bom).get(code);

    assert.ok(screenPart, `${pantallaTipo} debe estar construida`);
    assert.equal(screenPart.codigo, code);
    assert.equal(screenRow?.unitPrice, price);
    assert.equal(calculateKuoAVDobleTotal(built.bom), total);
    if (pantallaTipo === 'FRONTAL_PERIMETRAL') {
      assert.equal(screenPart.position[2], 0.203);
      assert.equal(built.config.pantallaPosicion, 'CENTRAL');
    }
  }
});

test('remate redondea a la nominal superior y describe la medida real', () => {
  const bom = buildKuoAVDobleBOM({ ...BASE_CONFIG, anchoMm: 1400, profundidadMm: 700 });
  const rows = byCode(bom);

  assert.equal(rows.get('22000134914').lookupTag, '22000134914');
  assert.match(rows.get('22000134914').description, /^SPECIAL: .*Largo: 140 cm$/);
  assert.equal(rows.get('22000008993').unitPrice, 1018500);
  assert.match(rows.get('22000008993').description, /Profundidad: 140 cm - Largo: 140 cm/);
  assert.equal(rows.get('22000116336').quantity, 2);
  assert.equal(rows.get('22000134918').unitPrice, 664650);
});

test('lote doble de 75 cm usa el intermedio 150 del mapa (22000134921)', () => {
  const second = buildKuoAVDobleBOM({
    ...BASE_CONFIG,
    profundidadMm: 750,
    kuoBatchIndex: 1,
    kuoBatchSize: 2,
  });
  const intermediate = byCode(second).get('22000134921');

  assert.equal(intermediate.unitPrice, 1017450);
  assert.match(intermediate.description, /INTERMEDIO DOBLE 150CM/);
  assert.equal(byCode(second).has('22000134920'), false);
});

function buildBatch(size, extra = {}) {
  return Array.from({ length: size }, (_, kuoBatchIndex) => buildKuoAVDoble({
    ...BASE_CONFIG,
    ...extra,
    kuoBatchIndex,
    kuoBatchSize: size,
  }));
}

function supportCount(builts) {
  const counts = new Map();
  for (const row of builts.flatMap((built) => built.bom)) {
    if (row.type !== 'costado') continue;
    counts.set(row.code, (counts.get(row.code) || 0) + row.quantity);
  }
  return Object.fromEntries(counts);
}

test('lote de 3 dobles: 2 terminales y uniones KUSO840000 + KUSO850000 (mapa)', () => {
  const batch = buildBatch(3);
  assert.deepEqual(supportCount(batch), {
    '22000134918': 2,
    '22000134920': 1,
    '22000134922': 1,
  });
  const ductSupport = batch[2].bom.find((row) => row.code === '22000134922');
  assert.equal(ductSupport.unitPrice, 970200);
  assert.match(ductSupport.description, /SOPORTE DUCTO DOBLE .*KUSO850000/);

  const feet = batch.flatMap((built) => built.parts.filter((part) => part.partId.includes('_FOOT_')));
  assert.equal(feet.length, 4);
  assert.deepEqual(feet.map((part) => part.lookupTag), [
    'KUSO820000', 'KUSO840000', 'KUSO850000', 'KUSO820000',
  ]);
});

test('soporte intermedio seleccionado manualmente se aplica en todas las uniones', () => {
  assert.deepEqual(supportCount(buildBatch(3, { soporteIntermedio: 'KUSO850000' })), {
    '22000134918': 2,
    '22000134922': 2,
  });
  assert.deepEqual(supportCount(buildBatch(3, { soporteIntermedio: 'KUSO840000' })), {
    '22000134918': 2,
    '22000134920': 2,
  });
});

test('lote de 4 dobles de 75 cm alterna intermedios 150 y conserva 2 terminales', () => {
  const batch = buildBatch(4, { profundidadMm: 750 });
  assert.deepEqual(supportCount(batch), {
    '22000134919': 2,
    '22000134921': 2,
    '22000134923': 1,
  });
  assert.equal(
    batch.flatMap((built) => built.parts.filter((part) => part.partId.includes('_FOOT_'))).length,
    5
  );
});

test('lote con baldosa formica no comparte costados (sin intermedios)', () => {
  const batch = buildBatch(3, { baldosaFormica: true });
  const codes = Object.keys(supportCount(batch));
  assert.ok(!codes.some((code) => ['22000134920', '22000134922'].includes(code)));
  assert.equal(
    batch.flatMap((built) => built.parts.filter((part) => part.partId.includes('_FOOT_'))).length,
    6
  );
});

test('BOM doble melamina usa los códigos del mapa de producto en SUPERFICIE', () => {
  const config = { ...BASE_CONFIG, anchoMm: 1500, profundidadMm: 750, espesorTipo: 'Melamina 30' };
  const surface = buildKuoAVDobleBOM(config).find((item) => item.type === 'superficie');
  assert.equal(surface.code, '22000114430');
  assert.equal(surface.unitPrice, 695100);
  assert.equal(surface.quantity, 2);
  assert.equal(surface.category, 'SUPERFICIE');
  assert.match(surface.description, /MELAMINA 150X75X3CM LINK LKSU010020/);
});

test('BOM doble siempre usa la botonera 22024327', () => {
  const config = { ...BASE_CONFIG, anchoMm: 1200, botoneraCode: '22018775' };
  const control = byCode(buildKuoAVDobleBOM(config)).get('22024327');
  assert.equal(control.quantity, 2);
  assert.equal(control.unitPrice, 77700);
});

test('los dos soportes intermedios usan sus GLB nativos sin escalado', () => {
  const frame = buildBatch(2, { soporteIntermedio: 'KUSO850000' })[1].parts
    .find((part) => part.partId.endsWith('_FOOT_LEFT'));
  assert.equal(frame.modelKind, 'glb');
  assert.ok(frame.glb.endsWith('/KUSO850000_120.glb'));
  assert.deepEqual(frame.scale, [1, 1, 1]);
  const column = buildBatch(2, { soporteIntermedio: 'KUSO840000' })[1].parts
    .find((part) => part.partId.endsWith('_FOOT_LEFT'));
  assert.equal(column.modelKind, 'glb');
  assert.ok(column.glb.endsWith('/KUSO840000_120.glb'));
  assert.deepEqual(column.scale, [1, 1, 1]);
});
