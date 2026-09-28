import { resolveMultipleBOM } from '../bom/multipleBOM.js';
import { validateMultipleQuotation } from './multipleQuotationRules.js';

export function createMultipleCommercialSummary(product) {
  const bom = resolveMultipleBOM(product); const validation = validateMultipleQuotation(product, bom);
  const components = bom.rows.map((row) => ({ codigoPT: row.codigoPT, referencia: row.reference,
    descripcion: row.description, material: row.material, acabado: row.finish, cantidad: row.quantity,
    precio: row.price, currency: row.currency, subtotal: row.price == null ? null : Number(row.price) * row.quantity,
    status: row.status, reason: row.reason }));
  const subtotal = components.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const pendingComponents = components.filter((item) => !item.codigoPT || item.precio == null);
  return { product: 'MULTIPLE', configuration: { width: product.config.widthCm, height: product.config.heightCm,
    thickness: product.config.thicknessCm, frameMode: product.config.frameMode, composition: structuredClone(product.composition) },
    components, totals: { subtotal, total: subtotal, currency: components.find((item) => item.currency)?.currency || 'COP' },
    status: { complete: validation.valid, code: validation.code, reasons: validation.reasons, pendingComponents }, diagnostics: validation.diagnostics };
}
