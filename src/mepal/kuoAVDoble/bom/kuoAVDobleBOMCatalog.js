const WIDTH_BOM = Object.freeze({
  1200: Object.freeze({
    widthCm: 120,
    duct: Object.freeze({ code: '22000134915', price: 479850 }),
    surfaces: Object.freeze({
      600: Object.freeze({ code: '22000008989', price: 527100 }),
      750: Object.freeze({ code: '22000008992', price: 708750 }),
    }),
    beam: Object.freeze({ code: '22000116693', price: 319200 }),
  }),
  1500: Object.freeze({
    widthCm: 150,
    duct: Object.freeze({ code: '22000134914', price: 531300 }),
    surfaces: Object.freeze({
      600: Object.freeze({ code: '22000008990', price: 711900 }),
      750: Object.freeze({ code: '22000008993', price: 1018500 }),
    }),
    beam: Object.freeze({ code: '22000116336', price: 327600 }),
  }),
  1650: Object.freeze({
    widthCm: 165,
    duct: Object.freeze({ code: '22000134916', price: 573300 }),
    surfaces: Object.freeze({
      600: Object.freeze({ code: '22000114412', price: 895650 }),
    }),
    beam: null,
  }),
});

const DEPTH_BOM = Object.freeze({
  600: Object.freeze({
    depthCm: 60,
    totalDepthCm: 120,
    surfacePlan: 'LKSU010010',
    terminal: Object.freeze({ code: '22000134918', price: 664650 }),
  }),
  750: Object.freeze({
    depthCm: 75,
    totalDepthCm: 150,
    surfacePlan: 'LKSU010020',
    terminal: Object.freeze({ code: '22000134919', price: 697200 }),
  }),
});

