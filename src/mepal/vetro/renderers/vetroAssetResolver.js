const VETRO_ASSET_DEFINITIONS = Object.freeze([]);

const upper = (value) => String(value ?? '').trim().toUpperCase();
const numberToken = (value) => value == null ? null : String(Number(value));

export function buildVetroProductKey(product = {}) {
  const type = upper(product.productType);
  const dimensions = product.dimensions || {};
  if (type === 'PANEL') {
    return ['VETRO', type, upper(product.panelMaterial?.type || product.material), numberToken(dimensions.nominalWidthCm), numberToken(dimensions.nominalHeightCm)].join('_');
  }
  if (type === 'DOOR_LEAF' || type === 'DOOR_FRAME') {
    return ['VETRO', type, upper(product.commercial?.variant || product.variant), numberToken(dimensions.nominalHeightCm), upper(product.profileFinish?.type || product.finish)].filter(Boolean).join('_');
  }
  if (type === 'PROFILE') {
    return ['VETRO', type, upper(product.subcategory), upper(product.commercial?.variant || product.variant), numberToken(dimensions.nominalLengthCm), upper(product.profileFinish?.type || product.finish)].filter(Boolean).join('_');
  }
  return ['VETRO', type, upper(product.commercial?.variant || product.variant)].filter(Boolean).join('_');
}

function normalizeVector(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return [...fallback];
  return value.map((item, index) => Number.isFinite(Number(item)) ? Number(item) : fallback[index]);
}

function normalizeDefinition(definition) {
  const assetPath = String(definition?.assetPath || definition?.src || '').trim();
  if (!assetPath) return null;
  return {
    id: String(definition.id || definition.productKey || assetPath),
    productKey: definition.productKey ? upper(definition.productKey) : null,
    codes: (definition.codes || (definition.code ? [definition.code] : [])).map(upper),
    references: (definition.references || (definition.reference ? [definition.reference] : [])).map(upper),
    variants: (definition.variants || (definition.variant ? [definition.variant] : [])).map(upper),
    categories: (definition.categories || (definition.category ? [definition.category] : [])).map(upper),
    assetPath,
    transform: {
      position: normalizeVector(definition.transform?.position, [0, 0, 0]),
      rotation: normalizeVector(definition.transform?.rotation, [0, 0, 0]),
      scale: normalizeVector(definition.transform?.scale, [1, 1, 1]),
    },
    origin: definition.origin || null,
    units: definition.units || null,
    metadata: definition.metadata ? { ...definition.metadata } : {},
  };
}

function matches(definition, identity) {
  if (definition.productKey && definition.productKey === identity.productKey) return true;
  if (definition.codes.length && definition.codes.includes(identity.code)) return true;
  if (definition.references.length && !definition.references.includes(identity.reference)) return false;
  if (definition.variants.length && !definition.variants.includes(identity.variant)) return false;
  if (definition.categories.length && !definition.categories.includes(identity.category)) return false;
  return definition.references.length > 0 || definition.variants.length > 0 || definition.categories.length > 0;
}

export function resolveVetroAsset(product = {}, options = {}) {
  const registry = options.registry || VETRO_ASSET_DEFINITIONS;
  const identity = {
    productKey: upper(buildVetroProductKey(product)),
    code: upper(product?.codeResolution?.code),
    reference: upper(product?.commercial?.reference),
    variant: upper(product?.commercial?.variant || product?.variant),
    category: upper(product?.category),
  };
  const definition = registry.map(normalizeDefinition).filter(Boolean).find((candidate) => matches(candidate, identity)) || null;
  if (!definition) {
    return {
      available: false,
      kind: null,
      src: null,
      assetPath: null,
      productKey: identity.productKey,
      diagnostic: 'VETRO_ASSET_NOT_AVAILABLE',
    };
  }
  return {
    available: true,
    kind: 'GLB',
    src: definition.assetPath,
    ...definition,
    matchedIdentity: identity,
    diagnostic: null,
  };
}

export function getVetroAssetRegistry() {
  return VETRO_ASSET_DEFINITIONS;
}
