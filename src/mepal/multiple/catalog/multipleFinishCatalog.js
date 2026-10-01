export const MULTIPLE_FINISH_CATALOG = Object.freeze({
  FORMICA: Object.freeze([
    Object.freeze({ id: 'FORMICA_WHITE', label: 'Fórmica blanca', color: 0xf2f0e9 }),
    Object.freeze({ id: 'FORMICA_GRAY', label: 'Fórmica gris', color: 0xb7b7b2 }),
    Object.freeze({ id: 'FORMICA_RED', label: 'Fórmica roja', color: 0xa62c2b }),
  ]),
  METAL: Object.freeze([
    Object.freeze({ id: 'METAL_WHITE', label: 'Metal blanco', color: 0xe8e8e5 }),
    Object.freeze({ id: 'METAL_GRAY', label: 'Metal gris', color: 0x858b8d }),
  ]),
  GLASS: Object.freeze([
    Object.freeze({ id: 'GLASS_CLEAR', label: 'Vidrio transparente', color: 0xb8d9df, opacity: 0.35 }),
    Object.freeze({ id: 'GLASS_BRONZE', label: 'Vidrio bronce', color: 0x7d654f, opacity: 0.45 }),
  ]),
  PAINTED_METAL: Object.freeze([
    Object.freeze({ id: 'PAINTED_WHITE', label: 'Pintura blanca', color: 0xe5e5e2 }),
    Object.freeze({ id: 'PAINTED_GRAY', label: 'Pintura gris', color: 0x777b7d }),
  ]),
  PVC: Object.freeze([
    Object.freeze({ id: 'PVC_DARK', label: 'PVC oscuro', color: 0x292b2d }),
  ]),
  ALUMINUM: Object.freeze([]),
  FABRIC: Object.freeze([]),
  ACOUSTIC: Object.freeze([]),
  HARDWARE: Object.freeze([]),
});

// La documentación define familias de acabado, pero el XML no relaciona estos
// colores visuales con un código PT. Se conservan separados del catálogo comercial.
export const MULTIPLE_VISUAL_FINISH_CATALOG = MULTIPLE_FINISH_CATALOG;

export function findMultipleFinish(finishId) {
  for (const [role, finishes] of Object.entries(MULTIPLE_FINISH_CATALOG)) {
    const finish = finishes.find((entry) => entry.id === finishId);
    if (finish) return { ...finish, role };
  }
  return null;
}

export function isMultipleFinishAllowed(materialRole, finishId) {
  if (!finishId) return true;
  return (MULTIPLE_FINISH_CATALOG[materialRole] || []).some((finish) => finish.id === finishId);
}

export function resolveMultipleFinish(materialRole, finishId) {
  const finish = findMultipleFinish(finishId);
  if (!finishId) return { supported: true, finish: null, commercial: false, diagnostics: [] };
  if (!finish || finish.role !== materialRole) return { supported: false, finish: null, commercial: false,
    diagnostics: [{ code: 'MULTIPLE_FINISH_NOT_AVAILABLE', level: 'WARNING', materialRole, finishId }] };
  return { supported: true, finish, commercial: false,
    diagnostics: [{ code: 'MULTIPLE_FINISH_CODE_NOT_DOCUMENTED', level: 'INFO', materialRole, finishId }] };
}
