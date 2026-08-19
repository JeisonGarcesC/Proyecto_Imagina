import * as THREE from 'three';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';

const mockLoadGlb = async (paths) => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshBasicMaterial());
  group.add(mesh);
  return group;
};

for (const ancho of [1200, 1500, 1650]) {
  for (const prof of [600, 750]) {
    for (const alt of [730, 750]) {
      const result = await createKuoAVDobleInstance({
        config: { anchoMm: ancho, profundidadMm: prof, alturaMm: alt, thickMm: 30 },
        loadGlb: mockLoadGlb,
      });

      const { object } = result;
      const surfF = object.children.find(c => c.userData?.codigo === 'LKSU010010_F');
      const surfP = object.children.find(c => c.userData?.codigo === 'LKSU010010_P');

      const sGeo = surfF.geometry;
      sGeo.computeBoundingBox();
      const sWidth = ((sGeo.boundingBox.max.x - sGeo.boundingBox.min.x) * 1000).toFixed(0);
      const sDepth = ((sGeo.boundingBox.max.z - sGeo.boundingBox.min.z) * 1000).toFixed(0);
      const sThick = ((sGeo.boundingBox.max.y - sGeo.boundingBox.min.y) * 1000).toFixed(0);

      console.log(`[TEST] Config ${ancho}x${prof*2} H${alt}: Surf F Geom = ${sWidth}x${sDepth}x${sThick}mm | PosY = ${(surfF.position.y*1000).toFixed(1)}mm`);
      if (Number(sWidth) !== ancho || Number(sDepth) !== prof || (surfF.position.y*1000).toFixed(1) !== (alt - 15).toFixed(1)) {
        throw new Error(`Dimension mismatch! Expected ${ancho}x${prof} at ${(alt-15)}mm, got ${sWidth}x${sDepth} at ${(surfF.position.y*1000).toFixed(1)}mm`);
      }
    }
  }
}
console.log('\n=== ALL PARAMETRIC DIMENSION TESTS PASSED! ===');
