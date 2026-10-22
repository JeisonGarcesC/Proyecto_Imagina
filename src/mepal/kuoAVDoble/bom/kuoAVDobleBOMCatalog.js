import { KUO_AV_BOM_CATALOG, resolveKuoAVBotonera } from '../../kuoAV/bom/kuoAVBOMCatalog.js';
import { KUO_AV_PANTALLA_CATALOG } from '../../kuoAV/config/kuoAVPantallaCatalog.js';
import {
  formatKuoAVCm,
  resolveKuoAVNominalDepth,
  resolveKuoAVNominalWidth,
} from '../../kuoAV/config/kuoAVTunables.js';

const WIDTH_BOM = Object.freeze({
  1200: Object.freeze({
    widthCm: 120,
    duct: Object.freeze({ code: '22000134915', price: 479850 }),
    surfaces: Object.freeze({
      600: Object.freeze({ code: '22000008989', price: 527100 }),
      750: Object.freeze({ code: '22000008992', price: 708750 }),
    }),
    melaminaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000114423', price: 350700 }),
      750: Object.freeze({ code: '22000114428', price: 428400 }),
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
    melaminaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000114425', price: 537600 }),
      750: Object.freeze({ code: '22000114430', price: 695100 }),
    }),
    beam: Object.freeze({ code: '22000116336', price: 327600 }),
  }),
  1650: Object.freeze({
    widthCm: 165,
    duct: Object.freeze({ code: '22000134916', price: 573300 }),
    surfaces: Object.freeze({
      600: Object.freeze({ code: '22000114412', price: 895650 }),
      750: Object.freeze({ code: '22000114414', price: 1176000 }),
    }),
    // Códigos del mapa de producto sin precio en PriceList_CO_2.xml.
    melaminaSurfaces: Object.freeze({
      600: Object.freeze({ code: '22000114426', price: 0 }),
      750: Object.freeze({ code: '22000114431', price: 0 }),
    }),
    beam: Object.freeze({ code: '22000116694', price: 332850 }),
  }),
});

const DEPTH_BOM = Object.freeze({
  600: Object.freeze({
    depthCm: 60,
    totalDepthCm: 120,
    surfacePlan: 'LKSU010010',
    terminal: Object.freeze({ code: '22000134918', price: 664650 }),
    intermediate: Object.freeze({ code: '22000134920', price: 1034250 }),
    intermediateDuctSupport: Object.freeze({ code: '22000134922', price: 970200 }),
  }),
  750: Object.freeze({
    depthCm: 75,
    totalDepthCm: 150,
    surfacePlan: 'LKSU010020',
    terminal: Object.freeze({ code: '22000134919', price: 697200 }),
    intermediate: Object.freeze({ code: '22000134921', price: 1017450 }),
    intermediateDuctSupport: Object.freeze({ code: '22000134923', price: 1018500 }),
  }),
});

/**
 * Soporte en la unión `batchIndex` de un lote de puestos dobles (mapa de producto):
 * los extremos llevan costado terminal KUSO820000 y las uniones usan por defecto
 * KUSO840000 (con ducto, acceso de cableado desde piso).
 * `selection` permite elegir KUSO850000 (soporte ducto) en una union.
 */
export const KUO_AV_DOBLE_INTERMEDIATE_SUPPORTS = Object.freeze([
  Object.freeze({ value: 'AUTO', label: 'Automático (intermedio con ducto KUSO840000)' }),
  Object.freeze({ value: 'KUSO840000', label: 'Intermedio con ducto · cableado desde piso (KUSO840000)' }),
  Object.freeze({ value: 'KUSO850000', label: 'Soporte intermedio ducto (KUSO850000)' }),
]);

export function resolveKuoAVDobleIntermediateType(batchIndex, selection = 'AUTO') {
  if (selection === 'KUSO840000' || selection === 'KUSO850000') return selection;
  return 'KUSO840000';
}

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toLocaleUpperCase('es');
}

// Mapa de producto: superficies, vigas y ductos rematables se piden con la
// medida nominal superior; los costados dobles (no rematables) usan 120 para
// fondos de 60 a 74 cm y 150 para 75 cm.
function resolveWidth(widthMm) {
  return resolveKuoAVNominalWidth(widthMm);
}

function resolveSurfaceDepth(depthMm) {
  return resolveKuoAVNominalDepth(depthMm);
}

function resolveSupportDepth(depthMm) {
  return Number(depthMm) >= 750 ? 750 : 600;
}

function resolveSurfaceMaterial(config) {
  return normalizeUpper(config.espesorTipo || 'FORMICA 30').includes('MELAMINA')
    ? 'MELAMINA'
    : 'FORMICA';
}

function isMelaminaSurface(config) {
  return resolveSurfaceMaterial(config) === 'MELAMINA';
}

function createItem({ code, lookupTag, description, quantity, unitPrice, type, category }) {
  const categoryByType = {
    control: 'BOTONERA',
    vertebra: 'DUCTO',
    ducto: 'DUCTOS',
    grommet: 'GROMMET',
    soporte_tomas: 'KIT',
    kit_fuente: 'SOPORTE',
    costado: 'SOPORTE',
    superficie: 'SUPERFICIE',
    viga: 'VIGAS',
    pantalla: 'PANTALLA',
  };
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
    category: category || categoryByType[type] || 'COMPONENTES',
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
  return (
    !!WIDTH_BOM[width]?.surfaces?.[resolveSurfaceDepth(depthMm)] &&
    !!DEPTH_BOM[resolveSupportDepth(depthMm)] &&
    thickMm === 30
  );
}

