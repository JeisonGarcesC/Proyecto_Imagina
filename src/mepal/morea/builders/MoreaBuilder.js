import {
  MOREA_BUILDER_TUNE,
  MOREA_DOUBLE_BUILDER_TUNE,
  MOREA_MODEL_SOURCES,
  MOREA_DOUBLE_MODEL_SOURCES,
  MOREA_ACCESSORY_CATALOG,
  MOREA_ACCESSORY_OFFSETS_MM,
  resolveMoreaPedestalVariantByMode,
  resolveMoreaSeatVariantByMode,
  resolveMoreaCenterSupportOffsetsMm,
  resolveMoreaDoubleCenterSupportOffsetsMm,
} from '../config/moreaTunables.js';

function createMoreaGroupId(prefix = 'MOREA') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function resolveMoreaVariant(variant) {
  return String(variant || '').trim().toLowerCase() === 'double' ? 'double' : 'single';
}

function createSeatPart({ groupId, groupName, seatIndex, moduleSpacingMm, variant = 'single' }) {
  const offsetX = seatIndex * moduleSpacingMm;
  const resolvedVariant = resolveMoreaVariant(variant);
  const seatVariant = resolveMoreaSeatVariantByMode('chair', resolvedVariant);

  return {
    type: 'GLB_PART',
    subtype: 'seat',
    line: 'MOREA',
    groupId,
    groupName,
    code: seatVariant.code,
    logicalCode: `${resolvedVariant === 'double' ? 'MOREA_DOUBLE' : 'MOREA'}_SEAT_${seatIndex + 1}`,
    name: `Morea asiento ${seatIndex + 1}`,
    description: resolvedVariant === 'double' ? 'Silla doble Morea' : 'Silla Morea (espaldar y asiento)',
    model: { src: seatVariant.modelSrc },
    position: { x: offsetX, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: 'morea',
      role: 'seat',
      seatMode: 'chair',
      moreaVariant: resolvedVariant,
      seatIndex,
      moduleSpacingMm,
    },
  };
}

