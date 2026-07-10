// src/koncisaPlus/rules/koncisaVigaRules.js

export const KONCISA_VIGA_RULES = {
  1000: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_100',
    codigoPT: '22000132414',
  },
  1200: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_120',
    codigoPT: '22000132415',
  },
  1500: {
    logicalCode: 'KONPLUSSSUPCHANNEL_16_020_150',
    codigoPT: '22000132416',
  },
};

export function resolveKoncisaVigaBillingWidth(realWidthMm) {
  const width = Number(realWidthMm || 0);

  if (!Number.isFinite(width) || width <= 0) return null;

  if (width <= 1000) return 1000;
  if (width <= 1200) return 1200;
  if (width <= 1500) return 1500;

  return null;
}

export function resolveKoncisaViga({ nominalWidthMm = 1200 }) {
  const realWidthMm = Number(nominalWidthMm || 0);
  const billingWidthMm = resolveKoncisaVigaBillingWidth(realWidthMm);

  const found = billingWidthMm ? KONCISA_VIGA_RULES[billingWidthMm] || null : null;

  const isSpecial =
    !!billingWidthMm && Number.isFinite(realWidthMm) && billingWidthMm !== realWidthMm;

  return {
    logicalCode: found?.logicalCode || null,
    codigoPT: found?.codigoPT || null,
    exists: !!found,

    realWidthMm,
    billingWidthMm,
    isSpecial,

    descriptionPrefix: isSpecial ? 'ESPECIAL - ' : '',
    descriptionSuffix: isSpecial ? `Medida real ${realWidthMm / 10} cm` : '',
  };
}
