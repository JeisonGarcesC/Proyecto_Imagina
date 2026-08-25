// src/mepal/kuoAV/builder/KuoAVBuilder.js
// ─────────────────────────────────────────────────────────────────────────────
// Builder determinístico para KUO AV - Superficie Perimetral.
// Conectado directamente a kuoAVTunables.js (KUO_AV_CALIBRATION) como fuente
// única de verdad para el posicionamiento canónico y offsets de calibración.
// ─────────────────────────────────────────────────────────────────────────────

import {
  KUO_AV_TUNABLES,
  KUO_AV_CALIBRATION,
  resolveKuoAVVariantAsset,
  resolveKuoAVVariantMetrics,
} from '../config/kuoAVTunables.js';
import { resolveKuoAVSurfaceRules } from '../rules/kuoAVSurfaceRules.js';
import { resolveKuoAVBaseRules } from '../rules/kuoAVBaseRules.js';
import {
  createKuoAVSurfacePart,
  createKuoAVColumnPart,
  createKuoAVCrossbarPart,
  createKuoAVPowerKitPart,
  createKuoAVSocketSupportPart,
  createKuoAVVertebraPart,
  createKuoAVGrommetPart,
  createKuoAVDuctPart,
  createKuoAVControlPadPart,
} from '../parts/kuoAVParts.js';

/**
 * Normaliza el valor de espesor numérico a partir del número o de la etiqueta de texto.
 */
function normalizeThickMm(rawThick, rawLabel, defaultThick = 30) {
  if (Number.isFinite(Number(rawThick)) && Number(rawThick) > 0) {
    return Number(rawThick);
  }
  const label = String(rawLabel || '');
  if (label.includes('18')) return 18;
  if (label.includes('25')) return 25;
  if (label.includes('30')) return 30;
  return defaultThick;
}

/**
 * Construye la definición determinista de partes de un producto KUO AV.
 *
 * @param {Object} config - Configuración seleccionada por el usuario
 * @returns {Object} { kind, groupId, groupName, config, dimMm, parts }
 */
