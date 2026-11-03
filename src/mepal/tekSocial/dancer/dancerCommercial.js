import { findTekSocialPriceItems } from '../catalog/tekSocialLoader.js';
import { DANCER_VERTEBRA, getDancerModel, normalizeDancerConfig } from './dancerCatalog.js';

const PRICE_LISTS = ['CO', 'EUC', 'USD'];

function normalizeCountry(country) {
  const key = String(country || 'CO')
    .trim()
    .toUpperCase();
  return PRICE_LISTS.includes(key) ? key : 'CO';
}

function normalizeDescription(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function readTierLengthCm(model, description) {
  const match = model.descriptionPattern.exec(description);
  if (!match) return null;
  if (model.shape === 'circular') return model.nominalLengthCm;
  const length = Number(match[1]);
  return Number.isFinite(length) ? length : null;
}

// Busca, en una lista de precios, las medidas comerciales del plano (por descripción)
// y devuelve la menor medida comercial que cubre el largo solicitado.
async function resolveTableTier(model, lengthCm, list) {
  const items = await findTekSocialPriceItems(
    (item) => model.descriptionPattern.test(normalizeDescription(item.descripcion)),
    list
  );
  const tiers = items
    .map((item) => ({
      item,
      lengthCm: readTierLengthCm(model, normalizeDescription(item.descripcion)),
    }))
    .filter((tier) => tier.lengthCm != null)
    .sort((a, b) => a.lengthCm - b.lengthCm);
  if (!tiers.length) return null;
  return tiers.find((tier) => tier.lengthCm >= lengthCm) || tiers[tiers.length - 1];
}

async function resolveVertebraItem(list) {
  const target = normalizeDescription(DANCER_VERTEBRA.description);
  const items = await findTekSocialPriceItems(
    (item) => normalizeDescription(item.descripcion) === target,
    list
  );
  return items[0] || null;
}

function describeSpecialLength(description, tierLengthCm, lengthCm) {
  const resized = String(description || '').replace(
    new RegExp(`\\b${tierLengthCm}(X|CM)`),
    `${lengthCm}$1`
  );
  return `ESPECIAL (${lengthCm}CM) - ${resized}`;
}

// Resuelve código, descripción y precios (CO / EUC / USD) de una mesa Dancer configurada.
// Nada de precios fijos: todo viene de las listas XML.
export async function resolveDancerCommercial(config, country = 'CO') {
  const normalized = normalizeDancerConfig(config);
  const model = getDancerModel(normalized.planCode);
  const countryKey = normalizeCountry(country);

  const byList = await Promise.all(
    PRICE_LISTS.map(async (list) => ({
      list,
      tier: await resolveTableTier(model, normalized.lengthCm, list),
      vertebra: normalized.vertebra ? await resolveVertebraItem(list) : null,
    }))
  );

  const preferred =
    byList.find((entry) => entry.list === countryKey && entry.tier) ||
    byList.find((entry) => entry.tier) ||
    null;
  const tier = preferred?.tier || null;
  const tierLengthCm = tier?.lengthCm ?? normalized.lengthCm;
  const isSpecial = Boolean(tier) && tierLengthCm !== normalized.lengthCm;

  const priceOf = (pick) =>
    Object.fromEntries(
      byList.map((entry) => [entry.list, Number(pick(entry)?.precio || 0)])
    );
  const unitPriceOf = (prices) => Number(prices[countryKey] || prices.CO || 0);

  const baseDescription = tier?.item.descripcion || model.planCode;
  const description = isSpecial
    ? describeSpecialLength(baseDescription, tierLengthCm, normalized.lengthCm)
    : baseDescription;

  const tablePrices = priceOf((entry) => entry.tier?.item);
  const parts = [
    {
      code: tier?.item.codigo || model.planCode,
      description,
      qty: 1,
      unitPrice: unitPriceOf(tablePrices),
      prices: tablePrices,
    },
  ];

  if (normalized.vertebra) {
    const vertebraItem = byList.find((entry) => entry.vertebra)?.vertebra || null;
    const vertebraPrices = priceOf((entry) => entry.vertebra);
    parts.push({
      code: vertebraItem?.codigo || DANCER_VERTEBRA.planCode,
      description: vertebraItem?.descripcion || DANCER_VERTEBRA.description,
      qty: model.vertebraCount,
      unitPrice: unitPriceOf(vertebraPrices),
      prices: vertebraPrices,
    });
  }

  return {
    config: normalized,
    model,
    description,
    billingCode: tier?.item.codigo || null,
    tierLengthCm,
    isSpecial,
    found: Boolean(tier),
    parts,
  };
}