export function buildKuoAVDobleBOM(config = {}, parts = []) {
  if (!hasConfirmedKuoAVDobleBOM(config)) {
    return buildFallbackBom(parts);
  }

  const realWidthMm = Number(config.anchoMm || 1200);
  const realDepthMm = Number(config.profundidadMm || 600);
  const width = resolveWidth(realWidthMm);
  const surfaceDepthMm = resolveSurfaceDepth(realDepthMm);
  const widthData = WIDTH_BOM[width];
  const depthData = DEPTH_BOM[resolveSupportDepth(realDepthMm)];
  const surfaceDepthData = DEPTH_BOM[surfaceDepthMm];
  const surface = (isMelaminaSurface(config) ? widthData.melaminaSurfaces : widthData.surfaces)[surfaceDepthMm];
  const { widthCm } = widthData;
  const isSpecial =
    !!config.especial || realWidthMm !== width || realDepthMm !== surfaceDepthMm;
  const isMelamina = resolveSurfaceMaterial(config) === 'MELAMINA';
  const hasRaisedTile = !!config.baldosaFormica;
  const isAnodized = ['ANODIZADO', 'ALUMINIUM', 'ALUMINIO'].includes(
    normalizeUpper(config.acabadoGrommet || 'ANODIZADO')
  );
  const powerKitColor = normalizeUpper(config.kitFuenteColor || 'BLANCO');
  const powerKit = KUO_AV_BOM_CATALOG.powerKits[powerKitColor] ||
    KUO_AV_BOM_CATALOG.powerKits.BLANCO;
  const batchSize = Math.max(1, Math.trunc(Number(config.kuoBatchSize) || 1));
  const batchIndex = Math.max(0, Math.trunc(Number(config.kuoBatchIndex) || 0));
  const hasSharedIntermediateSupport = batchSize > 1 && !hasRaisedTile;
  const vertebraQuantity = Number(config.vertebraLeftEnabled ?? true) +
    Number(config.vertebraRightEnabled ?? true);
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

  const botonera = resolveKuoAVBotonera(config.botoneraCode);
  rows.push(
    createItem({
      code: botonera.code,
      lookupTag: botonera.lookupTag,
      description: botonera.description,
      quantity: 2,
      unitPrice: botonera.price,
      type: 'control',
    }),
    createItem({
      code: widthData.duct.code,
      lookupTag: isSpecial
        ? widthData.duct.code
        : `KUOCABLEDUCTDOUBLETER${widthCm}`,
      description: `${isSpecial ? 'SPECIAL: ' : ''}DUCTO CABLEADO ${widthCm}CM ALTURA VARIABLE KUO KUSO830000${
        isSpecial ? `  - Largo: ${formatKuoAVCm(realWidthMm)} cm` : ''
      }`,
      quantity: 1,
      unitPrice: widthData.duct.price,
      type: 'ducto',
    })
  );

  if (vertebraQuantity > 0) {
    rows.splice(1, 0, createItem({
      code: '22000116690',
      lookupTag: 'KUAC650000',
      description: 'VERTEBRA METALICA 86CM ALTURA VARIABLE KUO KUAC650000',
      quantity: vertebraQuantity,
      unitPrice: 277200,
      type: 'vertebra',
    }));
  }

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
        code: powerKit.code,
        lookupTag: powerKit.lookupTag,
        description: powerKit.description,
        quantity: 2,
        unitPrice: powerKit.price,
        type: 'kit_fuente',
      })
    );
  }

  if (!hasRaisedTile && (!hasSharedIntermediateSupport || batchIndex === 0)) {
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

  if (hasSharedIntermediateSupport && batchIndex > 0) {
    const withDuct = resolveKuoAVDobleIntermediateType(batchIndex, config.soporteIntermedio) === 'KUSO840000';
    const support = withDuct ? depthData.intermediate : depthData.intermediateDuctSupport;
    rows.push(
      createItem({
        code: support.code,
        lookupTag: withDuct
          ? `KUOPAINTEDLEGINTERMEDIATE_16_${depthData.totalDepthCm}SENC`
          : support.code,
        description: withDuct
          ? `COSTADO INTERMEDIO DOBLE ${depthData.totalDepthCm}CM CON BASE ALTURA VARIABLE KUO KUSO840000`
          : `COSTADO INTERMEDIO ${depthData.totalDepthCm}CM SOPORTE DUCTO DOBLE ALTURA VARIABLE KUO KUSO850000`,
        quantity: 1,
        unitPrice: support.price,
        type: 'costado',
      })
    );
  }

  const surfaceRow = createItem({
    code: surface.code,
    lookupTag: `${surface.code}-${isMelamina ? '22015138' : '22008689'}`,
    description: `${isSpecial ? 'SPECIAL: ' : ''}SUPERFICIE PRINCIPAL INTERMEDIA ${
      isMelamina ? 'MELAMINA' : 'UNICOR CON FORMICA'
    } ${widthCm}X${surfaceDepthData.depthCm}X3CM LINK ${surfaceDepthData.surfacePlan}${
      isSpecial
        ? `  - Profundidad: ${formatKuoAVCm(realDepthMm * 2)} cm - Largo: ${formatKuoAVCm(realWidthMm)} cm - Tipo Grommet`
        : '  - Tipo Grommet'
    }`,
    quantity: 2,
    unitPrice: surface.price,
    type: 'superficie',
  });
  rows.push(surfaceRow);

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
    const screenCatalogItem = Object.values(KUO_AV_PANTALLA_CATALOG)
      .flatMap((byWidth) => Object.values(byWidth))
      .find((item) => item.codigoPT === String(part.codigo));
    rows.push(
      createItem({
        code: String(part.codigo),
        lookupTag: part.lookupTag || part.codigo,
        description: part.name,
        quantity: 1,
        unitPrice: screenCatalogItem?.price || 0,
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
