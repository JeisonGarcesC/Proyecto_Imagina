import { buildKuoAV } from '../builder/KuoAVBuilder.js';

const BOM_BY_WIDTH = Object.freeze({
  1200: Object.freeze({
    widthCm: 120,
    ducto: Object.freeze({ code: '22000134911', price: 327600 }),
    viga: Object.freeze({ code: '22000116693', price: 319200 }),
    formicaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000008989', price: 527100 }),
      750: Object.freeze({ code: '22000008992', price: 708750 }),
    }),
  }),
  1500: Object.freeze({
    widthCm: 150,
    ducto: Object.freeze({ code: '22000134910', price: 376950 }),
    viga: Object.freeze({ code: '22000116336', price: 327600 }),
    formicaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000008990', price: 711900 }),
      750: Object.freeze({ code: '22000008993', price: 1018500 }),
    }),
  }),
  1650: Object.freeze({
    widthCm: 165,
    ducto: Object.freeze({ code: '22000134912', price: 401100 }),
    viga: Object.freeze({ code: '22000116694', price: 332850 }),
    formicaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000114412', price: 895650 }),
      750: Object.freeze({ code: '22000114414', price: 1176000 }),
    }),
  }),
});

const FIXED_BOM = Object.freeze({
  control: Object.freeze({
    code: '22024327',
    lookupTag: 'DPBK06',
    description: 'BOTONERA DE CONTROL P/ COLUMNAS LINAK REFERENCIA DPBK06',
    price: 77700,
    category: 'BOTONERA',
  }),
  soporteTomas: Object.freeze({
    code: '22000116338',
    lookupTag: 'KUAC680000',
    description: 'KIT SOPORTE TOMAS ALTURA VARIABLE KUO KUAC680000',
    price: 226800,
    category: 'KIT',
  }),
  vertebra: Object.freeze({
    code: '22000116690',
    lookupTag: 'KUAC650000',
    description: 'VERTEBRA METALICA 86CM ALTURA VARIABLE KUO KUAC650000',
    price: 277200,
    category: 'DUCTO',
  }),
  grommetAluminium: Object.freeze({
    code: '22000023626',
    lookupTag: 'KONGROMMET4TOMAS-ALUMINIUM',
    description: 'GROMMET ALUMINIO 4 TOMAS ACCESORIO LINK LKAC250000',
    price: 250950,
    category: 'GROMMET',
  }),
  grommetPainted: Object.freeze({
    code: '22000116523',
    lookupTag: 'KONGROMMET4TOMAS-PAINTED',
    description: 'GROMMET PINTADO 4 TOMAS ACCESORIO LINK LKAC250000',
    price: 296100,
    category: 'KIT TAPA TOMA',
  }),
});

const POWER_KIT_BOM = Object.freeze({
  BLANCO: Object.freeze({
    code: '22000126680',
    lookupTag: 'KITFUENTEKUAC1040000',
    description: 'KIT FUENTE ALIMENTACION ALTURA VARIABLE DL5 COLUMNAS BLANCAS KUO KUAC1040000',
    price: 4552800,
  }),
  NEGRO: Object.freeze({
    code: '22000126681',
    lookupTag: 'KITFUENTEKUAC1050000',
    description: 'KIT FUENTE ALIMENTACION ALTURA VARIABLE DL5 COLUMNAS NEGRAS KUO KUAC1050000',
    price: 4552800,
  }),
  GRIS: Object.freeze({
    code: '22000128023',
    lookupTag: 'KITFUENTEKUAC1070000',
    description: 'KIT FUENTE ALIMENTACION ALTURA VARIABLE DL5 COLUMNAS GRIS KUO KUAC1070000',
    price: 7096950,
  }),
});

export const KUO_AV_BOM_CATALOG = Object.freeze({
  widths: BOM_BY_WIDTH,
  fixed: FIXED_BOM,
  powerKits: POWER_KIT_BOM,
});

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toLocaleUpperCase('es');
}

function resolveWidth(widthMm) {
  const width = Number(widthMm);
  if (width <= 1350) return 1200;
  if (width <= 1575) return 1500;
  return 1650;
}

function resolveDepth(depthMm) {
  const depth = Number(depthMm);
  return depth <= 675 ? 600 : 750;
}

