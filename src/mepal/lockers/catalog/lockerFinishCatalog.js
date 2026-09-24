export const LOCKER_FINISH_OPTIONS = Object.freeze([
  {
    id: 'FORMICA_30',
    label: 'Formica 30 mm',
    material: 'FORMICA',
    // Mismo codigo de catalogo que usa Koncisa Plus para Formica (materia prima compartida).
    finishCode: '22008689',
    color: '#d6c1a0',
  },
  {
    id: 'FORMICA_25',
    label: 'Formica 25 mm',
    material: 'FORMICA',
    finishCode: '22008689',
    color: '#d9c5a3',
  },
  {
    id: 'MELAMINA_25',
    label: 'Melamina 25 mm',
    material: 'MELAMINA',
    finishCode: '22015137',
    color: '#eee9e0',
  },
  {
    id: 'MELAMINA_18',
    label: 'Melamina 18 mm',
    material: 'MELAMINA',
    finishCode: '22015139',
    color: '#f2efe9',
  },
  {
    id: 'METALICA_LISO',
    label: 'Metálica lisa',
    material: 'METALICA',
    finishCode: 'LOCKER_METALICA_LISO',
    color: '#9ca3af',
  },
  {
    id: 'METALICA_EMBEBIDA',
    label: 'Metálica embebida',
    material: 'METALICA_EMBEBIDA',
    finishCode: 'LOCKER_METALICA_EMBEBIDA',
    color: '#bec5cf',
  },
]);

export const LOCKER_FINISH_BY_ID = Object.freeze(
  Object.fromEntries(LOCKER_FINISH_OPTIONS.map((option) => [option.id, option]))
);

export function resolveLockerFinishOption(value, fallbackMaterial = null) {
  if (!value && value !== 0) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const byId = LOCKER_FINISH_BY_ID[trimmed];
    if (byId) return byId;
    const normalized = trimmed.toUpperCase();
    const byMaterial = LOCKER_FINISH_OPTIONS.find((option) => option.material === normalized);
    if (byMaterial) return byMaterial;
    if (/^#[0-9a-f]{3,6}$/i.test(trimmed)) {
      return (
        LOCKER_FINISH_OPTIONS.find(
          (option) => option.color.toUpperCase() === trimmed.toUpperCase()
        ) || null
      );
    }
  }
  if (fallbackMaterial) {
    return LOCKER_FINISH_OPTIONS.find((option) => option.material === fallbackMaterial) || null;
  }
  return null;
}

export function getLockerFinishOptionsForMaterial(material) {
  if (!material) return LOCKER_FINISH_OPTIONS;
  return LOCKER_FINISH_OPTIONS.filter(
    (option) => option.material === material || option.material === 'METALICA'
  );
}

export function resolveLockerFinishColor(value, fallbackMaterial = null) {
  return resolveLockerFinishOption(value, fallbackMaterial)?.color || '#9ca3af';
}

export function resolveLockerFinishCode(value, fallbackMaterial = null) {
  return resolveLockerFinishOption(value, fallbackMaterial)?.finishCode || 'LOCKER_DEFAULT';
}

// COD_GENERICO real (gen-esp_3.xml) para pintura en polvo de muebles metalicos.
export const LOCKER_METAL_PAINT_GENERICO = '22008555';

// Genericos permitidos para el selector de acabados: coraza (siempre metalica pintada)
// vs. nave/puerta (depende del material configurado: Formica/Melamina usan su propio
// generico de catalogo; Metalica y Metalica embebida usan el mismo generico de pintura).
export function resolveLockerSelectionGenericos(material, { isBodyPart = false } = {}) {
  if (isBodyPart || material === 'METALICA' || material === 'METALICA_EMBEBIDA') {
    return [LOCKER_METAL_PAINT_GENERICO];
  }
  const codes = [
    ...new Set(
      LOCKER_FINISH_OPTIONS.filter((option) => option.material === material).map(
        (option) => option.finishCode
      )
    ),
  ];
  return codes.length ? codes : [LOCKER_METAL_PAINT_GENERICO];
}