function createSupportParts({
  groupId,
  groupName,
  moduleSpacingMm,
  quantity,
  pedestalMode = 'normal',
  variant = 'single',
}) {
  const resolvedVariant = resolveMoreaVariant(variant);
  const isDouble = resolvedVariant === 'double';
  const tune = isDouble ? MOREA_DOUBLE_BUILDER_TUNE : MOREA_BUILDER_TUNE;
  const modelSources = isDouble ? MOREA_DOUBLE_MODEL_SOURCES : MOREA_MODEL_SOURCES;

  const sideSpreadMm = isDouble ? Math.max(220, Math.round(moduleSpacingMm * 0.42)) : Math.max(220, Math.round(moduleSpacingMm * 0.42));
  const sideYOffsetMm = tune.OFFSET_Y_LATERALES_MM;
  const beamYOffsetMm = tune.OFFSET_Y_VIGAS_MM;
  const beamZOffsetMm = tune.OFFSET_Z_VIGAS_MM;

  const rightAnchorSeat = Math.max(1, quantity);
  const rightAnchorX = (rightAnchorSeat - 1) * moduleSpacingMm;
  const centerSupportOffsets = isDouble
    ? resolveMoreaDoubleCenterSupportOffsetsMm(quantity, moduleSpacingMm)
    : resolveMoreaCenterSupportOffsetsMm(quantity, moduleSpacingMm);

  const allBeamRoles = Array.isArray(tune.BEAM_ROLES) && tune.BEAM_ROLES.length
    ? tune.BEAM_ROLES
    : ['beam-front-outer', 'beam-front-inner', 'beam-back-inner', 'beam-back-outer'];
  const disabledBeamRoles = new Set(
    (tune.DISABLED_BEAM_ROLES || []).map((role) => String(role).toLowerCase())
  );
  const beamRoles = allBeamRoles.filter((role) => !disabledBeamRoles.has(role));

  const beamDepthStep = allBeamRoles.length > 1 ? (beamZOffsetMm * 2) / (allBeamRoles.length - 1) : 0;
  const beamTargetByRole = {};
  allBeamRoles.forEach((role, index) => {
    beamTargetByRole[role] = -beamZOffsetMm + beamDepthStep * index;
  });
  const beamTargets = beamRoles.map((role) => beamTargetByRole[role] ?? 0);

  const beamNames = {
    'beam-front-outer': 'viga frontal exterior',
    'beam-front-mid': 'viga frontal media',
    'beam-front-inner': 'viga frontal interior',
    'beam-back-inner': 'viga trasera interior',
    'beam-back-mid': 'viga trasera media',
    'beam-back-outer': 'viga trasera exterior',
  };

  const pedestalVariant = resolveMoreaPedestalVariantByMode(pedestalMode, resolvedVariant);
  const resolvedPedestalMode =
    pedestalVariant.code === 'HSO100000' || pedestalVariant.code === 'HSO110000'
      ? 'wood'
      : pedestalVariant.code === 'HSO070000' || pedestalVariant.code === 'HSO090000'
        ? 'metal'
        : 'normal';

  const leftX = isDouble ? -sideSpreadMm / 2 : -sideSpreadMm / 2;
  const rightX = isDouble ? rightAnchorX + sideSpreadMm / 2 : rightAnchorX + sideSpreadMm / 2;

  const supportParts = [
    {
      type: 'GLB_PART',
      subtype: 'side',
      line: 'MOREA',
      groupId,
      groupName,
      code: pedestalVariant.code,
      logicalCode: `${isDouble ? 'MOREA_DOUBLE' : 'MOREA'}_SIDE_LEFT`,
      name: 'Morea lateral izquierdo',
      description: 'Superficie lateral Morea',
      model: { src: pedestalVariant.modelSrc },
      position: { x: leftX, y: sideYOffsetMm, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: 'morea',
        role: 'side-left',
        supportScope: 'global',
        moreaVariant: resolvedVariant,
        pedestalMode: resolvedPedestalMode,
        moduleSpacingMm,
      },
    },
    {
      type: 'GLB_PART',
      subtype: 'side',
      line: 'MOREA',
      groupId,
      groupName,
      code: pedestalVariant.code,
      logicalCode: `${isDouble ? 'MOREA_DOUBLE' : 'MOREA'}_SIDE_RIGHT`,
      name: 'Morea lateral derecho',
      description: 'Superficie lateral Morea',
      model: { src: pedestalVariant.modelSrc },
      position: { x: rightX, y: sideYOffsetMm, z: 0 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      meta: {
        category: 'morea',
        role: 'side-right',
        supportScope: 'global',
        moreaVariant: resolvedVariant,
        pedestalMode: resolvedPedestalMode,
        moduleSpacingMm,
      },
    },
  ];

  beamRoles.forEach((role, index) => {
    supportParts.push({
      type: 'GLB_PART',
      subtype: 'beam',
      line: 'MOREA',
      groupId,
      groupName,
      code: 'HSO020000_1P',
      logicalCode: `${isDouble ? 'MOREA_DOUBLE' : 'MOREA'}_${role.toUpperCase().replace(/-/g, '_')}`,
      name: `Morea ${beamNames[role] || role}`,
      description: 'Viga Morea',
      model: { src: modelSources.beam },
      position: { x: rightAnchorX / 2, y: beamYOffsetMm, z: beamTargets[index] },
      rotation: { x: 0, y: index === beamRoles.length - 1 ? Math.PI : 0, z: 0 },
      meta: {
        category: 'morea',
        role,
        supportScope: 'global',
        moreaVariant: resolvedVariant,
        moduleSpacingMm,
      },
    });
  });

  centerSupportOffsets.forEach((centerSupportX, index) => {
    supportParts.push({
      type: 'GLB_PART',
      subtype: 'side',
      line: 'MOREA',
      groupId,
      groupName,
      code: isDouble ? 'HSO060000' : 'HSO040000',
      logicalCode: `${isDouble ? 'MOREA_DOUBLE' : 'MOREA'}_SIDE_CENTER_SUPPORT_${index + 1}`,
      name: `Morea costado intermedio ${index + 1}`,
      description: 'Costado intermedio Morea',
      model: { src: isDouble ? modelSources.sideCenter : MOREA_MODEL_SOURCES.sideCenter },
      position: { x: centerSupportX, y: sideYOffsetMm, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: 'morea',
        role: 'side-center-support',
        supportScope: 'global',
        moreaVariant: resolvedVariant,
        supportIndex: index,
        quantity,
        moduleSpacingMm,
      },
    });
  });

  return supportParts;
}

function createMoreaArmrestLeftPart({
  groupId,
  groupName,
  variant = 'single',
  moduleSpacingMm,
}) {
  const cat = MOREA_ACCESSORY_CATALOG.armrestLeft;
  const offset = MOREA_ACCESSORY_OFFSETS_MM.armrestLeft;

  return {
    type: 'GLB_PART',
    subtype: 'armrest-left',
    line: 'MOREA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant === 'double' ? 'MOREA_DOUBLE' : 'MOREA'}_ARMREST_LEFT`,
    name: `${variant === 'double' ? 'Morea doble' : 'Morea'} apoyabrazos izquierdo`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: Math.PI, z: 0 },
    meta: {
      category: 'morea',
      role: 'armrest-left',
      moreaVariant: variant,
      moduleSpacingMm,
    },
  };
}

