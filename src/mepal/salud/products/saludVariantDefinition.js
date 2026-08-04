const SALUD_VARIANT_DEFINITIONS = Object.freeze({
  '22000127958': Object.freeze({
    normalCode: '22000127958',
    deployedCode: '22000127958_2',
  }),
  '22000129632': Object.freeze({
    normalCode: '22000129632',
    deployedCode: '22000129632_2',
  }),
});

export function normalizeSaludVariantCode(code) {
  return String(code || '')
    .trim()
    .replace(/_2$/, '');
}

export function isSaludVariantCode(code) {
  return Boolean(SALUD_VARIANT_DEFINITIONS[normalizeSaludVariantCode(code)]);
}

export function getSaludVariantByCode(code) {
  const value = String(code || '').trim();
  const baseCode = normalizeSaludVariantCode(value);
  const definition = SALUD_VARIANT_DEFINITIONS[baseCode];
  if (!definition) return null;

  const variant = value.endsWith('_2') ? 'desplegado' : 'normal';
  return {
    baseCode,
    code: variant === 'desplegado' ? definition.deployedCode : definition.normalCode,
    variant,
    label: variant === 'desplegado' ? 'Desplegado' : 'Normal',
    normalCode: definition.normalCode,
    deployedCode: definition.deployedCode,
  };
}

export function getSaludVariantOptionsByCode(code) {
  const definition = SALUD_VARIANT_DEFINITIONS[normalizeSaludVariantCode(code)];
  if (!definition) return null;

  return [
    {
      code: definition.normalCode,
      variant: 'normal',
      label: 'Normal',
    },
    {
      code: definition.deployedCode,
      variant: 'desplegado',
      label: 'Desplegado',
    },
  ];
}
