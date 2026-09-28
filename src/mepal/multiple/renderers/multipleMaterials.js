import { MeshStandardMaterial } from 'three';
import { findMultipleFinish } from '../catalog/multipleFinishCatalog.js';
const DEFAULTS = { FORMICA: 0xe6e1d7, METAL: 0xa7aaac, GLASS: 0xb8d9df, FABRIC: 0x8f8578, PAINTED_METAL: 0x4d5357, PVC: 0x292b2d };
export function createMultipleMaterial(role, finishId = null) {
  const finish = findMultipleFinish(finishId); const glass = role === 'GLASS';
  return new MeshStandardMaterial({ color: finish?.color ?? DEFAULTS[role] ?? 0x999999,
    transparent: glass || Number(finish?.opacity) < 1, opacity: finish?.opacity ?? (glass ? 0.35 : 1),
    roughness: glass ? 0.18 : 0.65, metalness: role === 'METAL' || role === 'PAINTED_METAL' ? 0.28 : 0 });
}