function createMoreaArmrestRightPart({
  groupId,
  groupName,
  variant = 'single',
  quantity,
  moduleSpacingMm,
}) {
  const cat = MOREA_ACCESSORY_CATALOG.armrestRight;
  const offset = MOREA_ACCESSORY_OFFSETS_MM.armrestRight;
  const rightAnchorSeat = Math.max(1, quantity);
  const rightAnchorX = (rightAnchorSeat - 1) * moduleSpacingMm;
  const seatWidthMm = variant === 'double' ? 609.97 : 609.97;

  return {
    type: 'GLB_PART',
    subtype: 'armrest-right',
    line: 'MOREA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant === 'double' ? 'MOREA_DOUBLE' : 'MOREA'}_ARMREST_RIGHT`,
    name: `${variant === 'double' ? 'Morea doble' : 'Morea'} apoyabrazos derecho`,
    description: cat.description,
    prices: cat.prices,
    model: { src: cat.modelSrc },
    position: {
      x: rightAnchorX + seatWidthMm + Number(offset.x || 0),
      y: Number(offset.y || 0),
      z: Number(offset.z || 0),
    },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: 'morea',
      role: 'armrest-right',
      moreaVariant: variant,
      quantity,
      moduleSpacingMm,
    },
  };
}

function createMoreaArmrestCenterPart({
  groupId,
  groupName,
  variant = 'single',
  seamIndex = 1,
  moduleSpacingMm,
}) {
  const cat = MOREA_ACCESSORY_CATALOG.armrestCenter;
  const offset = MOREA_ACCESSORY_OFFSETS_MM.armrestCenter;
  const seamX = seamIndex * moduleSpacingMm;

  return {
    type: 'GLB_PART',
    subtype: 'armrest-center',
    line: 'MOREA',
    groupId,
    groupName,
    code: cat.code,
    logicalCode: `${variant === 'double' ? 'MOREA_DOUBLE' : 'MOREA'}_ARMREST_CENTER_${seamIndex}`,
    name: `${variant === 'double' ? 'Morea doble' : 'Morea'} apoyabrazos intermedio ${seamIndex}`,
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
      category: 'morea',
      role: 'armrest-center',
      moreaVariant: variant,
      seamIndex,
      moduleSpacingMm,
    },
  };
}

export function buildMorea({
  quantity = 1,
  moduleSpacingMm,
  pedestalMode = 'normal',
  variant = 'single',
  armrestLeft = false,
  armrestRight = false,
  armrestCenter = false,
} = {}) {
  const resolvedVariant = resolveMoreaVariant(variant);
  const tune = resolvedVariant === 'double' ? MOREA_DOUBLE_BUILDER_TUNE : MOREA_BUILDER_TUNE;
  const resolvedModuleSpacingMm =
    moduleSpacingMm ?? tune.SEPARACION_ENTRE_PUESTOS_MM;
  const normalizedQuantity = Math.max(
    1,
    Math.min(tune.MAX_PUESTOS, Math.trunc(Number(quantity) || 1))
  );

  const groupId = createMoreaGroupId();
  const groupName = resolvedVariant === 'double' ? 'Morea Doble' : 'Morea';
  const parts = [];

  for (let seatIndex = 0; seatIndex < normalizedQuantity; seatIndex += 1) {
    parts.push(
      createSeatPart({
        groupId,
        groupName,
        seatIndex,
        moduleSpacingMm: resolvedModuleSpacingMm,
        variant: resolvedVariant,
      })
    );
  }

  parts.push(
    ...createSupportParts({
      groupId,
      groupName,
      moduleSpacingMm: resolvedModuleSpacingMm,
      quantity: normalizedQuantity,
      pedestalMode,
      variant: resolvedVariant,
    })
  );

  if (armrestLeft) {
    parts.push(
      createMoreaArmrestLeftPart({
        groupId,
        groupName,
        variant: resolvedVariant,
        moduleSpacingMm: resolvedModuleSpacingMm,
      })
    );
  }

  if (armrestRight) {
    parts.push(
      createMoreaArmrestRightPart({
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
        createMoreaArmrestCenterPart({
          groupId,
          groupName,
          variant: resolvedVariant,
          seamIndex,
          moduleSpacingMm: resolvedModuleSpacingMm,
        })
      );
    }
  }

  return {
    groupId,
    groupName,
    variant: resolvedVariant,
    quantity: normalizedQuantity,
    moduleSpacingMm: resolvedModuleSpacingMm,
    parts,
  };
}
