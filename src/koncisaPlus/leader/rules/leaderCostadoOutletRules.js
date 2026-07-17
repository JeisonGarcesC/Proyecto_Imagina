// src/koncisaPlus/leader/rules/leaderCostadoOutletRules.js

export const KONCISA_LEADER_COSTADO_OUTLET_RULES = {
  // Costado rectangular sencillo de profundidad 600 mm
  'RECT:600': {
    logicalCode: 'KONPLUSSPAINTEDLEGTERMINAL_16_060_RECT_CAJA_TOMAS',

    codigoPT: '22000135194',
  },

  /*
   * Agrega aquí las demás referencias cuando tengas
   * confirmados sus códigos:
   *
   * 'RECT:750': {
   *   logicalCode: '...',
   *   codigoPT: '...',
   * },
   *
   * 'TRAP:600': {
   *   logicalCode: '...',
   *   codigoPT: '...',
   * },
   */
};

function normalizeCostadoForma(value) {
  const forma = String(value || 'RECT')
    .trim()
    .toUpperCase();

  if (forma.includes('RECT')) return 'RECT';
  if (forma.includes('TRAP')) return 'TRAP';
  if (forma.includes('TEK')) return 'TEK';
  if (forma.includes('ORTOGONAL')) return 'ORTOGONAL';
  if (forma === 'O') return 'O';
  if (forma.includes('CURVO')) return 'CURVO';

  return forma;
}

export function resolveLeaderCostadoWithOutlet({ forma = 'RECT', depthMm = 600 }) {
  const formaKey = normalizeCostadoForma(forma);

  const depth = Number(depthMm || 0);

  const billingDepthMm = depth <= 600 ? 600 : depth <= 750 ? 750 : null;

  const ruleKey = billingDepthMm ? `${formaKey}:${billingDepthMm}` : null;

  const found = ruleKey ? KONCISA_LEADER_COSTADO_OUTLET_RULES[ruleKey] || null : null;

  const isSpecial = !!billingDepthMm && depth !== billingDepthMm;

  return {
    logicalCode: found?.logicalCode || null,
    codigoPT: found?.codigoPT || null,
    exists: !!found,

    forma: formaKey,

    realDepthMm: depth,
    billingDepthMm,

    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL -' : '',

    descriptionSuffix: isSpecial ? `Medida real ${depth / 10} cm` : '',
  };
}
