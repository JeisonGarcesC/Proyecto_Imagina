import { resolveLockerSelectionGenericos } from '../catalog/lockerFinishCatalog.js';

// La coraza (BODY/PLINTH) siempre es metalica pintada; las naves/puertas (LOCKER_BAY)
// usan el material configurado (Formica/Melamina/Metalica).
function isLockerBodyMesh(node, root) {
  let cur = node;
  while (cur && cur !== root) {
    const role = cur.userData?.componentRole;
    if (role === 'LOCKER_BAY') return false;
    if (role === 'BODY' || role === 'PLINTH') return true;
    cur = cur.parent;
  }
  return true;
}

export function getLockerSelectionInfo(root, subMesh) {
  const config = root?.userData?.config || {};
  const isBodyPart = !subMesh || isLockerBodyMesh(subMesh, root);
  const genericos = resolveLockerSelectionGenericos(config.material, { isBodyPart });
  return { generico: genericos[0] || null, genericos };
}
