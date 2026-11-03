import { Quaternion, Vector3 } from 'three';

const world = (root, xMm, zMm) => root.localToWorld(new Vector3(xMm / 1000, 0, zMm / 1000));
const direction = (root, x, z) => new Vector3(x, 0, z).applyQuaternion(root.getWorldQuaternion(new Quaternion())).normalize();

export function resolveVetroConnectionPoints(root) {
  if (root?.userData?.kind !== 'VETRO_SYSTEM') return [];
  root.updateMatrixWorld(true);
  const data = root.userData;
  const mainLength = Number(data.layoutWidthMm ?? data.nominalWidthMm);
  const points = [
    { id: 'START', kind: 'TERMINAL', position: world(root, -mainLength / 2, 0).toArray(), direction: direction(root, -1, 0).toArray() },
  ];
  let cursor = -mainLength / 2;
  for (let i = 0; i < data.panelWidthsMm.length - 1; i++) {
    cursor += data.panelWidthsMm[i];
    if (data.shape === 'T' && Math.abs(cursor) < 0.001) continue;
    points.push({ id: `MAIN_SEAM_${i}`, kind: 'SEAM', position: world(root, cursor, 0).toArray(), tangent: direction(root, 1, 0).toArray() });
  }
  if (data.shape === 'L') {
    const endZ = Number(data.returnNominalWidthMm);
    cursor = 0;
    for (let i = 0; i < data.returnPanelWidthsMm.length - 1; i++) {
      cursor += data.returnPanelWidthsMm[i];
      points.push({ id: `RETURN_SEAM_${i}`, kind: 'SEAM', position: world(root, mainLength / 2, cursor).toArray(), tangent: direction(root, 0, 1).toArray() });
    }
    points.push({ id: 'END', kind: 'TERMINAL', position: world(root, mainLength / 2, endZ).toArray(), direction: direction(root, 0, 1).toArray() });
  } else if (data.shape === 'T') {
    const endZ = Number(data.returnNominalWidthMm);
    cursor = 0;
    for (let i = 0; i < data.returnPanelWidthsMm.length - 1; i++) {
      cursor += data.returnPanelWidthsMm[i];
      points.push({ id: `RETURN_SEAM_${i}`, kind: 'SEAM', position: world(root, 0, cursor).toArray(), tangent: direction(root, 0, 1).toArray() });
    }
    points.push({ id: 'END', kind: 'TERMINAL', position: world(root, mainLength / 2, 0).toArray(), direction: direction(root, 1, 0).toArray() });
    points.push({ id: 'BRANCH_END', kind: 'TERMINAL', position: world(root, 0, endZ).toArray(), direction: direction(root, 0, 1).toArray() });
  } else {
    points.push({ id: 'END', kind: 'TERMINAL', position: world(root, mainLength / 2, 0).toArray(), direction: direction(root, 1, 0).toArray() });
  }
  return points.map((point) => ({ ...point, systemId: data.systemId, heightMm: data.heightMm }));
}
