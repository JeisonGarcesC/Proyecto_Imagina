// src/mepal/mila/builders/MilaPanelDivisorBuilder.js
import {
  MILA_PANEL_DIVISOR_CATALOG,
  MILA_PANEL_DIVISOR_SOURCES,
  MILA_PANEL_DIVISOR_OFFSETS_MM,
} from '../config/milaPanelDivisorTunables.js';
import {
  MILA_SINGLE_SEAT_MODE_OFFSETS_MM,
} from '../config/milaTunables.js';

function createPanelDivisorGroupId(prefix = 'MILA_BOOTH') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function buildMilaPanelDivisor({
  tableSize = 90, // 90, 150, or 'none' / 0
  seatsLeft = 0, // 0, 1, 2, 3, 4
  seatsRight = 0, // 0, 1, 2, 3, 4
  screenLeft = false,
  screenRight = false,
  seatModeLeft = 'chair',
  seatModeRight = 'chair',
  customGroupId = null,
} = {}) {
  const groupId = customGroupId || createPanelDivisorGroupId();
  const groupName = 'Mila Panel Divisor Booth';
  const parts = [];

  const panelThicknessMm = MILA_PANEL_DIVISOR_OFFSETS_MM.panelThicknessMm; // 87 mm
  const panelLengthMm = MILA_PANEL_DIVISOR_OFFSETS_MM.panelLengthMm; // 2430 mm
  const halfPanelLengthMm = panelLengthMm / 2; // 1215 mm
  const moduleSpacingMm = MILA_PANEL_DIVISOR_OFFSETS_MM.seatModuleSpacingMm; // 600 mm
  const screenBaseYMm = 210; // Altura de montaje de pantallas acústicas (no pegadas al piso)
  const seatForwardZMm = 465; // Desfase hacia adelante para que el espaldar no choque con el panel trasero
  const panelBackFaceXMm = 47; // La cara posterior real del panel central (el GLB tiene offset interno de 47mm en X)

  // ─────────────────────────────────────────────────────────
  // 1. PANEL CENTRAL ACÚSTICO (TKSPN100000)
  // Centrado en Z = 0 (va de Z = +1215mm a Z = -1215mm)
  // ─────────────────────────────────────────────────────────
  const panelCat = MILA_PANEL_DIVISOR_CATALOG.panel;
  parts.push({
    type: 'GLB_PART',
    subtype: 'panel-divisor',
    line: 'MILA',
    groupId,
    groupName,
    code: panelCat.code,
    logicalCode: 'MILA_PANEL_DIVISOR_CENTRAL',
    name: panelCat.label,
    description: panelCat.description,
    prices: panelCat.prices,
    model: { src: panelCat.modelSrc },
    position: { x: 0, y: screenBaseYMm, z: halfPanelLengthMm },
    rotation: { x: 0, y: 0, z: 0 },
    meta: {
      category: 'mila',
      role: 'panel-divisor',
      line: 'MILA',
      isRootPanel: true,
    },
  });

  // ─────────────────────────────────────────────────────────
  // 2. MESA CENTRAL (TKSSU090000_90 / 150)
  // Centrada en Z = 0 (va de Z = -450mm a Z = +450mm) y pegada a la pared del panel (X = 0mm)
  // ─────────────────────────────────────────────────────────
  const numTableSize = Number(tableSize);
  if (numTableSize === 90 || numTableSize === 150) {
    const tableCat = numTableSize === 150 ? MILA_PANEL_DIVISOR_CATALOG.table150 : MILA_PANEL_DIVISOR_CATALOG.table90;
    const tableLengthMm = numTableSize === 150 ? 1500 : 900;
    // La mesa es trapezoidal: los herrajes grises de acople están en Local X = tableLengthMm.
    // Al posicionar en X = panelBackFaceXMm - tableLengthMm con rotación y = 0, el acople se pega exacto a la pared (X = 0mm)
    // y la superficie queda centrada en la mitad del panel en Z (de -450mm a +450mm).
    const tableXM = panelBackFaceXMm - tableLengthMm;
    const tableZM = 450; // mm (se mapea a Z en el rango [-450, +450], centrado en Z = 0)

    parts.push({
      type: 'GLB_PART',
      subtype: 'booth-table',
      line: 'MILA',
      groupId,
      groupName,
      code: tableCat.code,
      logicalCode: `MILA_BOOTH_TABLE_${numTableSize}`,
      name: tableCat.label,
      description: tableCat.description,
      prices: tableCat.prices,
      model: { src: tableCat.modelSrc },
      position: { x: tableXM, y: 0, z: tableZM },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: 'mila',
        role: 'booth-table',
        line: 'MILA',
        tableSize: numTableSize,
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // 3. TAMAÑO LADO IZQUIERDO (Para calcular posición de pantalla)
  // ─────────────────────────────────────────────────────────
  const numSeatsLeft = Math.max(0, Math.min(4, Number(seatsLeft) || 0));

  // ─────────────────────────────────────────────────────────
  // 4. TAMAÑO LADO DERECHO (Para calcular posición de pantalla)
  // ─────────────────────────────────────────────────────────
  const numSeatsRight = Math.max(0, Math.min(4, Number(seatsRight) || 0));


  // ─────────────────────────────────────────────────────────
  // 5. PANTALLA LATERAL IZQUIERDA
  // Al estar del lado -X, para que las aletas miren hacia afuera,
  // usamos el modelo DER rotado 180 grados.
  // ─────────────────────────────────────────────────────────
  if (screenLeft && numSeatsLeft > 0) {
    // IMPORTANTE: Usar screenDer para el lado izquierdo en -X
    const screenCatKey = `screenDer${numSeatsLeft}P`;
    const screenCat = MILA_PANEL_DIVISOR_CATALOG[screenCatKey] || MILA_PANEL_DIVISOR_CATALOG.screenDer1P;
    parts.push({
      type: 'GLB_PART',
      subtype: 'screen-izq',
      line: 'MILA',
      groupId,
      groupName,
      code: screenCat.code,
      logicalCode: `MILA_BOOTH_SCREEN_IZQ_${numSeatsLeft}P`, // Mantenemos el código lógico IZQ
      name: screenCat.label,
      description: screenCat.description,
      prices: screenCat.prices,
      model: { src: screenCat.modelSrc },
      position: {
        x: panelBackFaceXMm, // Sin offset, el borde recto queda en 0
        y: screenBaseYMm,
        z: 504,
      },
      rotation: { x: 0, y: Math.PI, z: 0 },
      meta: {
        category: 'mila',
        role: 'screen-izq',
        side: 'left',
        puestos: numSeatsLeft,
        line: 'MILA',
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // 6. PANTALLA LATERAL DERECHA
  // Al estar del lado -X, para que las aletas miren hacia afuera,
  // usamos el modelo IZQ con rotación 0.
  // ─────────────────────────────────────────────────────────
  if (screenRight && numSeatsRight > 0) {
    // IMPORTANTE: Usar screenIzq para el lado derecho en -X
    const screenCatKey = `screenIzq${numSeatsRight}P`;
    const screenCat = MILA_PANEL_DIVISOR_CATALOG[screenCatKey] || MILA_PANEL_DIVISOR_CATALOG.screenIzq1P;
    parts.push({
      type: 'GLB_PART',
      subtype: 'screen-der',
      line: 'MILA',
      groupId,
      groupName,
      code: screenCat.code,
      logicalCode: `MILA_BOOTH_SCREEN_DER_${numSeatsRight}P`, // Mantenemos el código lógico DER
      name: screenCat.label,
      description: screenCat.description,
      prices: screenCat.prices,
      model: { src: screenCat.modelSrc },
      position: {
        x: panelBackFaceXMm - (numSeatsRight * moduleSpacingMm + 32),
        y: screenBaseYMm,
        z: -504,
      },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: 'mila',
        role: 'screen-der',
        side: 'right',
        puestos: numSeatsRight,
        line: 'MILA',
      },
    });
  }

  return {
    groupId,
    groupName,
    parts,
    config: {
      tableSize: numTableSize,
      seatsLeft: numSeatsLeft,
      seatsRight: numSeatsRight,
      screenLeft: Boolean(screenLeft),
      screenRight: Boolean(screenRight),
      seatModeLeft,
      seatModeRight,
    },
  };
}
