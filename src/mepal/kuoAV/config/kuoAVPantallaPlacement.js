import * as THREE from 'three';
import { resolveKuoAVHeightPlacement } from './kuoAVHeightPlacement.js';
import { resolveKuoAVDobleHeightPlacement } from '../../kuoAVDoble/config/kuoAVDobleHeightPlacement.js';

// Contact planes measured in KUAC710000: mounting plate top and desk-facing glass face.
export const KUO_AV_PERIMETRAL_SCREEN_MOUNT = Object.freeze({
  plateTopM: 0.0915,
  glassFaceOffsetM: 0.203,
});

export function resolveKuoAVPerimetralScreenHeight(alturaMm = 730, thickMm = 30) {
  return (Number(alturaMm) - Number(thickMm)) / 1000
    - KUO_AV_PERIMETRAL_SCREEN_MOUNT.plateTopM;
}

export function syncKuoAVPerimetralScreenAttachment(screen, desk) {
  const attachment = screen?.userData?.attachment;
  const isDoble = desk?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY';
  if (isDoble
    ? attachment?.mode !== 'DESK_SCREEN_ATTACHMENT'
      || screen.userData.config?.tipo !== 'FRONTAL_PERIMETRAL'
    : desk?.userData?.kind !== 'KUO_AV_ASSEMBLY'
      || attachment?.mode !== 'PERIMETRAL_SCREEN_ATTACHMENT') return false;
  const config = desk.userData.config || {};
  const physicalHeight = config.physicalHeightMm
    ?? (isDoble ? resolveKuoAVDobleHeightPlacement : resolveKuoAVHeightPlacement)(
      config.alturaMm, config.thickMm).surfaceTopMm;
  const offset = {
    x: attachment.offsetLocal?.x || 0,
    y: resolveKuoAVPerimetralScreenHeight(physicalHeight, config.thickMm),
    z: isDoble ? (attachment.offsetLocal?.z || 0) : -(config.profundidadMm || 600) / 2000,
  };
  attachment.offsetLocal = offset;
  desk.updateWorldMatrix(true, false);
  const position = desk.localToWorld(new THREE.Vector3(offset.x, offset.y, offset.z));
  const rotation = desk.getWorldQuaternion(new THREE.Quaternion());
  if (screen.parent) {
    screen.parent.updateWorldMatrix(true, false);
    screen.parent.worldToLocal(position);
    rotation.premultiply(screen.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  }
  screen.position.copy(position);
  screen.quaternion.copy(rotation);
  screen.updateMatrixWorld(true);
  return true;
}
