import {
  getCostadosConfig,
  getSuperficiesConfig,
  getPantallasConfig,
  getGrommetsConfig,
  getVigasConfig,
  getDuctosConfig,
  getPasacablesConfig,
} from './rules/koncisaRules';

import { createCostado } from './parts/costados';
import { createSuperficie } from './parts/superficies';
import { createPantalla } from './parts/pantallas';
import { createGrommet } from './parts/grommets';
import { createViga } from './parts/vigas';
import { createDucto } from './parts/ductos';
import { createPasacable } from './parts/pasacables';

import { resolveKoncisaFloorDuct } from './rules/koncisaFloorDuctRules';
import { resolveKoncisaCeilingDuct } from './rules/koncisaCeilingDuctRules';

function normalizeCostadoZone(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase();

  if (['LEFT', 'IZQUIERDA', 'IZQ', 'L'].includes(text)) return 'LEFT';
  if (['RIGHT', 'DERECHA', 'DER', 'R'].includes(text)) return 'RIGHT';
  if (['INTERMEDIO', 'INTERMEDIA', 'MIDDLE', 'CENTER', 'CENTRO'].includes(text)) {
    return 'INTERMEDIO';
  }
  if (['TERMINAL'].includes(text)) return 'TERMINAL';

  return null;
}

function inferCostadoZone(costadoConfig = {}, costadoPart = null) {
  const explicit =
    normalizeCostadoZone(costadoConfig.replaceZone) ||
    normalizeCostadoZone(costadoConfig.zone) ||
    normalizeCostadoZone(costadoConfig.side) ||
    normalizeCostadoZone(costadoConfig.lado) ||
    normalizeCostadoZone(costadoConfig.posicion) ||
    normalizeCostadoZone(costadoConfig.position) ||
    normalizeCostadoZone(costadoPart?.meta?.replaceZone) ||
    normalizeCostadoZone(costadoPart?.meta?.side) ||
    normalizeCostadoZone(costadoPart?.lado);

  if (explicit) return explicit;

  const tipo = String(costadoConfig.tipo || costadoConfig.forma || '').toUpperCase();

  if (tipo.includes('INTER')) return 'INTERMEDIO';
  if (tipo.includes('TERMINAL')) return 'TERMINAL';
  if (tipo.includes('IZQ')) return 'LEFT';
  if (tipo.includes('DER')) return 'RIGHT';

  return 'TERMINAL';
}

function makeCostadoReplaceKey({ moduleIndex = 0, replaceZone = 'TERMINAL' } = {}) {
  return `KONCISA_COSTADO_${Number(moduleIndex)}_${String(replaceZone).toUpperCase()}`;
}

function attachCostadoReplaceMetadata(costadoPart, costadoConfig = {}, fallbackIndex = 0) {
  if (!costadoPart) return costadoPart;

  const moduleIndex = inferModuleIndex(costadoConfig, fallbackIndex);
  const replaceZone = inferCostadoZone(costadoConfig, costadoPart);

  const replaceKey = makeCostadoReplaceKey({
    moduleIndex,
    replaceZone,
  });

  costadoPart.meta = {
    ...(costadoPart.meta || {}),
    category: 'costados',
    tipoPuesto: costadoConfig.tipoPuesto,
    moduleIndex,
    replaceZone,
    replaceKey,
  };

  costadoPart.replaceKey = replaceKey;

  return costadoPart;
}

