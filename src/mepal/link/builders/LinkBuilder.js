// src/mepal/link/builders/LinkBuilder.js
// ─────────────────────────────────────────────────────────────────────────────
// Decide qué pieza se crea según la configuración del usuario.
// Una credenza Link = siempre 1 GLB. No hay ensamblaje multi-pieza aquí.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { buildGLBPath } from '../config/linkTunables';
import { getLinkTipoDef } from '../parts/linkParts';

/**
 * Construye la definición del assembly Link a insertar.
 *
 * @param {object} config
 * @param {string} config.tipoKey  - clave del tipo de credenza, ej: '2_archivos'
 * @param {string} config.entrega  - 'IZ' | 'DER'
 * @param {number} config.ancho    - 120 | 150
 *
 * @returns {{ groupId, groupName, parts, error? }}
 *   Si el tipo no está disponible, devuelve { error } sin interrumpir.
 */
export function buildLink(config = {}) {
  const { 
    tipoKey = '2_archivos', 
    entrega = 'DER', 
    ancho = 120,
    instanceId,
    groupId: existingGroupId,
  } = config;

  // ── Validar tipo ──────────────────────────────────────────────────────────
  const tipoDef = getLinkTipoDef(tipoKey);

  if (!tipoDef) {
    console.warn(`[LinkBuilder] Tipo desconocido: "${tipoKey}" — se omite.`);
    return { error: `Tipo de credenza desconocido: "${tipoKey}"` };
  }

  if (!tipoDef.disponible || !tipoDef.codigo) {
    console.warn(`[LinkBuilder] "${tipoDef.label}" marcado como no disponible — se omite.`);
    return { error: `"${tipoDef.label}" no está disponible todavía.` };
  }

  // ── Validar entrega ───────────────────────────────────────────────────────
  const entregaNorm = String(entrega).toUpperCase().trim();
  if (!['IZ', 'DER'].includes(entregaNorm)) {
    console.warn(`[LinkBuilder] Entrega inválida: "${entrega}" — usando DER.`);
  }
  const entregaFinal = ['IZ', 'DER'].includes(entregaNorm) ? entregaNorm : 'DER';

  // ── Validar ancho ─────────────────────────────────────────────────────────
  const anchoNum = Number(ancho);
  const anchoFinal = [120, 150].includes(anchoNum) ? anchoNum : 120;

  // ── Construir definición de pieza ─────────────────────────────────────────
  const groupId   = existingGroupId || uuidv4();
  const groupName = `Link_${tipoDef.label}_${entregaFinal}_${anchoFinal}`;

  const glbPath = buildGLBPath(tipoDef.codigo, entregaFinal, anchoFinal);

  const parts = [
    {
      instanceId: instanceId || uuidv4(),
      role:       'credenza',
      src:        glbPath,
      label:      tipoDef.label,
      tipoKey,
      entrega:    entregaFinal,
      ancho:      anchoFinal,
      codigo:     tipoDef.codigo,
    },
  ];

  console.log(`[LinkBuilder] → ${groupName} | GLB: ${glbPath}`);

  return { groupId, groupName, parts };
}