function cmLabel(mm) {
  return Math.round(Number(mm || 0) / 10);
}

function paddedCm(mm) {
  return String(cmLabel(mm)).padStart(3, '0');
}

function resolveSurfaceMaterial(config) {
  const value = normalizeUpper(
    config.espesorTipo || config.espesor || config.finishCode || 'FORMICA'
  );
  return value.includes('MELAMINA') ? 'MELAMINA' : 'FORMICA';
}

function createBomItem({
  code,
  lookupTag,
  description,
  category,
  type,
  qty = 1,
  unitPrice = 0,
  logicalCode,
  complete = 'N',
}) {
  return {
    code: String(code),
    codigo: String(code),
    lookupTag: lookupTag || String(code),
    logicalCode: logicalCode || lookupTag || String(code),
    description: description || '',
    descripcion: description || '',
    qty,
    cantidad: qty,
    quantity: qty,
    category,
    section: category,
    bomSection: category,
    complete,
    manualSort: 9999999999,
    type,
    unitPrice,
    price: unitPrice,
    prices: { CO: unitPrice, EUC: 0, USD: 0 },
  };
}

function buildDuctItem(config, widthData, widthMm) {
  const isSpecial = !!config.especial;
  const widthCm = widthData.widthCm;
  return createBomItem({
    code: widthData.ducto.code,
    lookupTag: isSpecial ? widthData.ducto.code : `KUOCABLEDUCTTER${widthCm}`,
    description: `${isSpecial ? 'SPECIAL: ' : ''}DUCTO CABLEADO SENCILLO METALICO PINTADO ${widthCm}CM ALTURA VARIABLE KUO KUSO860000${
      isSpecial ? `  - Largo: ${widthCm} cm` : ''
    }`,
    category: 'DUCTOS',
    type: 'ducto',
    unitPrice: widthData.ducto.price,
    logicalCode: `KUSO860000_${widthMm}`,
  });
}

function buildColumnItem({ side, config, depthMm }) {
  const isRight = side === 'right';
  const code = isRight ? '22000128083' : '22000128084';
  const sideLabel = isRight ? 'DERECHO' : 'IZQUIERDO';
  const sideTag = isRight ? 'DER' : 'IZQ';
  const isSpecial = !!config.especial;
  return createBomItem({
    code,
    lookupTag: isSpecial ? code : `KUOPAINTEDLEGTERMINAL_16_${paddedCm(depthMm)}${sideTag}SENC`,
    description: `${isSpecial ? '$specialSupport: ' : ''}COSTADO TERMINAL SENCILLO ${sideLabel} ${cmLabel(depthMm)}CM CON BASE ALTURA VARIABLE KUO KUSO800000${
      isSpecial ? `  - $long: ${cmLabel(depthMm)} cm` : ''
    }`,
    category: 'SOPORTE',
    type: 'columna',
    unitPrice: 659400,
    logicalCode: `KUSO800000_${side.toUpperCase()}`,
  });
}

function buildSurfaceItem(config, widthData, widthMm, depthMm) {
  const material = resolveSurfaceMaterial(config);
  const widthCm = widthData.widthCm;
  const depthCm = cmLabel(depthMm);

  if (material === 'MELAMINA') {
    const code = `KUO${widthCm}${paddedCm(depthMm)}RECT2`;
    return createBomItem({
      code,
      lookupTag: `${code}-22008689`,
      description: '',
      category: '-',
      type: 'superficie',
      unitPrice: 0,
      logicalCode: code,
    });
  }

  const surface = widthData.formicaSurfaces[depthMm];
  const fallbackSurface = widthData.formicaSurfaces[600];
  const resolvedSurface = surface || fallbackSurface;
  const isSpecial = !!config.especial;

  return createBomItem({
    code: resolvedSurface.code,
    lookupTag: `${resolvedSurface.code}-22008689`,
    description: `${isSpecial ? 'SPECIAL: ' : ''}SUPERFICIE PRINCIPAL INTERMEDIA UNICOR CON FORMICA ${widthCm}X${depthCm}X3CM LINK LKSU010010${
      isSpecial
        ? `  - Profundidad: ${depthCm} cm - Largo: ${widthCm} cm - Tipo Grommet`
        : '  - Tipo Grommet'
    }`,
    category: 'SUPERFICIE',
    type: 'superficie',
    unitPrice: resolvedSurface.price,
    logicalCode: `LKSU010010_${widthMm}x${depthMm}_T30`,
  });
}

