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
    [1650, 14464800],
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
    [1650, '22000134916', '22000114412', null],
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

test('profundidad 1500 de ancho 1650 permanece sin matriz comercial hasta recibir CET', () => {
  const built = buildKuoAVDoble({
    ...BASE_CONFIG,
    anchoMm: 1650,
    profundidadMm: 750,
  });

  assert.equal(
    built.bom.some((item) => item.code === '22000114414' || item.code === '22000134919'),
    false
  );
  assert.equal(built.bom.every((item) => item.unitPrice === 0), true);
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
    [1650, 14555100, 13225800],
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
