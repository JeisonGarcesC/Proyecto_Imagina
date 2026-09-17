// src/koncisaPlus/parts/pantallas.js
import * as THREE from 'three';

const MM_TO_M = 1 / 1000;

export const KONCISA_PRIVACY_PANEL = {
  defaultHeightMm: 300,

  defaultThicknessMm: {
    formica: 16,
    melamina: 18,
    tela: 24,
    'tela-backer': 24,
    vidrio: 8,
  },

  cantoThicknessMm: 8,

  // Según el plano: soporte a 93.5 mm desde los extremos
  supportInsetMm: 93.5,

  // Ajuste vertical del soporte respecto al borde inferior de la pantalla
  supportYOffsetMm: -20,
};

/**
 * IMPORTANTE:
 * Cambia estas rutas por los nombres reales de tus GLB.
 *
 * - Lateral: soporte para pantallas laterales.
 * - Frontal: soporte para faldas/pantallas frontales en melamina/formica.
 * - Vidrio: soporte específico para vidrio.
 */
export const KONCISA_PRIVACY_PANEL_SUPPORTS = {
  lateral60: {
    modelSrc: '/assets/models/koncisaPlus/2KAC272000-30x60.glb',
    code: '2KAC272000-30x60',
    name: 'Soporte pantalla lateral Koncisa Plus 30x60',

    qty: 1,

    offsetXMm: 0,
    offsetYMm: -40,
    offsetZMm: 157, //-26-0.18

    // El eje largo del GLB ya está sobre Z, igual que la pantalla lateral.
    rotation: [0, 0, 0], //Math.PI
  },

  lateral75: {
    // No existe un GLB 30x75 en los assets actuales. Se usa el soporte
    // disponible y se centra geométricamente sobre la pantalla de 750 mm.
    modelSrc: '/assets/models/koncisaPlus/2KAC272000-30x60.glb',
    code: '2KAC272000-30x75',
    name: 'Soporte pantalla lateral Koncisa Plus 30x75',

    qty: 1,

    offsetXMm: 0,
    offsetYMm: -40,
    offsetZMm: 157 + 150,

    rotation: [0, 0, 0],
  },

  frontal: {
    modelSrc: '/assets/models/koncisaPlus/2KAC252000_SOPTPANTALLA.glb',
    code: '2KAC254000',
    name: 'Soporte pantalla frontal Formica Koncisa Plus',

    // Dos soportes para pantalla frontal
    qty: 2,

    insetMm: 93.5,
    offsetXMm: 0,
    offsetYMm: -3,
    offsetZMm: 0,

    leftRotation: [0, 0, 0],
    rightRotation: [0, Math.PI, 0],
  },

  vidrio: {
    modelSrc: '/assets/models/koncisaPlus/2KAC252000_SOPTPANTALLA.glb',
    code: '2KAC252000',
    name: 'Soporte pantalla vidrio Koncisa Plus',

    qty: 2,

    insetMm: 93.5,
    offsetXMm: 0,
    offsetYMm: -15,
    offsetZMm: 0,

    leftRotation: [0, 0, 0],
    rightRotation: [0, Math.PI, 0],
  },
};

export function getPrivacyPanelSupportConfig({
  tipo = 'lateral',
  material = 'formica',
  lengthMm = 1200,
}) {
  const mat = String(material || '').toLowerCase();
  const normalizedLengthMm = normalizePanelLengthMm(lengthMm);

  if (tipo === 'frontal' && mat === 'vidrio') {
    return KONCISA_PRIVACY_PANEL_SUPPORTS.vidrio;
  }

  if (tipo === 'frontal') {
    const supportByMaterial = {
      melamina: { code: '2KAC253000', name: 'Soporte pantalla frontal Melamina Koncisa Plus' },
      formica: { code: '2KAC254000', name: 'Soporte pantalla frontal Formica Koncisa Plus' },
      'tela-backer': {
        code: '2KAC255000',
        name: 'Soporte pantalla frontal Tela/Aglomerado con Backer Koncisa Plus',
      },
      tela: { code: '2KAC271000', name: 'Soporte pantalla frontal Tela/Aglomerado Koncisa Plus' },
    };

    return {
      ...KONCISA_PRIVACY_PANEL_SUPPORTS.frontal,
      ...(supportByMaterial[mat] || supportByMaterial.formica),
    };
  }

  // Pantalla lateral: el soporte depende de la profundidad.
  // 600 mm = soporte 30x60
  // 750 mm = soporte 30x75
  if (tipo === 'lateral') {
    const base =
      normalizedLengthMm >= 700
        ? KONCISA_PRIVACY_PANEL_SUPPORTS.lateral75
        : KONCISA_PRIVACY_PANEL_SUPPORTS.lateral60;
    const supportByMaterial = {
      vidrio: { code: '2KAC276000', name: 'Soporte pantalla lateral Vidrio laminado 4+4' },
      melamina: { code: '2KAC274000', name: 'Soporte pantalla lateral Melamina' },
      formica: { code: '2KAC275000', name: 'Soporte pantalla lateral Formica' },
      tela: { code: '2KAC272000', name: 'Soporte pantalla lateral Tela' },
    };
    return { ...base, ...(supportByMaterial[mat] || supportByMaterial.formica) };
  }

  return KONCISA_PRIVACY_PANEL_SUPPORTS.lateral60;
}

