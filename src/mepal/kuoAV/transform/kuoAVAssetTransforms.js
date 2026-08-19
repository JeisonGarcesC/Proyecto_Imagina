// src/mepal/kuoAV/transform/kuoAVAssetTransforms.js
// ─────────────────────────────────────────────────────────────────────────────
// Aplica las rotaciones y escalas de calibración definidas en
// kuoAVTunables.js (KUO_AV_CALIBRATION) a cada objeto 3D de KUO AV.
// Las posiciones y offsets milimétricos se resuelven en KuoAVBuilder.js
// para evitar duplicación de transformaciones.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { KUO_AV_PART_ROLES, KUO_AV_PART_TYPES } from '../parts/kuoAVParts.js';
import { KUO_AV_CALIBRATION } from '../config/kuoAVTunables.js';

const DEG2RAD = Math.PI / 180;

/**
 * Resuelve la clave de calibración correspondiente para una pieza abstracta.
 *
 * @param {Object} part
 * @returns {string|null}
 */
export function resolveTransformKey(part) {
  if (!part) return null;

  if (part.role === KUO_AV_PART_ROLES.POWER_KIT || part.type === KUO_AV_PART_TYPES.KIT_FUENTE) {
    if (part.side === 'left' || part.meta?.side === 'left') return 'kitFuenteIzq';
    if (part.side === 'right' || part.meta?.side === 'right') return 'kitFuenteDer';
    return 'kitFuente';
  }
  if (part.role === KUO_AV_PART_ROLES.LEFT_COLUMN || (part.type === KUO_AV_PART_TYPES.COLUMNA && (part.side === 'left' || part.meta?.side === 'left'))) {
    return 'costadoIzquierdo';
  }
  if (part.role === KUO_AV_PART_ROLES.RIGHT_COLUMN || (part.type === KUO_AV_PART_TYPES.COLUMNA && (part.side === 'right' || part.meta?.side === 'right'))) {
    return 'costadoDerecho';
  }
  if (part.role === KUO_AV_PART_ROLES.CROSSBAR || part.type === KUO_AV_PART_TYPES.VIGA) {
    return 'vigaSoporte';
  }
  if (part.role === KUO_AV_PART_ROLES.DUCT || part.type === KUO_AV_PART_TYPES.DUCTO) {
    return 'ductoCableado';
  }
  if (part.role === KUO_AV_PART_ROLES.VERTEBRA || part.type === KUO_AV_PART_TYPES.VERTEBRA) {
    return 'vertebra';
  }
  if (part.role === KUO_AV_PART_ROLES.SOCKET_SUPPORT || part.type === KUO_AV_PART_TYPES.SOPORTE_TOMAS) {
    return 'soporteTomas';
  }
  if (part.role === KUO_AV_PART_ROLES.GROMMET || part.type === KUO_AV_PART_TYPES.GROMMET) {
    return 'grommet';
  }
  if (part.role === KUO_AV_PART_ROLES.CONTROL_PAD || part.type === KUO_AV_PART_TYPES.CONTROL) {
    return 'botonera';
  }
  return null;
}

/**
 * Aplica la rotación y escala de calibración sobre la malla 3D de la pieza.
 *
 * @param {THREE.Object3D} partObject - Malla/Grupo 3D cargado
 * @param {Object} part - Definición abstracta de la pieza
 */
export function applyKuoAVAssetTransform(partObject, part) {
  if (!partObject || !part) return;
  if (part.model?.kind !== 'glb') return;

  const key = resolveTransformKey(part);
  const cfg = key ? KUO_AV_CALIBRATION[key] : null;

  if (cfg) {
    // 1. Rotación de calibración individual en grados
    const rx = (cfg.rotacionDeg?.x || 0) * DEG2RAD;
    const ry = (cfg.rotacionDeg?.y || 0) * DEG2RAD;
    const rz = (cfg.rotacionDeg?.z || 0) * DEG2RAD;
    partObject.rotation.set(rx, ry, rz);

    // 2. Escala (mantenida en 1, 1, 1 por regla de oro)
    const sx = cfg.escala?.x ?? 1;
    const sy = cfg.escala?.y ?? 1;
    const sz = cfg.escala?.z ?? 1;
    partObject.scale.set(sx, sy, sz);
  } else {
    partObject.rotation.set(0, 0, 0);
    partObject.scale.set(1, 1, 1);
  }
}

export default applyKuoAVAssetTransform;