function buildVigaItem(widthData, widthMm) {
  return createBomItem({
    code: widthData.viga.code,
    lookupTag: `KUOSUPCHANNEL_16_020_${widthData.widthCm}`,
    description: `VIGA SOPORTE SUPERFICIE ${widthData.widthCm}CM ALTURA VARIABLE KUO KUSO420000`,
    category: 'VIGAS',
    type: 'viga',
    unitPrice: widthData.viga.price,
    logicalCode: `KUSO420000_${widthMm}`,
  });
}

export function buildKuoAVBOM(built) {
  if (!built || !Array.isArray(built.parts)) {
    throw new TypeError('buildKuoAVBOM: se requiere una estructura KUO AV construida.');
  }

  const config = built.config || {};
  const widthMm = resolveWidth(config.anchoMm || built.dimMm?.widthMm || 1200);
  const depthMm = resolveDepth(config.profundidadMm || built.dimMm?.depthMm || 600);
  const widthData = BOM_BY_WIDTH[widthMm] || BOM_BY_WIDTH[1200];
  const rows = [];
  const partTypes = new Set(built.parts.map((part) => part.type));

  if (partTypes.has('control')) {
    rows.push(
      createBomItem({
        ...FIXED_BOM.control,
        type: 'control',
        unitPrice: FIXED_BOM.control.price,
        complete: config.acabadoGrommet === 'ALUMINIUM' && !config.especial ? 'Y' : 'N',
      })
    );
  }

  if (partTypes.has('vertebra')) {
    rows.push(
      createBomItem({
        ...FIXED_BOM.vertebra,
        type: 'vertebra',
        unitPrice: FIXED_BOM.vertebra.price,
      })
    );
  }

  if (partTypes.has('ducto')) {
    rows.push(buildDuctItem(config, widthData, widthMm));
  }

  if (partTypes.has('grommet')) {
    const isAluminium = normalizeUpper(config.acabadoGrommet || 'ALUMINIUM') === 'ALUMINIUM';
    const grommet = isAluminium ? FIXED_BOM.grommetAluminium : FIXED_BOM.grommetPainted;
    rows.push(
      createBomItem({
        ...grommet,
        type: 'grommet',
        unitPrice: grommet.price,
        complete: isAluminium && !config.especial ? 'Y' : 'N',
      })
    );
  }

  if (partTypes.has('soporte_tomas')) {
    rows.push(
      createBomItem({
        ...FIXED_BOM.soporteTomas,
        type: 'soporte_tomas',
        unitPrice: FIXED_BOM.soporteTomas.price,
      })
    );
  }

  if (partTypes.has('kit_fuente')) {
    const color = normalizeUpper(config.kitFuenteColor || config.acabadoParales || 'BLANCO');
    const kit = POWER_KIT_BOM[color] || POWER_KIT_BOM.BLANCO;
    rows.push(
      createBomItem({
        ...kit,
        category: 'SOPORTE',
        type: 'kit_fuente',
        unitPrice: kit.price,
      })
    );
  }

  if (partTypes.has('columna')) {
    rows.push(
      buildColumnItem({ side: 'right', config, depthMm }),
      buildColumnItem({ side: 'left', config, depthMm })
    );
  }

  if (partTypes.has('superficie')) {
    const surfaceItem = buildSurfaceItem(config, widthData, widthMm, depthMm);
    if (surfaceItem.category === 'SUPERFICIE') rows.push(surfaceItem);
  }

  if (partTypes.has('viga')) {
    rows.push(buildVigaItem(widthData, widthMm));
  }

  if (partTypes.has('superficie')) {
    const surfaceItem = buildSurfaceItem(config, widthData, widthMm, depthMm);
    if (surfaceItem.category === '-') rows.push(surfaceItem);
  }

  return rows;
}

export function generateKuoAVBOM(config = {}) {
  return buildKuoAVBOM(buildKuoAV(config));
}

export default generateKuoAVBOM;
