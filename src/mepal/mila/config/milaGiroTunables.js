// src/mepal/mila/config/milaGiroTunables.js
//
// Tunables para ajuste fino de las Superficies de Giro Mila.
// Estilo idéntico a milaTunables.js — cambia un número, guarda, y recarga la app.
//
// SISTEMA DE COORDENADAS (espacio local del modelo de giro):
//   +X → derecha del modelo
//   -Z → hacia el frente (la cara "delantera" del modelo tiene Z negativo)
//   +Y → arriba
//
// Los modelos de giro son piezas PLANAS de ~91mm de alto.
// Cada modelo descansa con su cara inferior en Y=0 y su cara superior en Y≈0.091m.
// ─────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────
// ALTURA GLOBAL DE SPAWN
// ─────────────────────────────────────────────────────────────────────────────────
export const MILA_GIRO_TUNE = {
  // Altura de aparición de la superficie de giro en el mundo 3D (en milímetros).
  // Con SPAWN_Y_MM = 320mm (0.32m) + bracket Y 30mm (0.03m) = 0.35m en mundo,
  // coincidiendo perfectamente con la altura de los conectores de las sillas Mila (0.35m).
  SPAWN_Y_MM: 320,
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONECTORES POR ÁNGULO (Centrados en las platinas/brackets grises de montaje)
// Cada superficie de giro tiene 2 puertos de conexión:
//   PORT_A = Primera cara de acople (platina/soporte gris)
//   PORT_B = Segunda cara de acople (platina/soporte gris)
//
// Para cada puerto se define:
//   x, y, z  → posición del conector (metros, centro de la platina de fijación)
//   normal   → vector normal 3D unitario que apunta PERPENDICULAR hacia afuera
//   rotY     → ángulo yaw en radianes (atan2(-normal.z, normal.x))
// ─────────────────────────────────────────────────────────────────────────────────
export const MILA_GIRO_CONNECTOR_TUNE = {

  // ── 45° ─────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU140000.
  // PORT_A: Platina recta (Z=0, Mesh 8). Cara exterior: X=0.3499, Y=0.030, Z=0.0. Normal hacia +Z.
  // PORT_B: Platina angular a 45° (Mesh 7). Cara exterior: X=0.4842, Y=0.030, Z=-0.3258. Normal a 45°.
  45: {
    portA: {
      x: 0.3499,
      y: 0.030,
      z: 0.000,
      normal: { x: 0, y: 0, z: 1 },
      rotY: -Math.PI / 2, // Apunta a +Z (hacia afuera)
    },
    portB: {
      x: 0.4842,
      y: 0.030,
      z: -0.3258,
      normal: { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 },
      rotY: Math.PI / 4, // Apunta a 45° hacia afuera
    },
  },

  // ── 60° ─────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU060000.
  // PORT_A: Platina recta (Z=0, Mesh 7). Cara exterior: X=0.3377, Y=0.030, Z=0.0. Normal hacia +Z.
  // PORT_B: Platina angular a 60° (Mesh 8). Cara exterior: X=0.1369, Y=0.030, Z=-0.3494. Normal a 150°.
  60: {
    portA: {
      x: 0.3377,
      y: 0.030,
      z: 0.000,
      normal: { x: 0, y: 0, z: 1 },
      rotY: -Math.PI / 2,
    },
    portB: {
      x: 0.1369,
      y: 0.030,
      z: -0.3494,
      normal: { x: -Math.sqrt(3) / 2, y: 0, z: -0.5 },
      rotY: (5 * Math.PI) / 6,
    },
  },

  // ── 120° ────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU130000.
  // PORT_A: Platina recta (Z=0, Mesh 7). Cara exterior: X=0.3835, Y=0.030, Z=0.0. Normal hacia +Z.
  // PORT_B: Platina angular a 120° (Mesh 8). Cara exterior: X=0.5844, Y=0.030, Z=-0.3494. Normal a 30°.
  120: {
    portA: {
      x: 0.3835,
      y: 0.030,
      z: 0.000,
      normal: { x: 0, y: 0, z: 1 },
      rotY: -Math.PI / 2,
    },
    portB: {
      x: 0.5844,
      y: 0.030,
      z: -0.3494,
      normal: { x: Math.sqrt(3) / 2, y: 0, z: -0.5 },
      rotY: Math.PI / 6,
    },
  },

  // ── 135° ────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU040000_135.
  // PORT_A: Platina recta (Z=0, Mesh 8). Cara exterior: X=0.3499, Y=0.030, Z=0.0. Normal hacia +Z.
  // PORT_B: Platina angular a 135° (Mesh 7). Cara exterior: X=0.2155, Y=0.030, Z=-0.3258. Normal a 135°.
  135: {
    portA: {
      x: 0.3499,
      y: 0.030,
      z: 0.000,
      normal: { x: 0, y: 0, z: 1 },
      rotY: -Math.PI / 2,
    },
    portB: {
      x: 0.2155,
      y: 0.030,
      z: -0.3258,
      normal: { x: -Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 },
      rotY: (3 * Math.PI) / 4,
    },
  },

  // ── 150° ────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU150000.
  // PORT_A: Platina recta (Z=0, Mesh 8). Cara exterior: X=0.3680, Y=0.030, Z=0.0. Normal hacia +Z.
  // PORT_B: Platina recta derecha (X=0.736, Mesh 7). Cara exterior: X=0.7360, Y=0.030, Z=-0.3680. Normal hacia +X.
  150: {
    portA: {
      x: 0.3680,
      y: 0.030,
      z: 0.000,
      normal: { x: 0, y: 0, z: 1 },
      rotY: -Math.PI / 2,
    },
    portB: {
      x: 0.7360,
      y: 0.030,
      z: -0.3680,
      normal: { x: 1, y: 0, z: 0 },
      rotY: 0,
    },
  },

  // ── 180° ────────────────────────────────────────────────────────────────────
  // Modelo: TKSSU120000.
  // PORT_A: Platina izquierda (X=0, Mesh 8). Cara exterior: X=0.0, Y=0.030, Z=-0.350. Normal hacia -X.
  // PORT_B: Platina derecha (X=0.600, Mesh 7). Cara exterior: X=0.600, Y=0.030, Z=-0.350. Normal hacia +X.
  180: {
    portA: {
      x: 0.000,
      y: 0.030,
      z: -0.350,
      normal: { x: -1, y: 0, z: 0 },
      rotY: Math.PI, // Apunta a -X (hacia afuera por el lado izquierdo)
    },
    portB: {
      x: 0.600,
      y: 0.030,
      z: -0.350,
      normal: { x: 1, y: 0, z: 0 },
      rotY: 0, // Apunta a +X (hacia afuera por el lado derecho)
    },
  },
};
