import {
  MILA_ACCESSORY_CATALOG,
  MILA_ACCESSORY_OFFSETS_MM,
  MILA_BUILDER_TUNE,
  MILA_DOUBLE_BUILDER_TUNE,
  MILA_DOUBLE_MODEL_SOURCES,
  MILA_MODEL_SOURCES,
  MILA_SINGLE_SEAT_MODE_OFFSETS_MM,
  resolveMilaCenterSupportOffsetMm,
  resolveMilaDoubleCenterSupportOffsetMm,
  resolveMilaScreenCatalogItem,
} from '../config/milaTunables.js';

const MILA_VARIANTS = {
  single: {
    key: 'single',
    category: 'mila',
    codePrefix: 'MILA',
    groupName: 'Mila',
    label: 'Mila',
    line: 'MILA',
    seatCode: '22000127935',
    tableSeatCode: '22000130198',
    tableSeatGrommetCode: '22000130198',
    legCode: '22000127142',
    beamCode: '22000127143',
    centerSupportCode: '22000127149',
    beamCount: 2,
    modelSources: MILA_MODEL_SOURCES,
    tune: MILA_BUILDER_TUNE,
    resolveCenterSupportOffsetMm: resolveMilaCenterSupportOffsetMm,
  },
  double: {
    key: 'double',
    category: 'mila-double',
    codePrefix: 'MILA_DOUBLE',
    groupName: 'Mila doble',
    label: 'Mila doble',
    line: 'MILA_DOUBLE',
    seatCode: 'TKSSI180000_W_SEAT',
    legCode: '22000127983',
    beamCode: '22000127143',
    centerSupportCode: '22000127149',
    beamCount: 4,
    modelSources: MILA_DOUBLE_MODEL_SOURCES,
    tune: MILA_DOUBLE_BUILDER_TUNE,
    resolveCenterSupportOffsetMm: resolveMilaDoubleCenterSupportOffsetMm,
  },
};

function resolveMilaSingleSeatSelection({ variant, useTable = false, useTableGrommet = false }) {
  if (variant.key !== 'single' || !useTable) {
    return {
      seatMode: 'chair',
      seatCode: variant.seatCode,
      seatModelSrc: variant.modelSources.seat,
      seatLabel: 'asiento',
      seatOffsetMm: MILA_SINGLE_SEAT_MODE_OFFSETS_MM.chair,
    };
  }

  if (useTableGrommet) {
    return {
      seatMode: 'tableGrommet',
      seatCode: variant.tableSeatGrommetCode,
      seatModelSrc: variant.modelSources.tableSeatGrommet,
      seatLabel: 'mesa con grommet',
      seatOffsetMm: MILA_SINGLE_SEAT_MODE_OFFSETS_MM.tableGrommet,
    };
  }

  return {
    seatMode: 'table',
    seatCode: variant.tableSeatCode,
    seatModelSrc: variant.modelSources.tableSeat,
    seatLabel: 'mesa',
    seatOffsetMm: MILA_SINGLE_SEAT_MODE_OFFSETS_MM.table,
  };
}

function resolveMilaBeamCode(quantity) {
  const q = Math.max(1, Math.min(4, Math.trunc(Number(quantity) || 1)));
  const beamCodes = {
    1: '22000127143',
    2: '22000127144',
    3: '22000127145',
    4: '22000127146',
  };
  return beamCodes[q] || '22000127143';
}

function resolveMilaVariant(variantKey) {
  return MILA_VARIANTS[variantKey] || MILA_VARIANTS.single;
}

