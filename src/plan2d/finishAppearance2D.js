function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMaterialCode(value) {
  const code = String(value ?? '').trim();
  return code || null;
}

function normalizeOpacity(value) {
  if (value === null || value === undefined || value === '') return null;
  const opacity = Number(value);
  return Number.isFinite(opacity) ? clamp(opacity, 0, 1) : null;
}

function getMaterialDefinition(materialsByCode, materialCode) {
  const code = normalizeMaterialCode(materialCode);
  if (!code) return null;
  if (typeof materialsByCode?.get === 'function') return materialsByCode.get(code) || null;
  return materialsByCode?.[code] || null;
}

export function rgbValueToHex(rgbValue) {
  if (typeof rgbValue !== 'string') return null;
  const value = rgbValue.trim();
  if (!value) return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [r, g, b] = value.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const channels = value.split(/[_,\s]+/).map(Number);
  if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) return null;
  const hex = channels
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex.toUpperCase()}`;
}

export function resolveMaterialColor2D(materialCode, materialsByCode) {
  const code = normalizeMaterialCode(materialCode);
  const definition = getMaterialDefinition(materialsByCode, code);
  const resolvedColor = rgbValueToHex(definition?.rgbValue);
  return resolvedColor ? { materialCode: code, resolvedColor, source: 'catalog' } : null;
}

export function resolveFinishAppearance2D(
  {
    componentKey = null,
    semanticType = null,
    meshMaterialCode = null,
    rootMaterialCode = null,
    finishMaterialCode = null,
    builderColor = null,
    visibleColor = null,
    opacity = null,
  } = {},
  materialsByCode
) {
  const selectedMaterialCode = [meshMaterialCode, rootMaterialCode, finishMaterialCode]
    .map(normalizeMaterialCode)
    .find(Boolean);
  const resolvedOpacity = normalizeOpacity(opacity);
  const catalogAppearance = resolveMaterialColor2D(selectedMaterialCode, materialsByCode);
  if (catalogAppearance) {
    return {
      componentKey,
      semanticType,
      ...catalogAppearance,
      ...(resolvedOpacity !== null ? { opacity: resolvedOpacity } : {}),
    };
  }

  const explicitBuilderColor = rgbValueToHex(builderColor);
  const verifiedVisibleColor = rgbValueToHex(visibleColor);
  const resolvedColor = explicitBuilderColor || verifiedVisibleColor;
  if (!resolvedColor) return null;
  return {
    componentKey,
    semanticType,
    materialCode: null,
    resolvedColor,
    source: explicitBuilderColor ? 'builder' : 'visible-material',
    ...(resolvedOpacity !== null ? { opacity: resolvedOpacity } : {}),
  };
}

export function resolveFinishStyle2D(baseStyle, appearance, enabled, semanticType = null) {
  const style = { ...(baseStyle || {}) };
  if (!enabled || semanticType === 'cimbra' || !appearance?.resolvedColor) return style;
  style.fill = true;
  style.fillEnabled = true;
  style.fillColor = appearance.resolvedColor;
  const opacity = normalizeOpacity(appearance.opacity);
  if (opacity !== null) style.fillOpacity = opacity;
  return style;
}
