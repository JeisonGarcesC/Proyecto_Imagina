export const MOREA_GIRO_DEFINITIONS = {
  45: {
    angleDeg: 45,
    code: 'HSU020000',
    modelSrc: '/assets/models/Morea/HSU020000.glb',
    grommetCode: 'HSU020000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU020000_GROMMET.glb',
    label: 'Superficie Curva Morea 45°',
  },
  60: {
    angleDeg: 60,
    code: 'HSU060000',
    modelSrc: '/assets/models/Morea/HSU060000.glb',
    grommetCode: 'HSU060000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU060000_GROMMET.glb',
    label: 'Superficie Curva Morea 60°',
  },
  90: {
    angleDeg: 90,
    code: 'HSU030000',
    modelSrcByVariant: {
      single: '/assets/models/Morea/HSU030000.glb',
      double: '/assets/models/Morea/HSU070000.glb',
    },
    codeByVariant: {
      single: 'HSU030000',
      double: 'HSU070000',
    },
    grommetCodeByVariant: {
      single: 'HSU030000_GROMMET',
      double: 'HSU070000_GROMMET',
    },
    grommetModelSrcByVariant: {
      single: '/assets/models/Morea/HSU030000_GROMMET.glb',
      double: '/assets/models/Morea/HSU070000_GROMMET.glb',
    },
    label: 'Superficie Curva Morea 90°',
  },
  180: {
    angleDeg: 180,
    code: 'HSU010000',
    modelSrc: '/assets/models/Morea/HSU010000-69cm.glb',
    modelSrcByVariant: {
      single: '/assets/models/Morea/HSU010000-69cm.glb',
      double: '/assets/models/Morea/HSU010000-138cm.glb',
    },
    label: 'Superficie Terminal Morea',
  },
  // Alias legacy para no romper configuraciones antiguas de ángulo.
  // Se resuelven contra un ángulo base con inversión de orientación.
  120: {
    angleDeg: 120,
    code: 'HSU060000',
    modelSrc: '/assets/models/Morea/HSU060000.glb',
    grommetCode: 'HSU060000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU060000_GROMMET.glb',
    label: 'Legacy 120° (invertida de 60°)',
    hiddenFromPanel: true,
  },
  135: {
    angleDeg: 135,
    code: 'HSU020000',
    modelSrc: '/assets/models/Morea/HSU020000.glb',
    grommetCode: 'HSU020000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU020000_GROMMET.glb',
    label: 'Legacy 135° (invertida de 45°)',
    hiddenFromPanel: true,
  },
  150: {
    angleDeg: 150,
    code: 'HSU070000',
    modelSrc: '/assets/models/Morea/HSU070000.glb',
    grommetCode: 'HSU070000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU070000_GROMMET.glb',
    label: 'Legacy 150° (HSU070000)',
    hiddenFromPanel: true,
  },
  270: {
    angleDeg: 270,
    code: 'HSU070000',
    modelSrc: '/assets/models/Morea/HSU070000.glb',
    grommetCode: 'HSU070000_GROMMET',
    grommetModelSrc: '/assets/models/Morea/HSU070000_GROMMET.glb',
    label: 'Legacy 270° (invertida de 150°)',
    hiddenFromPanel: true,
  },
};

const MOREA_GIRO_INVERTED_ALIAS_MAP = {
  120: 60,
  135: 45,
  270: 150,
};

export const MOREA_GIRO_SPAWN_Y_MM = 340;

function resolveMoreaVariant(variant) {
  return String(variant || '').trim().toLowerCase() === 'double' ? 'double' : 'single';
}

export function resolveMoreaGiroDefinition(angle, variant = 'single', useGrommet = false) {
  const requestedAngleDeg = Number(angle);
  const hasInvertedAlias = Object.prototype.hasOwnProperty.call(
    MOREA_GIRO_INVERTED_ALIAS_MAP,
    requestedAngleDeg
  );
  const connectorAngleDeg = hasInvertedAlias
    ? Number(MOREA_GIRO_INVERTED_ALIAS_MAP[requestedAngleDeg])
    : requestedAngleDeg;

  const def = MOREA_GIRO_DEFINITIONS[connectorAngleDeg] || MOREA_GIRO_DEFINITIONS[60];
  const normalizedVariant = resolveMoreaVariant(variant);

  const variantModelSrc =
    def.modelSrcByVariant?.[normalizedVariant] ||
    def.modelSrcByVariant?.single ||
    def.modelSrc;

  const variantCode =
    def.codeByVariant?.[normalizedVariant] ||
    def.codeByVariant?.single ||
    def.code;

  const variantGrommetModelSrc =
    def.grommetModelSrcByVariant?.[normalizedVariant] ||
    def.grommetModelSrcByVariant?.single ||
    def.grommetModelSrc;

  const variantGrommetCode =
    def.grommetCodeByVariant?.[normalizedVariant] ||
    def.grommetCodeByVariant?.single ||
    def.grommetCode;

  const supportsGrommet = Boolean(variantGrommetModelSrc && variantGrommetCode);
  const modelSrc = useGrommet && supportsGrommet ? variantGrommetModelSrc : variantModelSrc;
  const code = useGrommet && supportsGrommet ? variantGrommetCode : variantCode;

  return {
    ...def,
    angleDeg: Number.isFinite(requestedAngleDeg) ? requestedAngleDeg : def.angleDeg,
    connectorAngleDeg,
    invertConnectorFacing: hasInvertedAlias,
    isInvertedAlias: hasInvertedAlias,
    resolvedVariant: normalizedVariant,
    modelSrc,
    code,
    useGrommet: useGrommet && supportsGrommet,
  };
}

export async function createMoreaGiroInstance({ api, config = {} } = {}) {
  if (!api) return null;

  const explicitCode = String(config.code || config.codigoPT || '').trim();
  const explicitModelSrc = String(config.modelSrc || '').trim();
  const explicitLabel = String(config.label || '').trim();
  const angle = Number(config.angle || 60);
  const requestedGrommet = Boolean(config.useGrommet);
  const variant = resolveMoreaVariant(config.giroVariant || config.variant);
  const resolvedByAngle = resolveMoreaGiroDefinition(angle, variant, requestedGrommet);
  const def = {
    ...resolvedByAngle,
    code: explicitCode || resolvedByAngle.code,
    modelSrc: explicitModelSrc || resolvedByAngle.modelSrc,
    label: explicitLabel || resolvedByAngle.label,
  };

  const instanceId = `MOREA_GIRO_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  await api.addExternalGlbPart({
    kind: 'MOREA_GIRO_SURFACE',
    type: 'MOREA_GIRO_SURFACE',
    line: 'MOREA',
    category: 'morea',
    code: def.code,
    codigoPT: def.code,
    name: `${def.label} Morea`,
    model: { src: def.modelSrc },
    position: { x: 0, y: MOREA_GIRO_SPAWN_Y_MM, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    meta: {
      role: 'giro-surface',
      angleDeg: def.angleDeg,
      connectorAngleDeg: def.connectorAngleDeg,
      invertConnectorFacing: Boolean(def.invertConnectorFacing),
      useGrommet: def.useGrommet,
      moreaVariant: def.resolvedVariant,
      isPartRoot: true,
      instanceId,
    },
    extraUserData: {
      angleDeg: def.angleDeg,
      connectorAngleDeg: def.connectorAngleDeg,
      invertConnectorFacing: Boolean(def.invertConnectorFacing),
      useGrommet: def.useGrommet,
      moreaVariant: def.resolvedVariant,
    },
  });

  return instanceId;
}