export const KONCISA_PRIVACY_PANEL_SKUS = {
  // =========================
  // PANTALLA LATERAL - FORMICA
  // 30 cm alto x 60/75 cm profundidad
  // REVISAR: estos códigos salen del plano que compartiste.
  // Si tu maestro de productos tiene otros códigos para Koncisa Plus, reemplázalos aquí.
  // =========================
  'lateral|formica|300|600|22008689': '22000125820',
  'lateral|formica|300|750|22008689': '22000125822',

  // =========================
  // PANTALLA LATERAL - FORMICA
  // 30 cm alto x 100/120/150 cm
  // =========================
  'lateral|formica|300|1000|22008689': '22000132934',
  'lateral|formica|300|1200|22008689': '22000132935',
  'lateral|formica|300|1500|22008689': '22000132936',

  // =========================
  // PANTALLA LATERAL - FORMICA
  // =========================
  'lateral|formica|300|1000|22008689': '22000132934',
  'lateral|formica|300|1200|22008689': '22000132935',
  'lateral|formica|300|1500|22008689': '22000132936',

  // =========================
  // PANTALLA LATERAL - TELA BACKER LAFAYETE
  // =========================
  'lateral|tela-backer|300|1000|22010282': '22000132961',
  'lateral|tela-backer|300|1200|22010282': '22000132962',
  'lateral|tela-backer|300|1500|22010282': '22000132963',

  // =========================
  // PANTALLA LATERAL - TELA SIN BACKER LAFAYETE
  // =========================
  'lateral|tela|300|1000|22010282': '22000133977',
  'lateral|tela|300|1200|22010282': '22000133978',
  'lateral|tela|300|1500|22010282': '22000133979',

  // =========================
  // PANTALLA LATERAL - TELA BACKER GAMA 2
  // =========================
  'lateral|tela-backer|300|1000|22021827': '22000132961',
  'lateral|tela-backer|300|1200|22021827': '22000132962',
  'lateral|tela-backer|300|1500|22021827': '22000132963',

  // =========================
  // PANTALLA LATERAL - TELA SIN BACKER GAMA 2
  // =========================
  'lateral|tela|300|1000|22021827': '22000133977',
  'lateral|tela|300|1200|22021827': '22000133978',
  'lateral|tela|300|1500|22021827': '22000133979',

  // =========================
  // PANTALLA LATERAL - NUVANT
  // =========================
  'lateral|tela-backer|300|1000|22222222': '22000132961',
  'lateral|tela-backer|300|1200|22222222': '22000132962',
  'lateral|tela-backer|300|1500|22222222': '22000132963',

  'lateral|tela|300|1000|22222222': '22000133977',
  'lateral|tela|300|1200|22222222': '22000133978',
  'lateral|tela|300|1500|22222222': '22000133979',

  // =========================
  // PANTALLA LATERAL - PROQUINAL
  // =========================
  'lateral|tela-backer|300|1000|22021826': '22000132961',
  'lateral|tela-backer|300|1200|22021826': '22000132962',
  'lateral|tela-backer|300|1500|22021826': '22000132963',

  'lateral|tela|300|1000|22021826': '22000133977',
  'lateral|tela|300|1200|22021826': '22000133978',
  'lateral|tela|300|1500|22021826': '22000133979',

  // =========================
  // FALDA / PANTALLA FRONTAL - MELAMINA
  // =========================
  'frontal|melamina|300|1000|22008556': '22000132931',
  'frontal|melamina|300|1200|22008556': '22000132932',
  'frontal|melamina|300|1500|22008556': '22000132933',

  // =========================
  // FALDA / PANTALLA FRONTAL - VIDRIO
  // =========================
  'frontal|vidrio|300|1000|22006318': '22000132928',
  'frontal|vidrio|300|1200|22006318': '22000132929',
  'frontal|vidrio|300|1500|22006318': '22000132930',

  // PANTALLAS FRONTALES - FORMICA
  'frontal|formica|300|1000|22008689': '22000132934',
  'frontal|formica|300|1200|22008689': '22000132935',
  'frontal|formica|300|1500|22008689': '22000132936',

  // PANTALLAS FRONTALES - TELA / AGLOMERADO + BACKER
  'frontal|tela-backer|300|1000|22010282': '22000132961',
  'frontal|tela-backer|300|1200|22010282': '22000132962',
  'frontal|tela-backer|300|1500|22010282': '22000132963',
  'frontal|tela-backer|300|1000|22021827': '22000132961',
  'frontal|tela-backer|300|1200|22021827': '22000132962',
  'frontal|tela-backer|300|1500|22021827': '22000132963',
  'frontal|tela-backer|300|1000|22222222': '22000132961',
  'frontal|tela-backer|300|1200|22222222': '22000132962',
  'frontal|tela-backer|300|1500|22222222': '22000132963',
  'frontal|tela-backer|300|1000|22021826': '22000132961',
  'frontal|tela-backer|300|1200|22021826': '22000132962',
  'frontal|tela-backer|300|1500|22021826': '22000132963',

  // PANTALLAS FRONTALES - TELA / AGLOMERADO
  'frontal|tela|300|1000|22010282': '22000133977',
  'frontal|tela|300|1200|22010282': '22000133978',
  'frontal|tela|300|1500|22010282': '22000133979',
  'frontal|tela|300|1000|22021827': '22000133977',
  'frontal|tela|300|1200|22021827': '22000133978',
  'frontal|tela|300|1500|22021827': '22000133979',
  'frontal|tela|300|1000|22222222': '22000133977',
  'frontal|tela|300|1200|22222222': '22000133978',
  'frontal|tela|300|1500|22222222': '22000133979',
  'frontal|tela|300|1000|22021826': '22000133977',
  'frontal|tela|300|1200|22021826': '22000133978',
  'frontal|tela|300|1500|22021826': '22000133979',
};

