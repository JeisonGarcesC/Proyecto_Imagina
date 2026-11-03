// src/mepal/compendio/definitions/compendioDefaults.js

export const COMPENDIO_SURFACE_CATEGORIES = Object.freeze([
  { value: 'Superficies principales', label: 'Superficies principales' },
  { value: 'Superficies orgánicas', label: 'Superficies orgánicas' },
  { value: 'Superficies esquineras', label: 'Superficies esquineras' },
]);

export const COMPENDIO_PRINCIPAL_SURFACE_TYPES = Object.freeze([
  { value: 'Rectangular', label: 'Rectangular' },
  { value: 'En P', label: 'En P' },
  { value: 'En D', label: 'En D' },
]);

// Alias de compatibilidad
export const COMPENDIO_SURFACE_TYPES = COMPENDIO_PRINCIPAL_SURFACE_TYPES;

export const COMPENDIO_ORGANICAS_SURFACE_TYPES = Object.freeze([
  { value: 'Curva de 60 a 75', label: 'Curva de 60 a 75' },
  { value: 'Curva de 60 a 75 - 2', label: 'Curva de 60 a 75 - 2' },
]);

export function isCompendioCurva2(type) {
  if (!type) return false;
  const s = String(type).trim().toLowerCase().replace(/[\s\-_]+/g, '');
  return (
    s === 'curvade60a752' ||
    s === 'curva60a752' ||
    s === 'curva2' ||
    s === 'organicacurva2'
  );
}

export function isCompendioCurva60a75(type) {
  if (!type) return false;
  const s = String(type).trim().toLowerCase().replace(/[\s\-_]+/g, '');
  return (
    s === 'curvade60a75' ||
    s === 'curva60a75' ||
    s === 'organicacurva6075'
  );
}

// Medidas para figura "Curva de 60 a 75 - 2" (1.5, 1.65, 1.8 m)
export const COMPENDIO_ORGANICA_CURVA_2_WIDTHS = Object.freeze([1500, 1650, 1800]);

// Profundidades para "Curva de 60 a 75 - 2": a 1.5m permite 900 o 1200 mm; a 1.65m y 1.8m solo 900 mm
export const COMPENDIO_ORGANICA_CURVA_2_DEPTHS_FOR_1500 = Object.freeze([900, 1200]);
export const COMPENDIO_ORGANICA_CURVA_2_DEPTHS_DEFAULT = Object.freeze([900]);

// Medidas estándar de largo: crece de 10 en 10 cm desde 0.600m hasta 1.880m
export const COMPENDIO_STANDARD_WIDTHS = Object.freeze([
  600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1880,
]);

// Medidas para figura En P (1.2m, 1.35m, 1.5m, 1.65m, 1.8m) - no admite medida especial
export const COMPENDIO_EN_P_WIDTHS = Object.freeze([1200, 1350, 1500, 1650, 1800]);

// Distancia de flecha / sagitta de la curva en P: 77 mm (1200 mm total - 1123 mm recta)
// Para ancho 600 mm: diagonal desde esquina recta a cúspide = sqrt(300^2 + 77^2) = 310 mm (0.310 m)
export const COMPENDIO_CURVE_SAGITTA_MM = 77;

// Medidas para figura En D (0.9m, 1.2m, 1.35m, 1.5m, 1.65m, 1.8m, 2.1m) - no admite medida especial
export const COMPENDIO_EN_D_WIDTHS = Object.freeze([900, 1200, 1350, 1500, 1650, 1800, 2100]);

// Distancia de flecha / sagitta de la curva en D: 100 mm
// Para largo 900 mm: diagonal desde esquina recta a cúspide = sqrt(450^2 + 100^2) = 461 mm (0.461 m)
export const COMPENDIO_EN_D_CURVE_SAGITTA_MM = 100;

// Medidas para figura "Curva de 60 a 75" (0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5, 1.65 m) - no admite especial
export const COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS = Object.freeze([
  600, 750, 900, 1050, 1200, 1350, 1500, 1650,
]);

// Profundidades fijas de Curva de 60 a 75: izquierda 750 mm, derecha 600 mm
export const COMPENDIO_ORGANICA_CURVA_60_75_DEPTHS = Object.freeze({
  leftDepthMm: 750,
  rightDepthMm: 600,
  maxDepthMm: 750,
});

// Medidas especiales de largo: crece de 1 en 1 cm (10 mm) desde 0.600m hasta 1.880m
export const COMPENDIO_SPECIAL_WIDTHS = Object.freeze(
  Array.from({ length: Math.round((1880 - 600) / 10) + 1 }, (_, i) => 600 + i * 10)
);

// Medidas de ancho: solo 600 o 750 mm (0.600 m o 0.750 m)
export const COMPENDIO_DEPTHS = Object.freeze([600, 750]);

export const COMPENDIO_DIMENSIONS = Object.freeze({
  supportHeightMm: 710, // Altura libre debajo de la superficie para poner los costados
  surfaceThicknessMm: 30, // Grosor de superficie (30 mm igual que LINK FORMICA_30)
  minDepthMm: 600,
  maxDepthMm: 750,
  minWidthMm: 600,
  maxWidthMm: 1880,
});

export const COMPENDIO_DEFAULT_CONFIG = Object.freeze({
  surfaceCategory: 'Superficies principales',
  surfaceType: 'Rectangular',
  modoEspecial: false,
  inverted: false,
  widthMm: 600,
  depthMm: 600,
  thickMm: 30,
  surfaceColor: '#d8c4a5',
  finishId: 'FORMICA_30',
  hasGrommet: false,
});
