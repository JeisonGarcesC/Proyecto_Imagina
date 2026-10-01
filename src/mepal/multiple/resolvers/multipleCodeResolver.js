import { MULTIPLE_COMMERCIAL_CATALOG } from '../catalog/multipleCommercialCatalog.generated.js';

const norm = (value) => value == null ? null : String(value).trim().toUpperCase();
const sameNumber = (left, right) => left == null ? right == null : Number(left) === Number(right);

export function resolveMultipleCode(query = {}, catalog = MULTIPLE_COMMERCIAL_CATALOG) {
  const normalized = { productType: norm(query.productType), width: query.width ?? null, height: query.height ?? null,
    thickness: query.thickness ?? null, material: norm(query.material), finish: norm(query.finish), variant: norm(query.variant) };
  const matches = catalog.filter((entry) => norm(entry.type) === normalized.productType && sameNumber(normalized.width, entry.width)
    && sameNumber(normalized.height, entry.height) && (normalized.thickness == null || sameNumber(normalized.thickness, entry.thickness))
    && norm(entry.material) === normalized.material && norm(entry.finish) === normalized.finish && norm(entry.variant) === normalized.variant);
  if (matches.length === 1) return { supported: true, entry: matches[0], codigoPT: matches[0].codigoPT, diagnostics: [] };
  const code = matches.length > 1 ? 'MULTIPLE_AMBIGUOUS_COMMERCIAL_MATCH' : 'MULTIPLE_CODE_NOT_DOCUMENTED';
  return { supported: false, entry: null, codigoPT: null, diagnostics: [{ code, level: 'WARNING', query: normalized, matchCount: matches.length }] };
}