const KONCISA_LATERAL_PANEL_SKUS = {
  18: {
    vidrio: { 600: '22000134164', 750: '22000134165' },
    melamina: { 600: '22000134699', 750: '22000134700' },
    formica: { 600: '22000134176', 750: '22000134177' },
    tela: { 600: '22000134170', 750: '22000134171' },
  },
  25: {
    vidrio: { 600: '22000134166', 750: '22000134167' },
    melamina: { 600: '22000134701', 750: '22000134702' },
    formica: { 600: '22000134178', 750: '22000134179' },
    tela: { 600: '22000134172', 750: '22000134173' },
  },
  30: {
    vidrio: { 600: '22000134168', 750: '22000134169' },
    melamina: { 600: '22000134703', 750: '22000134704' },
    formica: { 600: '22000134180', 750: '22000134181' },
    tela: { 600: '22000134174', 750: '22000134175' },
  },
};

export function resolveKoncisaPrivacyPanelPlacement({
  tipo = 'lateral',
  tipoPuesto = 'sencillo',
  moduleIndex = 0,
  largoRealMm = 1200,
  anchoRealMm = 600,
  largoNominalMm = 1200,
  anchoNominalMm = 600,
  modoEspecial = false,
  stationXMm = null,
} = {}) {
  const isFrontal = tipo === 'frontal';
  const isDouble = String(tipoPuesto).toLowerCase() === 'doble';

  return {
    lengthMm: isFrontal
      ? Math.max(0, Number(largoRealMm) - 100)
      : Math.max(0, Number(anchoNominalMm) - 10),
    skuLengthMm: isFrontal ? Number(largoNominalMm) : Number(anchoNominalMm),
    descriptionLengthMm: isFrontal ? Number(largoRealMm) : Number(anchoRealMm),
    x:
      stationXMm != null && Number.isFinite(Number(stationXMm))
        ? Number(stationXMm)
        : Number(moduleIndex) * Number(largoRealMm),
    y: 900,
    z: isFrontal && !isDouble ? -Number(anchoRealMm) / 2 + 30 : 0,
  };
}

