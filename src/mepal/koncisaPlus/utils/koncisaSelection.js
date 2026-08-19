const KONCISA_ASSEMBLY_KINDS = new Set(['KONCISA_PLUS_ASSEMBLY']);

const KONCISA_EDITABLE_KINDS = new Set([
  'SURFACE',
  'PRIVACY_PANEL',
  'ducto',
  'ductoPiso',
  'ductoTecho',
  'pedestal',
  'costado',
  'costadoIntegracionUnitario',
  'grommet',
  'pasacable',
  'viga',
]);

const KONCISA_EDITABLE_CATEGORIES = new Set([
  'superficies',
  'pantallas',
  'costados',
  'pedestales',
  'ductos',
  'ductos-a-piso',
  'ductos_a_piso',
  'ductos-a-techo',
  'ductos_a_techo',
  'grommets',
  'pasacables',
  'vigas',
]);

export function isKoncisaAssemblyRoot(object) {
  return (
    KONCISA_ASSEMBLY_KINDS.has(object?.userData?.kind) ||
    object?.userData?.type === 'koncisa-plus'
  );
}

export function isKoncisaPhysicalEditableRoot(object) {
  if (!object || isKoncisaAssemblyRoot(object)) return false;
  if (object.userData?.isPartRoot === true) return true;

  const kind = object.userData?.kind;
  const category = object.userData?.meta?.category;
  return KONCISA_EDITABLE_KINDS.has(kind) || KONCISA_EDITABLE_CATEGORIES.has(category);
}

export function getEditableKoncisaPartObject(object) {
  let current = object;
  let fallback = null;

  while (current) {
    if (isKoncisaAssemblyRoot(current)) break;
    if (current.userData?.isPartRoot === true) return current;
    if (!fallback && isKoncisaPhysicalEditableRoot(current)) fallback = current;
    current = current.parent || null;
  }

  return fallback;
}
