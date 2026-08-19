// src/mepal/link/parts/linkParts.js
// ─────────────────────────────────────────────────────────────────────────────
// Define los roles y metadatos de cada tipo de credenza Link.
// La ruta GLB se construye dinámicamente en el builder según entrega y ancho.
// ─────────────────────────────────────────────────────────────────────────────

import { LINK_TYPE_CODES } from '../config/linkTunables';

/**
 * Definición de los tipos de credenza disponibles.
 * La propiedad `tipoKey` es la clave usada en LINK_TYPE_CODES.
 */
export const LINK_TIPOS = [
  {
    tipoKey: '2_archivos',
    label: '2 Archivos',
    codigo: LINK_TYPE_CODES['2_archivos'],
    description: 'Credenza de 2 archivos',
    disponible: true,
  },
  {
    tipoKey: 'libreria',
    label: 'Librería',
    codigo: LINK_TYPE_CODES['libreria'],
    description: 'Módulo librería',
    disponible: true,
  },
  {
    tipoKey: '1_archivo_2_caj',
    label: '1 Archivo 2 Cajoneras',
    codigo: LINK_TYPE_CODES['1_archivo_2_caj'],
    description: 'Credenza 1 archivo + 2 cajoneras',
    disponible: true,
  },
  {
    tipoKey: '2_archivos_2_caj',
    label: '2 Archivos 2 Cajoneras',
    codigo: LINK_TYPE_CODES['2_archivos_2_caj'],
    description: 'Credenza 2 archivos + 2 cajoneras',
    disponible: true,
  },
  {
    tipoKey: 'puerta_corrediza',
    label: 'Puerta Corrediza',
    codigo: null,           // sin código GLB propio todavía
    description: 'Credenza puerta corrediza',
    disponible: false,      // se muestra en la UI como "No disponible"
  },
];

/**
 * Busca la definición de un tipo por su clave.
 */
export function getLinkTipoDef(tipoKey) {
  return LINK_TIPOS.find((t) => t.tipoKey === tipoKey) || null;
}