export function resolveKoncisaPrivacyPanelPlacements(options = {}) {
  const base = resolveKoncisaPrivacyPanelPlacement(options);
  const isLateral = (options.tipo || 'lateral') === 'lateral';
  const isDouble = String(options.tipoPuesto).toLowerCase() === 'doble';
  if (!isLateral || !isDouble) return [base];

  const nominalLengthMm = Number(options.anchoNominalMm) / 2;
  const lengthMm = Math.max(0, nominalLengthMm - 10);
  const halfOffsetMm = lengthMm / 2;

  const firstPanelOffsetZMm = 0; //240
  const secondPanelOffsetZMm = 0; //172

  // Mueven solo cada soporte del puesto doble, sin desplazar las pantallas.

  const doubleWidthMm = Number(options.anchoNominalMm);

  const firstSupportOffsetZMm = doubleWidthMm === 1500 ? 745 : 595;
  const secondSupportOffsetZMm = 447;

  const firstPanelRotationY = 0;
  const secondPanelRotationY = Math.PI;

  return [
    {
      ...base,
      lengthMm,
      skuLengthMm: nominalLengthMm,

      z: -halfOffsetMm + firstPanelOffsetZMm,
      rotationY: firstPanelRotationY,

      supportEdge: 'start',
      supportOffsetZMm: firstSupportOffsetZMm,
    },
    {
      ...base,
      lengthMm,
      skuLengthMm: nominalLengthMm,

      z: halfOffsetMm + secondPanelOffsetZMm,
      rotationY: secondPanelRotationY,

      supportEdge: 'end',
      supportOffsetZMm: secondSupportOffsetZMm,
    },
  ];
}

export function resolveKoncisaLateralPanelStations({
  puestos = 1,
  largoRealMm = 1200,
  mode = 'ALL_BOUNDARIES',
} = {}) {
  const count = Math.max(1, Number(puestos) || 1);
  const first = mode === 'INTERSECTIONS_ONLY' ? 1 : 0;
  const last = mode === 'INTERSECTIONS_ONLY' ? count - 1 : count;
  const stations = [];
  for (let boundary = first; boundary <= last; boundary += 1) {
    stations.push(-Number(largoRealMm) / 2 + boundary * Number(largoRealMm));
  }
  return stations;
}

export function normalizePanelLengthMm(lengthMm) {
  const n = Number(lengthMm);

  if (!Number.isFinite(n) || n <= 0) return 0;

  // Si llega como 60, 75, 100, 120, 150, lo interpretamos como centímetros.
  if (n < 300) {
    return Math.round(n * 10);
  }

  // Si ya llega como 600, 750, 1000, 1200, 1500, lo dejamos en mm.
  return Math.round(n);
}

export function resolveKoncisaPrivacyPanelCode({
  tipo = 'lateral',
  material = 'formica',
  heightMm = 300,
  lengthMm = 1200,
  finishCode,
  surfaceThicknessMm = 30,
}) {
  const normalizedLength = normalizePanelLengthMm(lengthMm);
  if (tipo === 'lateral') {
    const normalizedThicknessMm = Number(surfaceThicknessMm);
    const normalizedMaterial = material === 'tela-backer' ? 'tela' : material;
    const lateralCode =
      KONCISA_LATERAL_PANEL_SKUS[normalizedThicknessMm]?.[normalizedMaterial]?.[normalizedLength];
    if (lateralCode) return lateralCode;
  }
  const key = `${tipo}|${material}|${heightMm}|${normalizedLength}|${finishCode}`;

  return KONCISA_PRIVACY_PANEL_SKUS[key] || null;
}

export function panelHasCanto(material) {
  return ['formica', 'melamina'].includes(String(material || '').toLowerCase());
}

