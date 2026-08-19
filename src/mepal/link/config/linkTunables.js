// src/mepal/link/config/linkTunables.js
// ─────────────────────────────────────────────────────────────────────────────
// Números, rutas y mapeo de códigos del producto Link (credenza).
// Si algo se ve desplazado, ajusta aquí primero.
// ─────────────────────────────────────────────────────────────────────────────

export const LINK_TUNABLES = {
  /** Ruta base de los GLB (relativa a public/) */
  GLB_BASE: '/assets/models/Link/Credenza EXE/',

  /** Anchos disponibles en centímetros */
  ANCHOS: [120, 150],

  /** Escala visual inicial */
  escalaBase: 1,
};

/**
 * Mapeo: tipo de credenza → código de GLB base.
 *
 *  LKAL160000 = 2 Archivos
 *  LKAL170000 = Librería
 *  LKAL180000 = 1 Archivo 2 Cajoneras
 *  LKAL190000 = 2 Archivos 2 Cajoneras  /  Puerta Corrediza
 */
export const LINK_TYPE_CODES = {
  '2_archivos':       'LKAL160000',
  'libreria':         'LKAL170000',
  '1_archivo_2_caj':  'LKAL180000',
  '2_archivos_2_caj': 'LKAL190000',
  'puerta_corrediza': 'LKAL190000',
};

/**
 * Construye el nombre exacto del archivo GLB.
 * Ejemplo: buildGLBFilename('LKAL160000', 'IZ', 150) → 'LKAL160000_IZ_150.glb'
 */
export function buildGLBFilename(codigo, entrega, ancho) {
  return `${codigo}_${entrega}_${ancho}.glb`;
}

/**
 * Construye la ruta completa del GLB.
 */
export function buildGLBPath(codigo, entrega, ancho) {
  return `${LINK_TUNABLES.GLB_BASE}${buildGLBFilename(codigo, entrega, ancho)}`;
}