function createMilaGroupId(prefix = 'MILA') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createMilaSeatPart({
  groupId,
  groupName,
  seatIndex,
  offsetX,
  moduleSpacingMm,
  variant,
  useTable,
  useTableGrommet,
}) {
  const seatSelection = resolveMilaSingleSeatSelection({ variant, useTable, useTableGrommet });

  return {
    type: 'GLB_PART',
    subtype: 'seat',
    line: variant.line,
    groupId,
    groupName,
    code: seatSelection.seatCode,
    logicalCode: `${variant.codePrefix}_SEAT_${seatIndex + 1}`,
    name: `${variant.label} ${seatSelection.seatLabel} ${seatIndex + 1}`,
    description:
      seatSelection.seatMode === 'table' || seatSelection.seatMode === 'tableGrommet'
        ? 'Mesa Mila'
        : 'ASIENTO ESTRUCTURA MADERA TAPIZADO EN TELA GAMA 1 POLTRONA TEK SOCIAL (MILA V2) TKSSI130000',
    prices:
      seatSelection.seatMode === 'table' || seatSelection.seatMode === 'tableGrommet'
        ? { CO: 820000, USD: 115, EUC: 220 }
        : { CO: 1166550, USD: 154, EUC: 305 },
    model: { src: seatSelection.seatModelSrc },
    position: {
      x: offsetX + Number(seatSelection.seatOffsetMm?.x || 0),
      y: Number(seatSelection.seatOffsetMm?.y || 0),
      z: Number(seatSelection.seatOffsetMm?.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: variant.category,
      role: 'seat',
      seatMode: seatSelection.seatMode,
      seatIndex,
      moduleSpacingMm,
    },
  };
}

export function createMilaArmrestLeftPart({
  groupId,
  groupName,
  variant,
  moduleSpacingMm,
}) {
  const cat = MILA_ACCESSORY_CATALOG.armrestLeft;
  const offset = MILA_ACCESSORY_OFFSETS_MM.armrestLeft;
  return {
    type: 'GLB_PART',
    subtype: 'armrest-left',
    line: variant?.line || 'MILA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant?.codePrefix || 'MILA'}_ARMREST_LEFT`,
    name: `${variant?.label || 'Mila'} apoyabrazos izquierdo`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: variant?.category || 'mila',
      role: 'armrest-left',
      moduleSpacingMm,
    },
  };
}

export function createMilaArmrestRightPart({
  groupId,
  groupName,
  variant,
  quantity,
  moduleSpacingMm,
}) {
  const cat = MILA_ACCESSORY_CATALOG.armrestRight;
  const offset = MILA_ACCESSORY_OFFSETS_MM.armrestRight;
  const rightAnchorSeat = Math.max(1, quantity);
  const rightAnchorX = (rightAnchorSeat - 1) * moduleSpacingMm;
  return {
    type: 'GLB_PART',
    subtype: 'armrest-right',
    line: variant?.line || 'MILA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant?.codePrefix || 'MILA'}_ARMREST_RIGHT`,
    name: `${variant?.label || 'Mila'} apoyabrazos derecho`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: rightAnchorX + 600 + Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: variant?.category || 'mila',
      role: 'armrest-right',
      quantity,
      moduleSpacingMm,
    },
  };
}

export function createMilaArmrestCenterPart({
  groupId,
  groupName,
  variant,
  seamIndex = 1,
  moduleSpacingMm,
}) {
  const cat = MILA_ACCESSORY_CATALOG.armrestCenter;
  const offset = MILA_ACCESSORY_OFFSETS_MM.armrestCenter;
  const seamX = seamIndex * moduleSpacingMm;
  return {
    type: 'GLB_PART',
    subtype: 'armrest-center',
    line: variant?.line || 'MILA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant?.codePrefix || 'MILA'}_ARMREST_CENTER_${seamIndex}`,
    name: `${variant?.label || 'Mila'} apoyabrazos intermedio ${seamIndex}`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: seamX + Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: variant?.category || 'mila',
      role: 'armrest-center',
      seamIndex,
      moduleSpacingMm,
    },
  };
}

export function createMilaScreenPart({
  groupId,
  groupName,
  variant,
  quantity,
  moduleSpacingMm,
}) {
  const cat = resolveMilaScreenCatalogItem(quantity);
  const offset = MILA_ACCESSORY_OFFSETS_MM.screen;
  return {
    type: 'GLB_PART',
    subtype: 'screen',
    line: variant?.line || 'MILA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant?.codePrefix || 'MILA'}_SCREEN_${quantity}P`,
    name: `${variant?.label || 'Mila'} ${cat.label}`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: variant?.category || 'mila',
      role: 'screen',
      quantity,
      moduleSpacingMm,
    },
  };
}

