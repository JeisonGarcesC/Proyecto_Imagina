// src/mepal/kuoGo/config/kuoGoTunables.js
// ─────────────────────────────────────────────────────────────────────────────
// Configuraciones y constantes para Kuo Go.
// ─────────────────────────────────────────────────────────────────────────────

export const KUOGO_TUNABLES = {
  /** Ruta base de los GLB (relativa a public/) */
  GLB_BASE: '/assets/models/Kuo GO/',

  /** Espesores disponibles */
  ESPESORES: [
    'Espesor Formica 18',
    'Espesor Formica 25',
    'Espesor Formica 30',
    'Espesor Melamina 25'
  ],

  /** Escala visual inicial */
  escalaBase: 1,
};

export function buildGLBFilename(espesor) {
  // Mapear el espesor al nombre del archivo
  if (espesor === 'Espesor Formica 18') return 'formica18.glb';
  if (espesor === 'Espesor Formica 25') return 'formica25.glb';
  if (espesor === 'Espesor Formica 30') return 'formica30.glb';
  if (espesor === 'Espesor Melamina 25') return 'melamina25.glb';
  
  return 'formica18.glb'; // Default fallback
}

export function buildGLBPath(espesor) {
  return `${KUOGO_TUNABLES.GLB_BASE}${buildGLBFilename(espesor)}`;
}