function getPanelColor(material) {
  const mat = String(material || '').toLowerCase();

  if (mat === 'vidrio') return 0xbfdff2;
  if (mat === 'melamina') return 0xd8c7a3;
  if (mat === 'tela' || mat === 'tela-backer') return 0x9b9b9b;

  return 0xd9d9d9;
}

function createPanelMaterial(material, color) {
  const mat = String(material || '').toLowerCase();

  if (mat === 'vidrio') {
    return new THREE.MeshStandardMaterial({
      color: color ?? getPanelColor(material),
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.38,
    });
  }

  if (mat === 'tela' || mat === 'tela-backer') {
    return new THREE.MeshStandardMaterial({
      color: color ?? getPanelColor(material),
      roughness: 0.95,
      metalness: 0,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: color ?? getPanelColor(material),
    roughness: 0.75,
    metalness: 0,
  });
}

function createCantoMaterial(cantoColor) {
  return new THREE.MeshStandardMaterial({
    color: cantoColor ?? 0x2f2f2f,
    roughness: 0.65,
    metalness: 0,
  });
}

function createBox({
  name,
  widthM,
  heightM,
  depthM,
  material,
  position = [0, 0, 0],
  userData = {},
}) {
  const geometry = new THREE.BoxGeometry(widthM, heightM, depthM);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    isSubPart: true,
    parentType: 'pantalla',
    ...userData,
  };

  return mesh;
}

/**
 * Crea la pantalla completa como UN SOLO GROUP.
 *
 * Estructura:
 * KONCISA_PRIVACY_PANEL_GROUP
 * ├── PANTALLA
 * ├── CANTO_SUPERIOR / INFERIOR / LATERALES, si aplica
 * └── soportes GLB, estos se agregan después desde ThreeCanvas
 */
