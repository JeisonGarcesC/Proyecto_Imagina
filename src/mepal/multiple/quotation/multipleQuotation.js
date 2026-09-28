import { createMultipleCommercialSummary } from './multipleCommercialSummary.js';
import { buildMultiple } from '../builders/MultipleBuilder.js';

export function createMultipleQuotation(product) {
  const summary = createMultipleCommercialSummary(product);
  return { product: 'MULTIPLE', title: `MULTIPLE_PANEL ${summary.configuration.width}x${summary.configuration.height}`,
    configuration: summary.configuration, components: summary.components, subtotal: summary.totals.subtotal,
    total: summary.totals.total, currency: summary.totals.currency, pricesComplete: summary.status.complete,
    status: summary.status, diagnostics: summary.diagnostics };
}

export function createMultipleSystemQuotation(systemObject) {
  if (systemObject?.userData?.kind !== 'MULTIPLE_SYSTEM') throw new Error('MULTIPLE_SYSTEM_REQUIRED');
  const modules = systemObject.children.filter((child) => child.userData?.kind === 'MULTIPLE_PRODUCT').map((product) => {
    const definition = buildMultiple(product.userData.config); const quotation = createMultipleQuotation(definition);
    const accessorySubtotal = definition.parts.filter((part) => part.commercial.includeInBOM !== false && (part.componentRole === 'CABLE_TRAY' || part.componentRole.startsWith('COLUMN_')))
      .reduce((sum, part) => sum + Number(part.commercial.price || 0), 0);
    return { moduleId: product.userData.moduleId, type: product.userData.config?.door?.enabled ? 'DOOR' : 'PANEL',
      quotation, baseSubtotal: quotation.subtotal - accessorySubtotal, accessorySubtotal };
  });
  const subtotal = modules.reduce((sum, module) => sum + Number(module.quotation.subtotal || 0), 0);
  const currencies = new Set(modules.map((module) => module.quotation.currency).filter(Boolean));
  const diagnostics = modules.flatMap((module) => module.quotation.diagnostics.map((item) => ({ ...item, moduleId: module.moduleId })));
  return { product: 'MULTIPLE_SYSTEM', title: 'Sistema MULTIPLE', modules,
    subtotals: { modules: modules.filter((module) => module.type === 'PANEL').reduce((sum, module) => sum + module.baseSubtotal, 0),
      doors: modules.filter((module) => module.type === 'DOOR').reduce((sum, module) => sum + module.baseSubtotal, 0),
      accessories: modules.reduce((sum, module) => sum + module.accessorySubtotal, 0) },
    subtotal, total: subtotal, currency: currencies.size === 1 ? [...currencies][0] : null,
    pricesComplete: modules.every((module) => module.quotation.pricesComplete) && currencies.size <= 1,
    status: { complete: modules.every((module) => module.quotation.pricesComplete) && currencies.size <= 1 }, diagnostics };
}
