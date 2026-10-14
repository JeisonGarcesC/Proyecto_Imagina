import { resolveLinkSurface } from '../rules/linkSurfaceRules.js';

// Mesa doble con puesto de integración: sus superficies principales se piden como terminal (no individual).
// Solo cambia el código; descripción y precio los resuelve el catálogo XML.
export function applyLinkIntegrationPuestoBOM(rows, config, integrationCount = 0) {
  if (!integrationCount || config?.type !== 'doble') return rows;
  const individual = resolveLinkSurface(config, 'individual').code;
  const terminal = resolveLinkSurface(config, 'terminal').code;
  if (!individual || !terminal || individual === terminal) return rows;
  return rows.map(row => row.code === individual ? { ...row, code: terminal } : row);
}

export function resolveLinkBOM(product) {
  const rows = new Map();
  for (const part of product.parts.filter(part => !part.excludeFromBOM)) {
    if (!part.code) continue;
    const current = rows.get(part.code);
    if (current) current.quantity += 1;
    else rows.set(part.code, { code: part.code, description: part.description, quantity: 1, line: 'LINK' });
  }
  // Componentes de BOM sin geometría 3D (p. ej. pie de amigo bajo la superficie de integración).
  for (const extra of product.bomExtras || []) {
    if (!extra.code) continue;
    const current = rows.get(extra.code);
    if (current) current.quantity += extra.quantity;
    else rows.set(extra.code, { code: extra.code, description: extra.description, quantity: extra.quantity, line: 'LINK' });
  }
  const billable = product.parts.filter(part => !part.excludeFromBOM);
  return { rows: [...rows.values()], status: billable.some(p => !p.code) ? 'PARTIAL' : 'BASE_COMPONENTS',
    missing: billable.filter(p => !p.code).map(p => ({ role: p.role, description: p.description })) };
}
