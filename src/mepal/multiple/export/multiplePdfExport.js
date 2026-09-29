import { createMultipleCommercialSummary } from '../quotation/multipleCommercialSummary.js';

export function createMultiplePdfData(product) {
  const summary = createMultipleCommercialSummary(product);
  return { documentType: 'MULTIPLE_COMMERCIAL_QUOTATION', product: summary.product,
    information: { title: `MULTIPLE ${summary.configuration.width}x${summary.configuration.height}`, configuration: summary.configuration },
    bom: summary.components, totals: summary.totals, status: summary.status, layout: null };
}