function createMilaSupportParts({ groupId, groupName, moduleSpacingMm, quantity, variant }) {
  const legSpreadMm = Math.max(220, Math.round(moduleSpacingMm * 0.42));
  const legYOffsetMm = variant.tune.OFFSET_Y_PATAS_MM;
  const beamYOffsetMm = variant.tune.OFFSET_Y_VIGAS_MM;
  const beamZOffsetMm = variant.tune.OFFSET_Z_VIGAS_MM;

  const rightAnchorSeat = Math.max(1, quantity);
  const rightAnchorX = (rightAnchorSeat - 1) * moduleSpacingMm;
  const centerSupportX = variant.resolveCenterSupportOffsetMm(quantity, moduleSpacingMm);
  const resolvedBeamCode = resolveMilaBeamCode(quantity);

  const supportParts = [
    {
      type: 'GLB_PART',
      subtype: 'leg',
      line: variant.line,
      groupId,
      groupName,
      code: variant.legCode,
      logicalCode: `${variant.codePrefix}_LEG_LEFT`,
      name: `${variant.label} pata izquierda`,
      model: { src: variant.modelSources.legs },
      position: { x: -legSpreadMm / 2, y: legYOffsetMm, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: variant.category,
        role: 'leg-left',
        supportScope: 'global',
        moduleSpacingMm,
      },
    },
    {
      type: 'GLB_PART',
      subtype: 'leg',
      line: variant.line,
      groupId,
      groupName,
      code: variant.legCode,
      logicalCode: `${variant.codePrefix}_LEG_RIGHT`,
      name: `${variant.label} pata derecha`,
      model: { src: variant.modelSources.legs },
      position: { x: rightAnchorX + legSpreadMm / 2, y: legYOffsetMm, z: 0 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      meta: {
        category: variant.category,
        role: 'leg-right',
        supportScope: 'global',
        moduleSpacingMm,
      },
    },
  ];

  const beamRoles = variant.beamCount === 4
    ? ['beam-front', 'beam-front-inner', 'beam-back-inner', 'beam-back']
    : ['beam-front', 'beam-back'];

  const beamNames = {
    'beam-front': 'viga frontal',
    'beam-front-inner': 'viga intermedia frontal',
    'beam-back-inner': 'viga intermedia trasera',
    'beam-back': 'viga trasera',
  };

  const beamTargets = beamRoles.map((role, index) => {
    if (beamRoles.length === 2) {
      return index === 0 ? -beamZOffsetMm : beamZOffsetMm;
    }

    const depthSteps = beamRoles.length - 1;
    const step = (beamZOffsetMm * 2) / depthSteps;
    return -beamZOffsetMm + step * index;
  });

  beamRoles.forEach((role, index) => {
    supportParts.push({
      type: 'GLB_PART',
      subtype: 'beam',
      line: variant.line,
      groupId,
      groupName,
      code: resolvedBeamCode,
      logicalCode: `${variant.codePrefix}_${role.toUpperCase().replace(/-/g, '_')}`,
      name: `${variant.label} ${beamNames[role] || role}`,
      model: { src: variant.modelSources.beam },
      position: { x: rightAnchorX / 2, y: beamYOffsetMm, z: beamTargets[index] },
      rotation: { x: 0, y: index === beamRoles.length - 1 ? Math.PI : 0, z: 0 },
      meta: {
        category: variant.category,
        role,
        supportScope: 'global',
        moduleSpacingMm,
      },
    });
  });

  if (Number.isFinite(centerSupportX)) {
    if (variant.key === 'double') {
      supportParts.push(
        {
          type: 'GLB_PART',
          subtype: 'leg',
          line: variant.line,
          groupId,
          groupName,
          code: variant.centerSupportCode,
          logicalCode: `${variant.codePrefix}_LEG_CENTER_SUPPORT_FRONT`,
          name: `${variant.label} apoyo central frontal`,
          model: { src: variant.modelSources.centerSupportLeg },
          position: { x: centerSupportX, y: legYOffsetMm, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          meta: {
            category: variant.category,
            role: 'leg-center-support-front',
            supportScope: 'global',
            moduleSpacingMm,
          },
        },
        {
          type: 'GLB_PART',
          subtype: 'leg',
          line: variant.line,
          groupId,
          groupName,
          code: variant.centerSupportCode,
          logicalCode: `${variant.codePrefix}_LEG_CENTER_SUPPORT_BACK`,
          name: `${variant.label} apoyo central trasero`,
          model: { src: variant.modelSources.centerSupportLeg },
          position: { x: centerSupportX, y: legYOffsetMm, z: 0 },
          rotation: { x: 0, y: Math.PI, z: 0 },
          meta: {
            category: variant.category,
            role: 'leg-center-support-back',
            supportScope: 'global',
            moduleSpacingMm,
          },
        }
      );
    } else {
      supportParts.push({
        type: 'GLB_PART',
        subtype: 'leg',
        line: variant.line,
        groupId,
        groupName,
        code: variant.centerSupportCode,
        logicalCode: `${variant.codePrefix}_LEG_CENTER_SUPPORT`,
        name: `${variant.label} apoyo central`,
        model: { src: variant.modelSources.centerSupportLeg },
        position: { x: centerSupportX, y: legYOffsetMm, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        meta: {
          category: variant.category,
          role: 'leg-center-support',
          supportScope: 'global',
          moduleSpacingMm,
        },
      });
    }
  }

  return supportParts;
}

export function buildMila({
  quantity = 1,
  moduleSpacingMm,
  variant = 'single',
  useTable = false,
  useTableGrommet = false,
  armrestLeft = false,
  armrestRight = false,
  armrestCenter = false,
  hasScreen = false,
} = {}) {
  const resolvedVariant = resolveMilaVariant(variant);
  const resolvedModuleSpacingMm = moduleSpacingMm ?? resolvedVariant.tune.SEPARACION_ENTRE_PUESTOS_MM;
  const normalizedQuantity = Math.max(
    1,
    Math.min(resolvedVariant.tune.MAX_PUESTOS, Math.trunc(Number(quantity) || 1))
  );
  const groupId = createMilaGroupId(resolvedVariant.codePrefix);
  const groupName = resolvedVariant.groupName;

  const parts = [];

  for (let seatIndex = 0; seatIndex < normalizedQuantity; seatIndex += 1) {
    const offsetX = seatIndex * resolvedModuleSpacingMm;
    parts.push(
      createMilaSeatPart({
        groupId,
        groupName,
        seatIndex,
        offsetX,
        moduleSpacingMm: resolvedModuleSpacingMm,
        variant: resolvedVariant,
        useTable,
        useTableGrommet,
      })
    );
  }

  parts.push(
    ...createMilaSupportParts({
      groupId,
      groupName,
      moduleSpacingMm: resolvedModuleSpacingMm,
      quantity: normalizedQuantity,
      variant: resolvedVariant,
    })
  );

  // Accesorios opcionales incluidos en la construcción
  if (armrestLeft) {
    parts.push(
      createMilaArmrestLeftPart({
        groupId,
        groupName,
        variant: resolvedVariant,
        moduleSpacingMm: resolvedModuleSpacingMm,
      })
    );
  }

  if (armrestRight) {
    parts.push(
      createMilaArmrestRightPart({
        groupId,
        groupName,
        variant: resolvedVariant,
        quantity: normalizedQuantity,
        moduleSpacingMm: resolvedModuleSpacingMm,
      })
    );
  }

  if (armrestCenter && normalizedQuantity > 1) {
    for (let seamIndex = 1; seamIndex < normalizedQuantity; seamIndex += 1) {
      parts.push(
        createMilaArmrestCenterPart({
          groupId,
          groupName,
          variant: resolvedVariant,
          seamIndex,
          moduleSpacingMm: resolvedModuleSpacingMm,
        })
      );
    }
  }

  if (hasScreen) {
    parts.push(
      createMilaScreenPart({
        groupId,
        groupName,
        variant: resolvedVariant,
        quantity: normalizedQuantity,
        moduleSpacingMm: resolvedModuleSpacingMm,
      })
    );
  }

  return {
    groupId,
    groupName,
    quantity: normalizedQuantity,
    moduleSpacingMm: resolvedModuleSpacingMm,
    variant: resolvedVariant.key,
    parts,
  };
}