export function createKoncisaPrivacyPanelProcedural({
  tipo = 'lateral',
  material = 'formica',
  lengthMm = 1200,
  heightMm = 300,
  thickMm,
  finishCode,
  x = 0,
  y = 750,
  z = 0,
  rotationY = 0,
  color,
  cantoColor = 0x2f2f2f,
  code,
  skuLengthMm = lengthMm,
  surfaceThicknessMm = 30, //30
  modoEspecial = false,
  descriptionLengthMm = lengthMm,
  supportEdge = 'start',
  supportOffsetZMm = 0,
  privacyPanelFinishId = null,
}) {
  const normalizedLengthMm = normalizePanelLengthMm(lengthMm);

  const finalThickMm =
    thickMm || KONCISA_PRIVACY_PANEL.defaultThicknessMm[String(material || '').toLowerCase()] || 16;

  const resolvedCode =
    code ||
    resolveKoncisaPrivacyPanelCode({
      tipo,
      material,
      heightMm,
      lengthMm: skuLengthMm,
      finishCode,
      surfaceThicknessMm,
    }) ||
    `KPL-PANT-${tipo}-${material}-${heightMm}x${normalizedLengthMm}-${finishCode || 'SINACABADO'}`;

  const hasCanto = panelHasCanto(material);

  const supportConfig = getPrivacyPanelSupportConfig({
    tipo,
    material,
    lengthMm: normalizedLengthMm,
  });

  const group = new THREE.Group();

  group.name = `KONCISA_PRIVACY_PANEL_${resolvedCode}`;

  // Esta posición SÍ debe ir en el grupo padre.
  group.position.set(x * MM_TO_M, y * MM_TO_M, z * MM_TO_M);
  group.rotation.y = Number.isFinite(Number(rotationY)) ? Number(rotationY) : 0;

  const lengthM = normalizedLengthMm * MM_TO_M;
  const heightM = heightMm * MM_TO_M;
  const thickM = finalThickMm * MM_TO_M;
  const cantoM = KONCISA_PRIVACY_PANEL.cantoThicknessMm * MM_TO_M;

  const isFrontal = tipo === 'frontal';

  const panelWidthM = isFrontal ? lengthM : thickM;
  const panelDepthM = isFrontal ? thickM : lengthM;

  const panelMat = createPanelMaterial(material, color);
  const cantoMat = createCantoMaterial(cantoColor);

  const mainPanel = createBox({
    name: 'PANTALLA',
    widthM: panelWidthM,
    heightM,
    depthM: panelDepthM,
    material: panelMat,
    userData: {
      subKey: 'pantalla',
      category: 'pantallas',
      code: resolvedCode,
      material,
      finishCode,
      materialCode: finishCode,
    },
  });

  group.add(mainPanel);

  if (hasCanto) {
    if (isFrontal) {
      group.add(
        createBox({
          name: 'CANTO_SUPERIOR',
          widthM: lengthM,
          heightM: cantoM,
          depthM: thickM, // + cantoM,
          material: cantoMat,
          position: [0, heightM / 2 + cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_INFERIOR',
          widthM: lengthM,
          heightM: cantoM,
          depthM: thickM, // + cantoM,
          material: cantoMat,
          position: [0, -heightM / 2 - cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_IZQUIERDO',
          widthM: cantoM,
          heightM,
          depthM: thickM, // + cantoM,
          material: cantoMat,
          position: [-lengthM / 2 + cantoM / 2, 0, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_DERECHO',
          widthM: cantoM,
          heightM,
          depthM: thickM, // + cantoM,
          material: cantoMat,
          position: [lengthM / 2 - cantoM / 2, 0, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );
    } else {
      // Pantalla lateral: el largo va sobre Z
      group.add(
        createBox({
          name: 'CANTO_SUPERIOR',
          widthM: thickM + cantoM,
          heightM: cantoM,
          depthM: lengthM + cantoM * 2,
          material: cantoMat,
          position: [0, heightM / 2 + cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_INFERIOR',
          widthM: thickM + cantoM,
          heightM: cantoM,
          depthM: lengthM + cantoM * 2,
          material: cantoMat,
          position: [0, -heightM / 2 - cantoM / 2, 0],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_FRONTAL',
          widthM: thickM + cantoM,
          heightM,
          depthM: cantoM,
          material: cantoMat,
          position: [0, 0, -lengthM / 2 - cantoM / 2],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );

      group.add(
        createBox({
          name: 'CANTO_POSTERIOR',
          widthM: thickM + cantoM,
          heightM,
          depthM: cantoM,
          material: cantoMat,
          position: [0, 0, lengthM / 2 + cantoM / 2],
          userData: {
            subKey: 'canto',
            category: 'cantos',
          },
        })
      );
    }
  }

  const supportQty = supportConfig.qty ?? 2;

  const lengthCm = Math.round(normalizedLengthMm / 10);
  const heightCm = Math.round(heightMm / 10);

  const materialLabelMap = {
    formica: 'FORMICA',
    melamina: 'MELAMINA',
    tela: 'TELA',
    'tela-backer': 'TELA BACKER',
    vidrio: 'VIDRIO',
  };

  const materialLabel =
    materialLabelMap[String(material || '').toLowerCase()] || String(material || '').toUpperCase();

  const basePanelDescription =
    tipo === 'lateral'
      ? `PANTALLA LATERAL ${lengthCm}X${heightCm}CM ${materialLabel} KONCISA PLUS`
      : `PANTALLA FRONTAL ${lengthCm}X${heightCm}CM ${materialLabel} KONCISA PLUS`;
  const panelDescription = modoEspecial
    ? `ESPECIAL - ${basePanelDescription} - Medida real ${Math.round(descriptionLengthMm / 10)} cm`
    : basePanelDescription;

  const typologyParts = [
    {
      code: resolvedCode,
      description: panelDescription,
      qty: 1,
      unitPrice: 0,
    },
    {
      code: supportConfig.code,
      description: supportConfig.name,
      qty: supportQty,
      unitPrice: 0,
    },
  ];

  if (hasCanto) {
    typologyParts.push({
      code: `CANTO-${material}-${finishCode || 'SIN-CODIGO'}`,
      description: `Canto para pantalla ${material}`,
      qty: 1,
      unitPrice: 0,
    });
  }

  group.userData = {
    isPartRoot: true,

    // Para que getRootPartObject siempre encuentre este grupo
    kind: 'PRIVACY_PANEL',

    type: 'pantalla',
    subtype: tipo,

    line: 'KONCISA.PLUS',

    codigoPT: resolvedCode,
    code: resolvedCode,

    name: panelDescription,
    description: panelDescription,

    material,
    materialCode: finishCode || null,
    finishCode: finishCode || null,
    finishLabel: null,
    privacyPanelFinishId,

    hasCanto,
    hasBacker: material === 'tela-backer',
    modoEspecial,

    dim: {
      lengthMm: normalizedLengthMm,
      heightMm,
      thickMm: finalThickMm,
    },

    dimMm: {
      widthMm: isFrontal ? normalizedLengthMm : finalThickMm,
      heightMm,
      depthMm: isFrontal ? finalThickMm : normalizedLengthMm,
      lengthMm: normalizedLengthMm,
      thickMm: finalThickMm,
    },

    typologyParts,

    supportConfig,

    supportAnchors: getPrivacyPanelSupportAnchors({
      tipo,
      material,
      lengthMm: normalizedLengthMm,
      heightMm,
      supportEdge,
      supportOffsetZMm,
    }),

    meta: {
      category: 'pantallas',
      material,
      finishCode,
      hasCanto,
      supportType: supportConfig.code,
    },
  };

  return group;
}

export function getPrivacyPanelSupportAnchors({
  tipo = 'lateral',
  material = 'formica',
  lengthMm = 1200,
  heightMm = 300,
  supportEdge = 'start',
  supportOffsetZMm = 0,
}) {
  const normalizedLengthMm = normalizePanelLengthMm(lengthMm);

  const supportConfig = getPrivacyPanelSupportConfig({
    tipo,
    material,
    lengthMm: normalizedLengthMm,
  });

  const lengthM = normalizedLengthMm * MM_TO_M;

  const insetM = (supportConfig.insetMm ?? 93.5) * MM_TO_M;
  const offsetXM = (supportConfig.offsetXMm ?? 0) * MM_TO_M;
  const offsetYM = (supportConfig.offsetYMm ?? -20) * MM_TO_M;
  const offsetZM = ((supportConfig.offsetZMm ?? 0) + (Number(supportOffsetZMm) || 0)) * MM_TO_M;

  const bottomY = -(heightMm * MM_TO_M) / 2 + offsetYM;

  // ✅ LATERAL: un solo soporte
  if (tipo === 'lateral') {
    const edgeZ = ((supportEdge === 'end' ? 1 : -1) * lengthM) / 2;
    return [
      {
        role: 'center',
        supportCode: supportConfig.code,
        supportEdge,
        position: [offsetXM, bottomY, edgeZ + offsetZM],
        rotation: supportConfig.rotation || [0, Math.PI / 2, 0],
      },
    ];
  }

  // ✅ FRONTAL / VIDRIO: dos soportes
  return [
    {
      role: 'left',
      supportCode: supportConfig.code,
      position: [-lengthM / 2 + insetM + offsetXM, bottomY, offsetZM],
      rotation: supportConfig.leftRotation || [0, 0, 0],
    },
    {
      role: 'right',
      supportCode: supportConfig.code,
      position: [lengthM / 2 - insetM + offsetXM, bottomY, offsetZM],
      rotation: supportConfig.rightRotation || [0, Math.PI, 0],
    },
  ];
}

/**
 * Esta función se conserva porque KoncisaPlusBuilder.js todavía importa createPantalla.
 * Ese builder actualmente usa createPantalla como objeto de datos, no como malla 3D.
 * No la elimines, porque si no vuelve el error de import.
 */
export function createPantalla({
  tipo = 'frontal',
  widthMm = 1200,
  heightMm = 350,
  thickMm = 18,
  x = 0,
  y = 750,
  z = 0,
  code,
  material = 'formica',
  finishCode = '22008689',
}) {
  const resolvedCode =
    code ||
    resolveKoncisaPrivacyPanelCode({
      tipo,
      material,
      heightMm,
      lengthMm: widthMm,
      finishCode,
    }) ||
    `KPL-PANT-${String(tipo).toUpperCase()}-${widthMm}x${heightMm}`;

  return {
    type: 'pantalla',
    subtype: tipo,
    line: 'KONCISA.PLUS',
    code: resolvedCode,
    name: `Pantalla ${tipo} ${widthMm}x${heightMm}`,
    dimMm: {
      widthMm,
      heightMm,
      thickMm,
    },
    position: {
      x,
      y,
      z,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    meta: {
      category: 'pantallas',
      material,
      finishCode,
      hasCanto: panelHasCanto(material),
    },
  };
}
