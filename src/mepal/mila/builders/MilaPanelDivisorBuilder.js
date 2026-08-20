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
  // Centrada en Z = 0 (va de Z = -450mm a Z = +450mm)
  // ─────────────────────────────────────────────────────────
  const numTableSize = Number(tableSize);
  if (numTableSize === 90 || numTableSize === 150) {
    const tableCat = numTableSize === 150 ? MILA_PANEL_DIVISOR_CATALOG.table150 : MILA_PANEL_DIVISOR_CATALOG.table90;
    const tableLengthMm = numTableSize === 150 ? 1500 : 900;
    // La mesa es trapezoidal: el lado plano con los herrajes grises y el grommet
    // se acopla contra la pared en X = 87mm y centrada exactamente en Z = 0
    const tableXM = panelThicknessMm + tableLengthMm; // 87 + 900 = 987 mm (o 1587 mm)
    const tableZM = -450; // mm

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
      rotation: { x: 0, y: Math.PI, z: 0 },
      meta: {
        category: 'mila',
        role: 'booth-table',
        line: 'MILA',
        tableSize: numTableSize,
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // 3. PUESTOS SILLAS MILA - LADO IZQUIERDO (Mirando hacia -Z, hacia la mesa)
  // ─────────────────────────────────────────────────────────
  const numSeatsLeft = Math.max(0, Math.min(4, Number(seatsLeft) || 0));
  if (numSeatsLeft > 0) {
    const seatCat = MILA_PANEL_DIVISOR_CATALOG.seat;
    const legCat = MILA_PANEL_DIVISOR_CATALOG.legs;
    const centerLegCat = MILA_PANEL_DIVISOR_CATALOG.centerSupportLeg;
    const seatOffsetMm = MILA_SINGLE_SEAT_MODE_OFFSETS_MM[seatModeLeft] || MILA_SINGLE_SEAT_MODE_OFFSETS_MM.chair;

    for (let i = 0; i < numSeatsLeft; i++) {
      const offsetX = panelThicknessMm + (i + 1) * moduleSpacingMm;
      parts.push({
        type: 'GLB_PART',
        subtype: 'seat-left',
        line: 'MILA',
        groupId,
        groupName,
        code: seatCat.code,
        logicalCode: `MILA_BOOTH_SEAT_IZQ_${i + 1}`,
        name: `Silla Mila puesto ${i + 1} (izq)`,
        description: seatCat.description,
        prices: seatCat.prices,
        model: { src: seatCat.modelSrc },
        position: {
          x: offsetX + Number(seatOffsetMm.x || 0),
          y: screenBaseYMm + Number(seatOffsetMm.y || 0),
          z: seatForwardZMm + Number(seatOffsetMm.z || 0),
        },
        rotation: { x: 0, y: Math.PI, z: 0 },
        meta: {
          category: 'mila',
          role: 'seat',
          side: 'left',
          seatIndex: i,
          seatMode: seatModeLeft,
          line: 'MILA',
        },
      });
    }

    // Patas soporte izquierdo
    parts.push({
      type: 'GLB_PART',
      subtype: 'legs-left-inner',
      line: 'MILA',
      groupId,
      groupName,
      code: legCat.code,
      logicalCode: 'MILA_BOOTH_LEGS_IZQ_INT',
      name: 'Patas Mila izquierda interior',
      description: legCat.description,
      prices: legCat.prices,
      model: { src: legCat.modelSrc },
      position: {
        x: panelThicknessMm + 246,
        y: 0,
        z: seatForwardZMm,
      },
      rotation: { x: 0, y: Math.PI, z: 0 },
      meta: {
        category: 'mila',
        role: 'legs',
        side: 'left',
        line: 'MILA',
      },
    });

    if (numSeatsLeft > 1) {
      parts.push({
        type: 'GLB_PART',
        subtype: 'legs-left-outer',
        line: 'MILA',
        groupId,
        groupName,
        code: legCat.code,
        logicalCode: 'MILA_BOOTH_LEGS_IZQ_EXT',
        name: 'Patas Mila izquierda exterior',
        description: legCat.description,
        prices: legCat.prices,
        model: { src: legCat.modelSrc },
        position: {
          x: panelThicknessMm + numSeatsLeft * moduleSpacingMm,
          y: 0,
          z: seatForwardZMm,
        },
        rotation: { x: 0, y: Math.PI, z: 0 },
        meta: {
          category: 'mila',
          role: 'legs',
          side: 'left',
          line: 'MILA',
        },
      });
    }

    // Pata intermedia para 3 o 4 sillas
    if (numSeatsLeft >= 3) {
      const midSeamMultiplier = numSeatsLeft === 3 ? 1.5 : 2;
      parts.push({
        type: 'GLB_PART',
        subtype: 'legs-left-center',
        line: 'MILA',
        groupId,
        groupName,
        code: centerLegCat.code,
        logicalCode: 'MILA_BOOTH_LEGS_IZQ_MID',
        name: 'Pata intermedia Mila izquierda',
        description: centerLegCat.description,
        prices: centerLegCat.prices,
        model: { src: centerLegCat.modelSrc },
        position: {
          x: panelThicknessMm + midSeamMultiplier * moduleSpacingMm + 123,
          y: 0,
          z: seatForwardZMm,
        },
        rotation: { x: 0, y: Math.PI, z: 0 },
        meta: {
          category: 'mila',
          role: 'legs-center',
          side: 'left',
          line: 'MILA',
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // 4. PUESTOS SILLAS MILA - LADO DERECHO (Mirando hacia +Z, hacia la mesa)
  // ─────────────────────────────────────────────────────────
  const numSeatsRight = Math.max(0, Math.min(4, Number(seatsRight) || 0));
  if (numSeatsRight > 0) {
    const seatCat = MILA_PANEL_DIVISOR_CATALOG.seat;
    const legCat = MILA_PANEL_DIVISOR_CATALOG.legs;
    const centerLegCat = MILA_PANEL_DIVISOR_CATALOG.centerSupportLeg;
    const seatOffsetMm = MILA_SINGLE_SEAT_MODE_OFFSETS_MM[seatModeRight] || MILA_SINGLE_SEAT_MODE_OFFSETS_MM.chair;

    for (let i = 0; i < numSeatsRight; i++) {
      const offsetX = panelThicknessMm + i * moduleSpacingMm;
      parts.push({
        type: 'GLB_PART',
        subtype: 'seat-right',
        line: 'MILA',
        groupId,
        groupName,
        code: seatCat.code,
        logicalCode: `MILA_BOOTH_SEAT_DER_${i + 1}`,
        name: `Silla Mila puesto ${i + 1} (der)`,
        description: seatCat.description,
        prices: seatCat.prices,
        model: { src: seatCat.modelSrc },
        position: {
          x: offsetX + Number(seatOffsetMm.x || 0),
          y: screenBaseYMm + Number(seatOffsetMm.y || 0),
          z: -seatForwardZMm + Number(seatOffsetMm.z || 0),
        },
        rotation: { x: 0, y: 0, z: 0 },
        meta: {
          category: 'mila',
          role: 'seat',
          side: 'right',
          seatIndex: i,
          seatMode: seatModeRight,
          line: 'MILA',
        },
      });
    }

    // Patas soporte derecho
    parts.push({
      type: 'GLB_PART',
      subtype: 'legs-right-inner',
      line: 'MILA',
      groupId,
      groupName,
      code: legCat.code,
      logicalCode: 'MILA_BOOTH_LEGS_DER_INT',
      name: 'Patas Mila derecha interior',
      description: legCat.description,
      prices: legCat.prices,
      model: { src: legCat.modelSrc },
      position: {
        x: panelThicknessMm,
        y: 0,
        z: -seatForwardZMm,
      },
      rotation: { x: 0, y: 0, z: 0 },
      meta: {
        category: 'mila',
        role: 'legs',
        side: 'right',
        line: 'MILA',
      },
    });

    if (numSeatsRight > 1) {
      parts.push({
        type: 'GLB_PART',
        subtype: 'legs-right-outer',
        line: 'MILA',
        groupId,
        groupName,
        code: legCat.code,
        logicalCode: 'MILA_BOOTH_LEGS_DER_EXT',
        name: 'Patas Mila derecha exterior',
        description: legCat.description,
        prices: legCat.prices,
        model: { src: legCat.modelSrc },
        position: {
          x: panelThicknessMm + numSeatsRight * moduleSpacingMm - 246,
          y: 0,
          z: -seatForwardZMm,
        },
        rotation: { x: 0, y: 0, z: 0 },
        meta: {
          category: 'mila',
          role: 'legs',
          side: 'right',
          line: 'MILA',
        },
      });
    }

    // Pata intermedia para 3 o 4 sillas
    if (numSeatsRight >= 3) {
      const midSeamMultiplier = numSeatsRight === 3 ? 1.5 : 2;
      parts.push({
        type: 'GLB_PART',
        subtype: 'legs-right-center',
        line: 'MILA',
        groupId,
        groupName,
        code: centerLegCat.code,
        logicalCode: 'MILA_BOOTH_LEGS_DER_MID',
        name: 'Pata intermedia Mila derecha',
        description: centerLegCat.description,
        prices: centerLegCat.prices,
        model: { src: centerLegCat.modelSrc },
        position: {
          x: panelThicknessMm + midSeamMultiplier * moduleSpacingMm - 123,
          y: 0,
          z: -seatForwardZMm,
        },
        rotation: { x: 0, y: 0, z: 0 },
        meta: {
          category: 'mila',
          role: 'legs-center',
          side: 'right',
          line: 'MILA',
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. PANTALLA LATERAL IZQUIERDA (TKSPN090000_..._IZQ)
  // ─────────────────────────────────────────────────────────
  if (screenLeft && numSeatsLeft > 0) {
    const screenCatKey = `screenIzq${numSeatsLeft}P`;
    const screenCat = MILA_PANEL_DIVISOR_CATALOG[screenCatKey] || MILA_PANEL_DIVISOR_CATALOG.screenIzq1P;
    parts.push({
      type: 'GLB_PART',
      subtype: 'screen-izq',
      line: 'MILA',
      groupId,
      groupName,
      code: screenCat.code,
      logicalCode: `MILA_BOOTH_SCREEN_IZQ_${numSeatsLeft}P`,
      name: screenCat.label,
      description: screenCat.description,
      prices: screenCat.prices,
      model: { src: screenCat.modelSrc },
      position: {
        x: panelThicknessMm + numSeatsLeft * moduleSpacingMm + 32,
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
  // 6. PANTALLA LATERAL DERECHA (TKSPN090000_..._DER)
  // ─────────────────────────────────────────────────────────
  if (screenRight && numSeatsRight > 0) {
    const screenCatKey = `screenDer${numSeatsRight}P`;
    const screenCat = MILA_PANEL_DIVISOR_CATALOG[screenCatKey] || MILA_PANEL_DIVISOR_CATALOG.screenDer1P;
    parts.push({
      type: 'GLB_PART',
      subtype: 'screen-der',
      line: 'MILA',
      groupId,
      groupName,
      code: screenCat.code,
      logicalCode: `MILA_BOOTH_SCREEN_DER_${numSeatsRight}P`,
      name: screenCat.label,
      description: screenCat.description,
      prices: screenCat.prices,
      model: { src: screenCat.modelSrc },
      position: {
        x: panelThicknessMm,
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