const POWER_KIT_CODES = Object.freeze({
  BLANCO: '22000126680',
  NEGRO: '22000126681',
  GRIS: '22000128023',
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

function createItem({ code, lookupTag, description, quantity, unitPrice, type }) {
  return {
    code,
    codigo: code,
    lookupTag,
    logicalCode: lookupTag,
    description,
    descripcion: description,
    qty: quantity,
    cantidad: quantity,
    quantity,
    type,
    unitPrice,
    price: unitPrice,
    prices: {
      CO: unitPrice,
      EUC: 0,
      USD: 0,
    },
  };
}

function buildFallbackBom(parts) {
  const rows = new Map();
  for (const part of parts) {
    const lookupTag = part.lookupTag || part.codigo;
    const key = `${part.codigo}::${lookupTag}`;
    const current = rows.get(key);
    if (current) {
      current.qty += 1;
      current.cantidad += 1;
      current.quantity += 1;
      continue;
    }

    rows.set(
      key,
      createItem({
        code: String(part.codigo),
        lookupTag,
        description: part.name,
        quantity: 1,
        unitPrice: 0,
        type: part.type || part.role,
      })
    );
  }
  return Array.from(rows.values());
}

export function hasConfirmedKuoAVDobleBOM(config = {}) {
  const width = resolveWidth(config.anchoMm || 1200);
  const depthMm = Number(config.profundidadMm || 600);
  const thickMm = Number(config.thickMm || 30);
  const material = normalizeUpper(config.espesorTipo || 'FORMICA 30');
  return (
    !!WIDTH_BOM[width]?.surfaces?.[depthMm] &&
    !!DEPTH_BOM[depthMm] &&
    thickMm === 30 &&
    material.includes('FORMICA')
  );
}

export function buildKuoAVDobleBOM(config = {}, parts = []) {
  if (!hasConfirmedKuoAVDobleBOM(config)) {
    return buildFallbackBom(parts);
  }

  const width = resolveWidth(config.anchoMm || 1200);
  const depthMm = Number(config.profundidadMm || 600);
  const widthData = WIDTH_BOM[width];
  const depthData = DEPTH_BOM[depthMm];
  const surface = widthData.surfaces[depthMm];
  const { widthCm } = widthData;
  const isSpecial = !!config.especial;
  const hasRaisedTile = !!config.baldosaFormica;
  const isAnodized = ['ANODIZADO', 'ALUMINIUM', 'ALUMINIO'].includes(
    normalizeUpper(config.acabadoGrommet || 'ANODIZADO')
  );
  const powerKitColor = normalizeUpper(config.kitFuenteColor || 'BLANCO');
  const powerKitCode = POWER_KIT_CODES[powerKitColor] || POWER_KIT_CODES.BLANCO;
  const rows = [];

  if (hasRaisedTile) {
    rows.push(
      createItem({
        code: '00000000',
        lookupTag: `KUOPAINTEDLEGTERMINAL_18_${depthData.totalDepthCm}IZQSENC`,
        description: 'NO EXISTE / NO IMPLEMENTADO / NO APLICA',
        quantity: 2,
        unitPrice: 0,
        type: 'costado',
      })
    );
  }

  rows.push(
    createItem({
      code: '22024327',
      lookupTag: 'DPBK06',
      description: 'BOTONERA DE CONTROL P/ COLUMNAS LINAK REFERENCIA DPBK06',
      quantity: 2,
      unitPrice: 77700,
      type: 'control',
    }),
    createItem({
      code: '22000116690',
      lookupTag: 'KUAC650000',
      description: 'VERTEBRA METALICA 86CM ALTURA VARIABLE KUO KUAC650000',
      quantity: 2,
      unitPrice: 277200,
      type: 'vertebra',
    }),
    createItem({
      code: widthData.duct.code,
      lookupTag: isSpecial
        ? widthData.duct.code
        : `KUOCABLEDUCTDOUBLETER${widthCm}`,
      description: `${isSpecial ? 'SPECIAL: ' : ''}DUCTO CABLEADO ${widthCm}CM ALTURA VARIABLE KUO KUSO830000${
        isSpecial ? `  - Largo: ${widthCm} cm` : ''
      }`,
      quantity: 1,
      unitPrice: widthData.duct.price,
      type: 'ducto',
    })
  );

  const grommet = isAnodized
    ? {
        code: '22000023626',
        lookupTag: 'KONGROMMET4TOMAS-ALUMINIUM',
        description: 'GROMMET ALUMINIO 4 TOMAS ACCESORIO LINK LKAC250000',
        price: 250950,
      }
    : {
        code: '22000116523',
        lookupTag: 'KONGROMMET4TOMAS-PAINTED',
        description: 'GROMMET PINTADO 4 TOMAS ACCESORIO LINK LKAC250000',
        price: 296100,
      };

  rows.push(
    createItem({
      ...grommet,
      quantity: 2,
      unitPrice: grommet.price,
      type: 'grommet',
    }),
    createItem({
      code: '22000116338',
      lookupTag: 'KUAC680000',
      description: 'KIT SOPORTE TOMAS ALTURA VARIABLE KUO KUAC680000',
      quantity: 2,
      unitPrice: 226800,
      type: 'soporte_tomas',
    })
  );

  if (config.kitFuente !== false) {
    rows.push(
      createItem({
        code: powerKitCode,
        lookupTag: 'KITFUENTEKUAC1040000',
        description:
          'KIT FUENTE ALIMENTACION ALTURA VARIABLE DL5 COLUMNAS BLANCAS KUO KUAC1040000',
        quantity: 2,
        unitPrice: powerKitCode === '22000126680' ? 4552800 : 0,
        type: 'kit_fuente',
      })
    );
  }

  if (!hasRaisedTile) {
    rows.push(
      createItem({
        code: depthData.terminal.code,
        lookupTag: `KUOPAINTEDLEGTERMINAL_16_${depthData.totalDepthCm}IZQSENC`,
        description: `COSTADO TERMINAL DOBLE ${depthData.totalDepthCm}CM CON BASE ALTURA VARIABLE KUO KUSO820000`,
        quantity: 2,
        unitPrice: depthData.terminal.price,
        type: 'costado',
      })
    );
  }

  rows.push(
    createItem({
      code: surface.code,
      lookupTag: `${surface.code}-22008689`,
      description: `${isSpecial ? 'SPECIAL: ' : ''}SUPERFICIE PRINCIPAL INTERMEDIA UNICOR CON FORMICA ${widthCm}X${depthData.depthCm}X3CM LINK ${depthData.surfacePlan}${
        isSpecial
          ? `  - Profundidad: ${depthData.totalDepthCm} cm - Largo: ${widthCm} cm - Tipo Grommet`
          : '  - Tipo Grommet'
      }`,
      quantity: 2,
      unitPrice: surface.price,
      type: 'superficie',
    })
  );

  if (widthData.beam) {
    rows.push(
      createItem({
        code: widthData.beam.code,
        lookupTag: `KUOSUPCHANNEL_${hasRaisedTile ? '18' : '16'}_020_${widthCm}`,
        description: `VIGA SOPORTE SUPERFICIE ${widthCm}CM ALTURA VARIABLE KUO KUSO420000`,
        quantity: 2,
        unitPrice: widthData.beam.price,
        type: 'viga',
      })
    );
  }

  for (const part of parts) {
    if (part.type !== 'pantalla') continue;
    rows.push(
      createItem({
        code: String(part.codigo),
        lookupTag: part.lookupTag || part.codigo,
        description: part.name,
        quantity: 1,
        unitPrice: 0,
        type: 'pantalla',
      })
    );
  }

  return rows;
}

export function calculateKuoAVDobleTotal(bom = []) {
  return bom.reduce(
    (total, item) => total + Number(item.unitPrice || 0) * Number(item.quantity || item.qty || 0),
    0
  );
}

export default buildKuoAVDobleBOM;
