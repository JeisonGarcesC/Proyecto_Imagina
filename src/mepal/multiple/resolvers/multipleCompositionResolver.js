import { resolveMultipleCode } from './multipleCodeResolver.js';
import { MULTIPLE_COMMERCIAL_CATALOG } from '../catalog/multipleCommercialCatalog.generated.js';

const materialByRole = { TILE_FORMICA: 'FORMICA', TILE_METAL: 'LAMINA', TILE_GLASS: 'VIDRIO', TILE_FABRIC: 'TELA' };
export function createMultipleCommercialQuery(part, product) {
  const role = part.componentRole; const visual = part.visual || {}; const config = product.config;
  if (role === 'FRAME') return { productType: 'FRAME', width: config.widthCm, height: config.heightCm, thickness: config.thicknessCm, material: null, finish: null, variant: null };
  if (role === 'BASEBOARD') return { productType: 'BASEBOARD', width: config.widthCm, height: null, thickness: null, material: null, finish: null, variant: null };
  if (role.startsWith('TILE_')) return { productType: 'TILE', width: config.widthCm, height: visual.heightCm,
    thickness: part.commercial.commercialThickness ?? null, material: materialByRole[role] || null, finish: null, variant: visual.variant || null };
  if (role === 'DOOR_FRAME_LEFT') return { productType: 'DOOR_FRAME', width: visual.widthCm, height: visual.heightCm, thickness: config.thicknessCm, material: null, finish: null, variant: visual.swing };
  if (role === 'DOOR_LEAF') return { productType: 'DOOR_LEAF', width: visual.widthCm, height: visual.heightCm, thickness: visual.materialRole === 'GLASS' ? 4 : null, material: visual.materialRole === 'GLASS' ? 'VIDRIO' : 'FORMICA', finish: null, variant: visual.swing };
  if (role === 'CABLE_TRAY') return { productType: 'CABLE_MANAGEMENT', width: null, height: visual.heightCm, thickness: null, material: null, finish: null, variant: visual.type };
  return null;
}
export function resolveMultipleCompositionCommercial(product) {
  const diagnostics = [];
  const parts = product.parts.map((part) => {
    const query = createMultipleCommercialQuery(part, product);
    if (part.commercial.code) { let matches = MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.codigoPT === part.commercial.code);
      if (part.commercial.reference) matches = matches.filter((entry) => entry.reference === part.commercial.reference);
      if (matches.length > 1 && query) matches = matches.filter((entry) => ['type', 'width', 'height', 'thickness', 'material', 'finish', 'variant'].every((field) => {
        const queryField = field === 'type' ? query.productType : query[field];
        return queryField == null || String(entry[field] ?? '').toUpperCase() === String(queryField).toUpperCase();
      }));
      const documented = matches.length === 1 ? matches[0] : null;
      const resolutionDiagnostics = matches.length > 1
        ? [{ code: 'MULTIPLE_AMBIGUOUS_COMMERCIAL_MATCH', level: 'WARNING', componentKey: part.componentKey, codigoPT: part.commercial.code, matchCount: matches.length }]
        : matches.length === 0 ? [{ code: 'MULTIPLE_CODE_NOT_DOCUMENTED', level: 'WARNING', componentKey: part.componentKey, codigoPT: part.commercial.code }] : [];
      diagnostics.push(...resolutionDiagnostics);
      return { ...part, commercial: { ...part.commercial, reference: part.commercial.reference || documented?.reference || null,
      material: part.commercial.material || documented?.material || part.visual?.materialRole || null,
      price: part.commercial.price ?? documented?.price ?? null, currency: part.commercial.currency || documented?.currency || null,
      diagnostics: resolutionDiagnostics, resolution: { supported: matches.length === 1, codigoPT: part.commercial.code, diagnostics: resolutionDiagnostics } } };
    }
    if (!query) { const diagnostic = { code: 'MULTIPLE_CODE_NOT_DOCUMENTED', level: 'WARNING', componentKey: part.componentKey };
      diagnostics.push(diagnostic); return { ...part, commercial: { ...part.commercial, reference: null, diagnostics: [diagnostic] } }; }
    const resolution = resolveMultipleCode(query); diagnostics.push(...resolution.diagnostics.map((item) => ({ ...item, componentKey: part.componentKey })));
    return { ...part, commercial: { ...part.commercial, code: resolution.codigoPT, reference: resolution.entry?.reference || null,
      material: resolution.entry?.material || part.visual?.materialRole || null, finish: resolution.entry?.finish || null,
      price: resolution.entry?.price ?? null, currency: resolution.entry?.currency || null,
      query, resolution, diagnostics: resolution.diagnostics } };
  });
  return { parts, diagnostics };
}