function inferModuleIndex(config = {}, fallback = 0) {
  const candidates = [
    config.moduleIndex,
    config.index,
    config.puestoIndex,
    config.moduloIndex,
    config.i,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return Number(fallback || 0);
}

function attachSurfaceModuleMetadata(surfacePart, surfaceConfig = {}, fallbackIndex = 0) {
  if (!surfacePart) return surfacePart;

  const moduleIndex = inferModuleIndex(surfaceConfig, fallbackIndex);

  surfacePart.meta = {
    ...(surfacePart.meta || {}),
    moduleIndex,
  };

  surfacePart.moduleIndex = moduleIndex;

  return surfacePart;
}

function attachVigaModuleMetadata(vigaPart, vigaConfig = {}, fallbackIndex = 0) {
  if (!vigaPart) return vigaPart;

  const moduleIndex = inferModuleIndex(vigaConfig, fallbackIndex);

  vigaPart.meta = {
    ...(vigaPart.meta || {}),
    moduleIndex,
  };

  vigaPart.moduleIndex = moduleIndex;

  return vigaPart;
}

export function buildKoncisaPlus(config = {}) {
  const groupId = `KONCISA_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const groupName = `Koncisa Plus`;

  const {
    puestos = 1,
    tipoPuesto = 'sencillo',
    tipoCostado = 'RECT',

    // medidas reales
    largoRealMm = 1200,
    anchoRealMm = 600,

    // medidas de cobro / código
    largoCobroMm = 1200,
    anchoCobroMm = 600,

    tipoPasoCable = 'none',
    pasacablePosition = 'CENTER',
    grommetFinish = 'ALUMINIUM',
    hasDuct = true,

    // superficie
    finishCode = '22008689',
    thickMm = 25,
    variant = '',
    ductModes = [],
  } = config;

  const parts = [];

  // ========================
  // COSTADOS
  // ========================
  const costados = getCostadosConfig({
    puestos,
    tipoPuesto,
    tipoCostado,
    largoRealMm,
    anchoRealMm,
  });

  costados.forEach((c) => {
    const costadoPart = createCostado({
      groupId,
      groupName,
      tipo: c.tipo,
      lado: c.lado,
      forma: c.forma,
      tipoPuesto: c.tipoPuesto,
      depthMm: c.depthMm,
      x: c.x,
      y: c.y ?? 0,
      z: c.z ?? 0,
    });

    costadoPart.meta = {
      ...(costadoPart.meta || {}),
      category: 'costados',
      moduleIndex: c.moduleIndex,
      replaceZone: c.replaceZone,
      replaceKey: c.replaceKey,
      pedestalTarget: true,
    };

    costadoPart.replaceKey = c.replaceKey;

    parts.push(costadoPart);
  });

  // ========================
  // SUPERFICIES
  // ========================
  const superficies = getSuperficiesConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
    largoCobroMm,
    anchoCobroMm,
    thickMm,
    finishCode,
    variant,
  });

  superficies.forEach((s, index) => {
    const surfacePart = createSuperficie({
      groupId,
      groupName,

      // medidas reales
      widthMm: s.widthMm,
      depthMm: s.depthMm,

      // medidas de cobro
      billingWidthMm: s.billingWidthMm,
      billingDepthMm: s.billingDepthMm,

      thickMm: s.thickMm,
      shape: s.shape || 'RECT',
      finishCode: s.finishCode,
      variant: s.variant,

      perforada: s.perforada ?? false,
      canto: s.canto || 'PVC-2MM',

      x: s.x,
      y: s.y ?? 710,
      z: s.z ?? 0,
      index: s.index ?? index,
    });

    parts.push(attachSurfaceModuleMetadata(surfacePart, s, index));
  });

  // ========================
  // PANTALLAS NATIVAS ANTIGUAS
  // ========================
  // Nota: si ya estás creando pantallas desde addKoncisaPrivacyPanel en LeftPanel,
  // puedes dejar este bloque comentado para evitar duplicados.
  /*
  const pantallas = getPantallasConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
  });

  pantallas.forEach((p) => {
    parts.push(
      createPantalla({
        groupId,
        tipo: p.tipo,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        thickMm: p.thickMm,
        x: p.x,
        y: p.y ?? 750,
        z: p.z ?? 0,
      })
    );
  });
  */

  // ========================
  // GROMMETS / PASACABLES
  // ========================
  if (tipoPasoCable === 'grommet') {
    const grommets = getGrommetsConfig({
      puestos,
      tipoPuesto,
      largoRealMm,
      anchoRealMm,
    });

    grommets.forEach((g) => {
      parts.push(
        createGrommet({
          groupId,
          groupName,
          finish: grommetFinish,
          diameterMm: g.diameterMm || 80,
          x: g.x,
          y: g.y ?? 740, //altura grommet
          z: g.z ?? 0,
          rotY: g.rotY ?? 0,
        })
      );
    });
  }

  if (tipoPasoCable === 'pasacable') {
    const pasacables = getPasacablesConfig({
      puestos,
      tipoPuesto,
      largoRealMm,
      anchoRealMm,
      position: pasacablePosition,
    });

    pasacables.forEach((p) => {
      parts.push(
        createPasacable({
          groupId,
          groupName,
          x: p.x,
          y: p.y,
          z: p.z,
          rotY: p.rotY,
        })
      );
    });
  }

  // ========================
  // VIGAS
  // ========================
  const vigas = getVigasConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
  });

  vigas.forEach((v, index) => {
    const vigaPart = createViga({
      groupId,
      groupName,
      nominalWidthMm: v.nominalWidthMm,
      x: v.x,
      y: v.y ?? 650,
      z: v.z ?? 0,
    });

    parts.push(attachVigaModuleMetadata(vigaPart, v, index));
  });

  // ========================
  // DUCTOS
  // ========================
  const ductos = getDuctosConfig({
    puestos,
    tipoPuesto,
    largoRealMm,
    anchoRealMm,
    hasDuct,
    ductModes,
  });

  ductos.forEach((d) => {
    parts.push(
      createDucto({
        groupId,
        groupName,
        tipoPuesto: d.tipoPuesto,
        tipoModulo: d.tipoModulo,
        nominalWidthMm: d.nominalWidthMm,
        x: d.x ?? 0,
        y: d.y ?? 0,
        z: d.z ?? 0,
        rotX: d.rotX ?? 0,
        rotY: d.rotY ?? 0,
        rotZ: d.rotZ ?? 0,
        side: d.side ?? 'LEFT',
      })
    );
  });

  // ========================
  // DUCTO BAJANTE A PISO
  // 1 por isla
  // ========================
  if (config.floorDuct?.enabled) {
    const ductosNormales = parts.filter((p) => p.type === 'ducto');

    const referenceDuct =
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'TERMINAL') ||
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'INDIVIDUAL') ||
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'INTERMEDIO') ||
      ductosNormales[0] ||
      null;

    const referenceDuctType = String(referenceDuct?.meta?.tipoModulo || 'TERMINAL').toUpperCase();

    const floorDuct = resolveKoncisaFloorDuct({
      tipoPuesto,
      tipoPasoCable,
      referenceDuctType,
    });

    const basePosition = referenceDuct?.position || {
      x: 0,
      y: 0,
      z: 0,
    };

    const baseRotation = referenceDuct?.rotation || {
      x: 0,
      y: 0,
      z: 0,
    };

    const offset = floorDuct.offsetFromReferenceMm || {};

    parts.push({
      type: 'ductoPiso',
      line: 'KONCISA.PLUS',
      code: floorDuct.code,
      logicalCode: floorDuct.logicalCode,
      name: floorDuct.name,

      groupId,
      groupName,

      position: {
        x: (basePosition.x || 0) + (offset.x || 0),
        y: (basePosition.y || 0) + (offset.y || 0),
        z: (basePosition.z || 0) + (offset.z || 0),
      },

      rotation: {
        x: baseRotation.x || 0,
        y: (baseRotation.y || 0) + (offset.rotY || 0),
        z: baseRotation.z || 0,
      },

      model: {
        kind: 'glb',
        src: floorDuct.modelSrc,
      },

      meta: {
        category: 'ductos-a-piso',
        tipoPuesto,
        tipoPasoCable,
        tipoModuloReferencia: referenceDuctType,
        referenceDuctCode: referenceDuct?.code || null,
        modelCode: floorDuct.modelCode,
        onePerIsland: true,
      },
    });
  }

  // ========================
  // DUCTO BAJANTE A TECHO
  // 1 por isla
  // ========================
  if (config.ceilingDuct?.enabled) {
    const ductosNormales = parts.filter((p) => p.type === 'ducto');

    const selectedSide =
      String(config.ceilingDuct?.side || 'LEFT').toUpperCase() === 'RIGHT' ? 'RIGHT' : 'LEFT';

    const referenceDuct =
      ductosNormales.find(
        (p) =>
          String(p.meta?.tipoModulo || '').toUpperCase() === 'TERMINAL' &&
          String(p.meta?.side || p.side || '').toUpperCase() === selectedSide
      ) ||
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'TERMINAL') ||
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'INDIVIDUAL') ||
      ductosNormales.find((p) => String(p.meta?.tipoModulo || '').toUpperCase() === 'INTERMEDIO') ||
      ductosNormales[0] ||
      null;

    const ceilingDuct = resolveKoncisaCeilingDuct({
      tipoPuesto,
      side: selectedSide,
    });

    const basePosition = referenceDuct?.position || {
      x: 0,
      y: 0,
      z: 0,
    };

    const baseRotation = referenceDuct?.rotation || {
      x: 0,
      y: 0,
      z: 0,
    };

    const leftResolved = resolveKoncisaCeilingDuct({
      tipoPuesto,
      side: 'LEFT',
    });

    const rightResolved = resolveKoncisaCeilingDuct({
      tipoPuesto,
      side: 'RIGHT',
    });

    const leftOffset = leftResolved.offsetFromReferenceMm || {};
    const rightOffset = rightResolved.offsetFromReferenceMm || {};

    const leftPosition = {
      x: (basePosition.x || 0) + (leftOffset.x || 0),
      y: (basePosition.y || 0) + (leftOffset.y || 0),
      z: (basePosition.z || 0) + (leftOffset.z || 0),
    };

    const rightPosition = {
      x: (basePosition.x || 0) + (rightOffset.x || 0),
      y: (basePosition.y || 0) + (rightOffset.y || 0),
      z: (basePosition.z || 0) + (rightOffset.z || 0),
    };

    const leftRotation = {
      x: baseRotation.x || 0,
      y: (baseRotation.y || 0) + (leftOffset.rotY || 0),
      z: baseRotation.z || 0,
    };

    const rightRotation = {
      x: baseRotation.x || 0,
      y: (baseRotation.y || 0) + (rightOffset.rotY || 0),
      z: baseRotation.z || 0,
    };

    const selectedPosition = selectedSide === 'RIGHT' ? rightPosition : leftPosition;
    const selectedRotation = selectedSide === 'RIGHT' ? rightRotation : leftRotation;

    parts.push({
      type: 'ductoTecho',
      line: 'KONCISA.PLUS',
      code: ceilingDuct.code,
      logicalCode: ceilingDuct.logicalCode,
      name: ceilingDuct.name,

      groupId,
      groupName,

      position: selectedPosition,

      rotation: selectedRotation,

      model: {
        kind: 'glb',
        src: ceilingDuct.modelSrc,
      },

      meta: {
        category: 'ductos-a-techo',
        tipoPuesto,
        side: selectedSide,
        modelCode: ceilingDuct.modelCode,
        referenceDuctCode: referenceDuct?.code || null,
        referenceDuctType: referenceDuct?.meta?.tipoModulo || null,
        onePerIsland: true,

        sideTransformsMm: {
          LEFT: {
            position: leftPosition,
            rotation: leftRotation,
          },
          RIGHT: {
            position: rightPosition,
            rotation: rightRotation,
          },
        },
      },
    });
  }

  return {
    groupId,
    groupName,
    parts,
  };
}
