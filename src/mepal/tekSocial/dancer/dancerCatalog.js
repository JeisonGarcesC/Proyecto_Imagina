// Catálogo de Mesas Dancer (Mepal TekSocial).
// Solo define planos, GLB y reglas de crecimiento. Los códigos comerciales y precios
// NO están aquí: se resuelven en dancerCommercial.js desde las listas de precios XML
// buscando la descripción que contiene el número de plano y la medida.

export const DANCER_ASSET_FOLDER = '/assets/models/Mepal TekSocial/mesasDancer';

export const DANCER_VERTEBRA = {
  planCode: 'MPR050062',
  glb: 'MPR050062_Vertebra',
  description: 'VERTEBRA PLASTICA GRIS CLARO',
};

// De 1.8 m a 3 m, de 10 cm en 10 cm.
export const DANCER_GROWTH_LENGTHS_CM = Array.from({ length: 13 }, (_, i) => 180 + i * 10);

export const DANCER_CIRCULAR_DIAMETER_CM = 120;
export const DANCER_CIRCULAR_MENU_ID = 'CIRCULAR';

export const DANCER_MODELS = [
  {
    planCode: 'TKSME010000',
    label: 'Mesa Dancer con tomas',
    glb: 'TKSME010000_180',
    shape: 'rectangular',
    nominalLengthCm: 180,
    lengthsCm: DANCER_GROWTH_LENGTHS_CM,
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER CON TOMAS (\d{3})X100X74CM/,
  },
  {
    planCode: 'TKSME150000',
    label: 'Mesa Dancer sin tomas',
    glb: 'TKSME150000_180',
    shape: 'rectangular',
    nominalLengthCm: 180,
    lengthsCm: DANCER_GROWTH_LENGTHS_CM,
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER SIN TOMAS (\d{3})X100X74CM/,
  },
  {
    planCode: 'TKSME230000',
    label: 'Mesa Dancer con superficie auxiliar',
    glb: 'TKSME230000_180',
    shape: 'rectangular',
    nominalLengthCm: 180,
    lengthsCm: DANCER_GROWTH_LENGTHS_CM,
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER CON SUPERFICIE AUXILIAR (\d{3})X100X74CM/,
  },
  {
    // Caso especial: solo 1.8 m y 2.4 m. No crece por geometría: cada largo tiene su propio GLB.
    // Lleva dos vertebras (una en la mesa rectangular y otra en la circular).
    planCode: 'TKSME350000',
    label: 'Mesa doble P y circular',
    glb: 'TKSME350000',
    glbByLength: { 180: 'TKSME350000', 240: 'TKSME350000_240' },
    shape: 'rectangular',
    nominalLengthCm: 180,
    lengthsCm: [180, 240],
    vertebraCount: 2,
    descriptionPattern:
      /^MESA DOBLE P Y CIRCULAR DANCER CON 3 TOMAS BYRNE PEPPER \+ 3 TOMAS BYRNE SALT (\d{3})CM TEK SOCIAL TKSME350000/,
  },
  // Mesa circular: tres planos que cuentan como una sola mesa y solo cambian la superficie.
  {
    planCode: 'TKSME180000',
    label: 'Superficie lisa',
    glb: 'TKSME180000',
    shape: 'circular',
    nominalLengthCm: DANCER_CIRCULAR_DIAMETER_CM,
    lengthsCm: [DANCER_CIRCULAR_DIAMETER_CM],
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER SIN TOMAS CIRCULAR DIAM\. 120CM H-74CM/,
  },
  {
    planCode: 'TKSME030000',
    label: 'Superficie tomas',
    glb: 'TKSME030000',
    shape: 'circular',
    nominalLengthCm: DANCER_CIRCULAR_DIAMETER_CM,
    lengthsCm: [DANCER_CIRCULAR_DIAMETER_CM],
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER CON TOMAS CIRCULAR DIAM\. 120CM H-74CM/,
  },
  {
    planCode: 'TKSME250000',
    label: 'Superficie auxiliar',
    glb: 'TKSME250000',
    shape: 'circular',
    nominalLengthCm: DANCER_CIRCULAR_DIAMETER_CM,
    lengthsCm: [DANCER_CIRCULAR_DIAMETER_CM],
    vertebraCount: 1,
    descriptionPattern: /^MESA DANCER CON SUPERFICIE AUXILIAR CIRCULAR DIAM\. 120CM H-74CM/,
  },
];

export const DANCER_DEFAULT_PLAN_CODE = 'TKSME010000';
export const DANCER_DEFAULT_CIRCULAR_PLAN_CODE = 'TKSME180000';

export const DANCER_DEFAULT_CONFIG = Object.freeze({
  planCode: DANCER_DEFAULT_PLAN_CODE,
  lengthCm: 180,
  vertebra: false,
});

export function getDancerModel(planCode) {
  const code = String(planCode || '').trim().toUpperCase();
  return DANCER_MODELS.find((model) => model.planCode === code) || null;
}

export function isDancerPlanCode(planCode) {
  return Boolean(getDancerModel(planCode));
}

export function getDancerRectangularModels() {
  return DANCER_MODELS.filter((model) => model.shape === 'rectangular');
}

export function getDancerCircularModels() {
  return DANCER_MODELS.filter((model) => model.shape === 'circular');
}

export function getDancerModelSources(model, lengthCm) {
  const glb = model.glbByLength?.[lengthCm] || model.glb;
  return [`${DANCER_ASSET_FOLDER}/${glb}.glb`];
}

export function getDancerVertebraSources() {
  return [`${DANCER_ASSET_FOLDER}/${DANCER_VERTEBRA.glb}.glb`];
}

export function formatDancerLength(lengthCm) {
  return `${(Number(lengthCm) / 100).toFixed(1)} m`;
}

// Devuelve una configuración válida y completa a partir de datos parciales o guardados.
export function normalizeDancerConfig(config = {}) {
  const model = getDancerModel(config?.planCode) || getDancerModel(DANCER_DEFAULT_PLAN_CODE);
  const requested = Number(config?.lengthCm);
  const allowed = model.lengthsCm;
  let lengthCm = model.nominalLengthCm;
  if (Number.isFinite(requested)) {
    lengthCm =
      allowed.find((value) => value === requested) ||
      allowed.find((value) => value >= requested) ||
      allowed[allowed.length - 1];
  }
  return {
    planCode: model.planCode,
    lengthCm,
    vertebra: config?.vertebra === true,
  };
}
