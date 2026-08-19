// src/mepal/kuoAV/config/kuoAVPerimetralTransforms.js
// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTACIÓN Y COMPATIBILIDAD DE CALIBRACIÓN: KUO AV PERIMETRAL
// ─────────────────────────────────────────────────────────────────────────────
// La fuente única de verdad de calibración está centralizada en kuoAVTunables.js.
// Este archivo mantiene compatibilidad con las referencias existentes en el proyecto.
// ─────────────────────────────────────────────────────────────────────────────

import {
  KUO_AV_MASTER_REFERENCE,
  KUO_AV_CALIBRATION,
} from './kuoAVTunables';

export const KUO_AV_PERIMETRAL_REFERENCE = KUO_AV_MASTER_REFERENCE;
export const KUO_AV_PERIMETRAL_TRANSFORMS = KUO_AV_CALIBRATION;

export default KUO_AV_PERIMETRAL_TRANSFORMS;
