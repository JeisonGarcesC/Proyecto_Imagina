import { resolveLinkSurface } from '../rules/linkSurfaceRules.js';
import { LINK_COSTADO_CODES, LINK_COSTADO_INTEGRACION_CODES } from '../rules/linkCostadoRules.js';

// Mesa doble con puesto de integración: sus superficies principales se piden como terminal (no individual),
// y el costado terminal del lado de integración pasa a ser costado de integración ELSO070000.
// Solo cambia el código; descripción y precio los resuelve el catálogo XML.
export function applyLinkIntegrationPuestoBOM(rows, config, integrationCount = 0) {
  const cleanRows = (rows || []).filter(r => r.code !== '22000034843');
  if (!integrationCount || config?.type !== 'doble') return cleanRows;
  let nextRows = cleanRows;
  const individual = resolveLinkSurface(config, 'individual').code;
  const terminal = resolveLinkSurface(config, 'terminal').code;
  if (individual && terminal && individual !== terminal) {
    nextRows = nextRows.map(row => row.code === individual ? { ...row, code: terminal } : row);
  }
  const nominal = (config?.depthMm || 600) >= 750 ? 750 : 600;
  const finish = config?.supportFinish || 'PINTADO';
  const terminalCostadoCode = LINK_COSTADO_CODES.doble?.terminal?.[finish]?.[nominal];
  const integracionCostadoCode = LINK_COSTADO_INTEGRACION_CODES?.[finish]?.[nominal];
  if (terminalCostadoCode && integracionCostadoCode && terminalCostadoCode !== integracionCostadoCode) {
    let replaced = 0;
    const maxReplace = Math.min(integrationCount, 2);
    nextRows = nextRows.map(row => {
      if (row.code === terminalCostadoCode && replaced < maxReplace) {
        const canTake = Math.min(row.quantity, maxReplace - replaced);
        replaced += canTake;
        if (canTake === row.quantity) {
          return { ...row, code: integracionCostadoCode, description: `LINK costado ELSO070000 integración ${finish}` };
        }
        return { ...row, quantity: row.quantity - canTake };
      }
      return row;
    });
    if (replaced > 0 && !nextRows.some(r => r.code === integracionCostadoCode)) {
      nextRows.push({ code: integracionCostadoCode, description: `LINK costado ELSO070000 integración ${finish}`, quantity: replaced, line: 'LINK' });
    }
  }
  return nextRows;
}

export function resolveLinkBOM(product) {
  const rows = new Map();
  // El costado terminal ya incluye la tapa ducto terminal (LKSO250030 / 22000034843),
  // por lo que no es necesario facturarla por aparte en los BOM de Link.
  const isExcluded = (part) => Boolean(
    part.excludeFromBOM ||
    part.role === 'DUCT_COVER' ||
    part.code === '22000034843'
  );
  for (const part of product.parts.filter(part => !isExcluded(part))) {
    if (!part.code) continue;
    const current = rows.get(part.code);
    if (current) current.quantity += 1;
    else rows.set(part.code, { code: part.code, description: part.description, quantity: 1, line: 'LINK' });
  }
  // Componentes de BOM sin geometría 3D (p. ej. pie de amigo bajo la superficie de integración).
  for (const extra of product.bomExtras || []) {
    if (!extra.code || extra.code === '22000034843') continue;
    const current = rows.get(extra.code);
    if (current) current.quantity += extra.quantity;
    else rows.set(extra.code, { code: extra.code, description: extra.description, quantity: extra.quantity, line: 'LINK' });
  }
  const billable = product.parts.filter(part => !isExcluded(part));
  return { rows: [...rows.values()], status: billable.some(p => !p.code) ? 'PARTIAL' : 'BASE_COMPONENTS',
    missing: billable.filter(p => !p.code).map(p => ({ role: p.role, description: p.description })) };
}
