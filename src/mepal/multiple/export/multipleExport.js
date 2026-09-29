import { createMultipleCommercialSummary } from '../quotation/multipleCommercialSummary.js';

export function createMultipleCommercialExport(product, { customer = null, generatedAt = new Date().toISOString() } = {}) {
  const summary = createMultipleCommercialSummary(product);
  return { customer, product: 'MULTIPLE', configuration: structuredClone(summary.configuration),
    bom: structuredClone(summary.components), totals: { ...summary.totals }, status: structuredClone(summary.status), generatedAt };
}