export function buildKuoAV(config = {}) {
  // 1. Normalización de dimensiones con valores base desde KUO_AV_TUNABLES
  const defaultWidth = KUO_AV_TUNABLES.ANCHOS_MM?.[0] || 1200;
  const defaultDepth = KUO_AV_TUNABLES.FONDOS_MM?.[0] || 600;
  const defaultHeight = KUO_AV_TUNABLES.ALTURA_DEFAULT_MM || 730;
  const defaultThick = KUO_AV_TUNABLES.ESPESORES_MM?.[2] || 30;

  const widthMm = Number(config.anchoMm || config.widthMm || config.anchoRealMm || defaultWidth);
  const depthMm = Number(config.profundidadMm || config.depthMm || config.fondoRealMm || defaultDepth);
  const alturaMm = Number(config.alturaMm || defaultHeight);
  const thickMm = normalizeThickMm(config.thickMm, config.espesor, defaultThick);

  const finishCode = config.finishCode || null;
  const canto = config.canto || 'PVC-2MM';
  const especial = !!config.especial;
  const perforada = typeof config.perforada === 'boolean' ? config.perforada : false;

  // Accesorios opcionales con chequeo booleano estricto
  const kitFuente = typeof config.kitFuente === 'boolean' ? config.kitFuente : false;
  const elevarKitFIzquierdo = typeof config.elevarKitFIzquierdo === 'boolean' ? config.elevarKitFIzquierdo : false;
  const vertebraEnabled =
    typeof config.vertebraEnabled === 'boolean'
      ? config.vertebraEnabled
      : typeof config.vertebraLateral === 'boolean'
      ? config.vertebraLateral
      : false;
  const vertebraLateral =
    typeof config.vertebraLateral === 'boolean' ? config.vertebraLateral : false;
  const ladoVertebra = config.ladoVertebra === 'der' ? 'der' : 'izq';
  const acabadoGrommet = config.acabadoGrommet || 'ALUMINIUM';

  // Determinismo estricto de groupId
  const groupId =
    config.groupId ||
    `KUOAV_${widthMm}x${depthMm}_H${alturaMm}_T${thickMm}`;
  const groupName = config.groupName || 'Kuo AV Superficie Perimetral';

  // 2. Ejecución de Rules paramétricas
  const surfaceRules = resolveKuoAVSurfaceRules({
    widthMm,
    depthMm,
    thickMm,
    finishCode,
    canto,
    especial,
  });

  const baseRules = resolveKuoAVBaseRules({
    widthMm,
    depthMm,
    alturaMm,
    thickMm,
  });

  const parts = [];
  const cal = KUO_AV_CALIBRATION;

  // 3. Creación de la Superficie Perimetral Paramétrica (LKSU010010 - Procedural)
  const surfacePart = createKuoAVSurfacePart({
    groupId,
    groupName,
    widthMm,
    depthMm,
    thickMm,
    finishCode,
    canto,
    perforada,
    x: 0,
    y: baseRules.elevation.surfaceYMm,
    z: 0,
  });

  surfacePart.code = KUO_AV_TUNABLES.CET_CODES.SUPERFICIE;
  surfacePart.logicalCode = surfaceRules.logicalCode;
  surfacePart.existsInCatalog = true;
  surfacePart.rawCodigoPT = KUO_AV_TUNABLES.CET_CODES.SUPERFICIE;
  surfacePart.billingDimMm = {
    widthMm: surfaceRules.billingWidthMm,
    depthMm: surfaceRules.billingDepthMm,
    thickMm: surfaceRules.thickMm,
  };
  surfacePart.meta = {
    ...(surfacePart.meta || {}),
    isSpecial: surfaceRules.isSpecial,
    descriptionPrefix: surfaceRules.descriptionPrefix,
    descriptionSuffix: surfaceRules.descriptionSuffix,
  };
  parts.push(surfacePart);

  // 4. Costado Izquierdo con Base (KUSO800000_IZQ.glb)
  if (baseRules.leftColumn) {
    const calIzq = cal.costadoIzquierdo;
    const basePosX = -widthMm / 2;
    const basePosY = calIzq?.posicionMm?.y ?? 0.0;
    const basePosZ = calIzq?.posicionMm?.z ?? 300.0;
    const posX = basePosX + (calIzq?.offsetMm?.x || 0);
    const posY = basePosY + (calIzq?.offsetMm?.y || 0);
    const posZ = basePosZ + (calIzq?.offsetMm?.z || 0);

    const leftColumnPart = createKuoAVColumnPart({
      groupId,
      groupName,
      side: 'left',
      alturaMm: baseRules.alturaMm,
      depthMm,
      x: posX,
      y: posY,
      z: posZ,
    });
    parts.push(leftColumnPart);
  }

  // 5. Costado Derecho con Base (KUSO800000_DER.glb)
  if (baseRules.rightColumn) {
    const calDer = cal.costadoDerecho;
    const basePosX = widthMm / 2 - 76.0;
    const basePosY = calDer?.posicionMm?.y ?? 0.0;
    const basePosZ = calDer?.posicionMm?.z ?? 300.0;
    const posX = basePosX + (calDer?.offsetMm?.x || 0);
    const posY = basePosY + (calDer?.offsetMm?.y || 0);
    const posZ = basePosZ + (calDer?.offsetMm?.z || 0);

    const rightColumnPart = createKuoAVColumnPart({
      groupId,
      groupName,
      side: 'right',
      alturaMm: baseRules.alturaMm,
      depthMm,
      x: posX,
      y: posY,
      z: posZ,
    });
    parts.push(rightColumnPart);
  }

  // 6. Viga Soporte de Superficie (Selección de variante automática KUSO420000_120/150/165)
  const vigaGlbName = resolveKuoAVVariantAsset({ component: 'vigaSoporte', anchoMm: widthMm });
  const vigaMetrics = resolveKuoAVVariantMetrics({ component: 'vigaSoporte', anchoMm: widthMm });
  if (baseRules.crossbar) {
    const calViga = cal.vigaSoporte;
    const basePosX = vigaMetrics?.posX ?? -widthMm / 2;
    const basePosY = calViga?.posicionMm?.y ?? 660.0;
    const basePosZ = calViga?.posicionMm?.z ?? 250.0;
    const posX = basePosX + (calViga?.offsetMm?.x || 0);
    const posY = basePosY + (calViga?.offsetMm?.y || 0);
    const posZ = basePosZ + (calViga?.offsetMm?.z || 0);

    const crossbarPart = createKuoAVCrossbarPart({
      groupId,
      groupName,
      widthMm: vigaMetrics?.widthRealMm || widthMm,
      modelSrc: vigaGlbName ? `${KUO_AV_TUNABLES.GLB_BASE}${vigaGlbName}` : null,
      x: posX,
      y: posY,
      z: posZ,
    });
    parts.push(crossbarPart);
  }

  // 7. Ducto de Cableado (Selección de variante automática KUSO860000_120/150/165)
  const ductoGlbName = resolveKuoAVVariantAsset({ component: 'ductoCableado', anchoMm: widthMm });
  const ductoMetrics = resolveKuoAVVariantMetrics({ component: 'ductoCableado', anchoMm: widthMm });
  const calDucto = cal.ductoCableado;
  const baseDuctoX = ductoMetrics?.posX ?? -widthMm / 2;
  const baseDuctoY = calDucto?.posicionMm?.y ?? 303.0;
  const baseDuctoZ = calDucto?.posicionMm?.z ?? -149.0;
  const ductoX = baseDuctoX + (calDucto?.offsetMm?.x || 0);
  const ductoY = baseDuctoY + (calDucto?.offsetMm?.y || 0);
  const ductoZ = baseDuctoZ + (calDucto?.offsetMm?.z || 0);

  const ductPart = createKuoAVDuctPart({
    groupId,
    groupName,
    modelSrc: ductoGlbName ? `${KUO_AV_TUNABLES.GLB_BASE}${ductoGlbName}` : null,
    x: ductoX,
    y: ductoY,
    z: ductoZ,
  });
  parts.push(ductPart);

  // Registro en consola de variante seleccionada
  if (typeof console !== 'undefined' && console.log) {
    console.log(`[KUO VARIANT]\nMesa: ${widthMm}\nViga: ${vigaGlbName}\nDucto: ${ductoGlbName}`);
  }

  // 8. Botonera LINAK (DPBK06 - Componente Lógico/BOM)
  const calBotonera = cal.botonera;
  const baseBot = calBotonera?.posicionMm || calBotonera?.posicionImaginaCanonicaMm || { x: 510.0, y: 706.6, z: 274.0 };
  const botX = baseBot.x + (calBotonera?.offsetMm?.x || 0);
  const botY = baseBot.y + (calBotonera?.offsetMm?.y || 0);
  const botZ = baseBot.z + (calBotonera?.offsetMm?.z || 0);

  const controlPadPart = createKuoAVControlPadPart({
    groupId,
    groupName,
    x: botX,
    y: botY,
    z: botZ,
  });
  parts.push(controlPadPart);

  // 9. Accesorios Opcionales: Parales / Columnas Motorizadas y Soporte de Tomas
  if (kitFuente) {
    // 9a. Columna Motorizada Izquierda (KUAC1040000_74.glb)
    const calKitIzq = cal.kitFuenteIzq || cal.kitFuente;
    const baseKitIzqX = -widthMm / 2 + 15.6;
    const baseKitIzqY = calKitIzq?.posicionMm?.y ?? 15.0;
    const baseKitIzqZ = calKitIzq?.posicionMm?.z ?? 32.7;
    const kitIzqX = baseKitIzqX + (calKitIzq?.offsetMm?.x || 0);
    const kitIzqY = baseKitIzqY + (calKitIzq?.offsetMm?.y || 0);
    const kitIzqZ = baseKitIzqZ + (calKitIzq?.offsetMm?.z || 0);

    const powerKitPartIzq = createKuoAVPowerKitPart({
      groupId,
      groupName,
      side: 'left',
      elevado: elevarKitFIzquierdo,
      x: kitIzqX,
      y: kitIzqY,
      z: kitIzqZ,
    });
    parts.push(powerKitPartIzq);

    // 9b. Columna Motorizada Derecha (KUAC1040000_74.glb)
    const calKitDer = cal.kitFuenteDer;
    const baseKitDerX = widthMm / 2 - 69.4;
    const baseKitDerY = calKitDer?.posicionMm?.y ?? 15.0;
    const baseKitDerZ = calKitDer?.posicionMm?.z ?? 32.7;
    const kitDerX = baseKitDerX + (calKitDer?.offsetMm?.x || 0);
    const kitDerY = baseKitDerY + (calKitDer?.offsetMm?.y || 0);
    const kitDerZ = baseKitDerZ + (calKitDer?.offsetMm?.z || 0);

    const powerKitPartDer = createKuoAVPowerKitPart({
      groupId,
      groupName,
      side: 'right',
      elevado: false,
      x: kitDerX,
      y: kitDerY,
      z: kitDerZ,
    });
    parts.push(powerKitPartDer);

    const calSoporte = cal.soporteTomas;
    const baseSop = calSoporte?.posicionImaginaCanonicaMm || calSoporte?.posicionMm || { x: -303.51, y: 558.00, z: -70.07 };
    const sopX = baseSop.x + (calSoporte?.offsetMm?.x || 0);
    const sopY = baseSop.y + (calSoporte?.offsetMm?.y || 0);
    const sopZ = baseSop.z + (calSoporte?.offsetMm?.z || 0);

    const socketSupportPart = createKuoAVSocketSupportPart({
      groupId,
      groupName,
      x: sopX,
      y: sopY,
      z: sopZ,
    });
    parts.push(socketSupportPart);
  }

  // 10. Vértebra Metálica Pasacables (ÚNICAMENTE si vertebraLateral === true)
  if (vertebraEnabled) {
    const calVert = vertebraLateral ? cal.vertebraLateral : cal.vertebraCentral;
    const baseVert = calVert?.posicionMm || calVert?.posicionImaginaCanonicaMm || { x: -35.0, y: 25.0, z: -88.7 };
    const vertX = baseVert.x + (calVert?.offsetMm?.x || 0);
    const vertY = baseVert.y + (calVert?.offsetMm?.y || 0);
    const vertZ = baseVert.z + (calVert?.offsetMm?.z || 0);

    const vertebraPart = createKuoAVVertebraPart({
      groupId,
      groupName,
      alturaMm,
      lado: ladoVertebra,
      isLateral: vertebraLateral,
      x: vertX,
      y: vertY,
      z: vertZ,
    });

    parts.push(vertebraPart);
  }

  // 11. Grommet Pasatapas (si está configurado y no es NONE)
  if (acabadoGrommet && acabadoGrommet !== 'NONE') {
    const isDoble = !!(config.tipoGrommet === 'doble' || config.grommetDoble);
    const grommetGlbName = resolveKuoAVVariantAsset({
      component: 'grommet',
      tipoGrommet: isDoble ? 'doble' : 'simple',
      config,
    });
    const grommetMetrics = resolveKuoAVVariantMetrics({
      component: 'grommet',
      tipoGrommet: isDoble ? 'doble' : 'simple',
      config,
    });
    const calGrommet = cal.grommet;
    const baseGrom = calGrommet?.posicionImaginaCanonicaMm || calGrommet?.posicionMm || grommetMetrics || { x: -256.0, y: 696.44, z: -184.62 };
    const baseGromX = baseGrom.x ?? grommetMetrics?.posX ?? -256.0;
    const baseGromY = baseGrom.y ?? grommetMetrics?.posY ?? 696.44;
    const baseGromZ = baseGrom.z ?? grommetMetrics?.posZ ?? -184.62;
    const gromX = baseGromX + (calGrommet?.offsetMm?.x || 0);
    const gromY = baseGromY + (calGrommet?.offsetMm?.y || 0);
    const gromZ = baseGromZ + (calGrommet?.offsetMm?.z || 0);

    console.log('[KUO GROMMET CALIBRATION]', {
      tunablePosition: calGrommet?.posicionImaginaCanonicaMm || calGrommet?.posicionMm,
      tunableOffset: calGrommet?.offsetMm,
      finalPosition: { x: gromX, y: gromY, z: gromZ },
    });

    const grommetPart = createKuoAVGrommetPart({
      groupId,
      groupName,
      finish: acabadoGrommet,
      tipo: isDoble ? 'doble' : 'simple',
      modelSrc: grommetGlbName ? `${KUO_AV_TUNABLES.GLB_BASE}${grommetGlbName}` : null,
      x: gromX,
      y: gromY,
      z: gromZ,
    });
    parts.push(grommetPart);

    if (typeof console !== 'undefined' && console.log) {
      console.log(`[KUO LKAC250000 FINAL]\nPosition:\n[${gromX.toFixed(2)}, ${gromY.toFixed(2)}, ${gromZ.toFixed(2)}]\nRotation:\n[0, 0, 0]\nScale:\n[1, 1, 1]\nLocal BBox:\nmin [0.00, 0.00, -115.50]\nmax [512.00, 33.56, 0.00]\nWorld BBox:\nmin [${(gromX).toFixed(2)}, ${(gromY).toFixed(2)}, ${(gromZ - 115.50).toFixed(2)}]\nmax [${(gromX + 512.00).toFixed(2)}, ${(gromY + 33.56).toFixed(2)}, ${(gromZ).toFixed(2)}]\nDimensions:\n512.00 x 33.56 x 115.50 mm\nSurface Top:\n730.00 mm\nSurface Bottom:\n700.00 mm\nEmbedding:\n32.00 mm\nOffset aplicado:\nX = ${(calGrommet?.offsetMm?.x || 0).toFixed(2)}\nY = ${(calGrommet?.offsetMm?.y || 0).toFixed(2)}\nZ = ${(calGrommet?.offsetMm?.z || 0).toFixed(2)}`);
    }
  }

  // 12. Retorno de estructura completa serializable
  const normalizedConfig = {
    anchoMm: widthMm,
    profundidadMm: depthMm,
    alturaMm: baseRules.alturaMm,
    thickMm,
    espesor: config.espesor || `Espesor Formica ${thickMm}`,
    espesorTipo: config.espesorTipo || config.espesor || `Formica ${thickMm}`,
    finishCode,
    canto,
    perforada,
    kitFuente,
    kitFuenteColor: config.kitFuenteColor || config.acabadoParales || 'Blanco',
    elevarKitFIzquierdo,
    vertebraEnabled,
    vertebraLateral,
    ladoVertebra,
    acabadoGrommet,
    especial: surfaceRules.isSpecial,
    instanceId: config.instanceId || null,
    groupId,
  };

  return {
    kind: 'KUO_AV_ASSEMBLY',
    groupId,
    groupName,
    config: normalizedConfig,
    dimMm: {
      widthMm,
      depthMm,
      alturaMm: baseRules.alturaMm,
      thickMm,
    },
    parts,
  };
}

export default buildKuoAV;
