import { validateMultipleConfiguration } from '../configurator/multipleConfigurationRules.js';

export function validateMultipleQuotation(product, bom) {
  const reasons = []; const diagnostics = [];
  const configuration = validateMultipleConfiguration(product.config);
  if (!configuration.valid) reasons.push('Configuración MULTIPLE inválida');
  const withoutCode = bom.rows.filter((row) => !row.codigoPT);
  const withoutPrice = bom.rows.filter((row) => row.price == null || !Number.isFinite(Number(row.price)));
  if (withoutCode.length) reasons.push('Componente sin código comercial');
  if (withoutPrice.length) reasons.push('Componente sin precio disponible');
  const critical = (product.diagnostics || []).filter((item) => ['ERROR', 'CRITICAL'].includes(String(item.level).toUpperCase()));
  if (critical.length) reasons.push('La solución contiene diagnósticos críticos');
  diagnostics.push(...configuration.diagnostics, ...critical);
  return { valid: reasons.length === 0, code: reasons.length ? 'MULTIPLE_QUOTATION_INCOMPLETE' : 'MULTIPLE_QUOTATION_READY',
    reasons, diagnostics, pendingCodes: withoutCode.map((row) => row.componentKey),
    pendingPrices: withoutPrice.map((row) => row.componentKey) };
}
