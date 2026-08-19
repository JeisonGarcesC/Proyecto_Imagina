import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

for (const name of ['KUAC1040000_74.glb', 'KUAC1040000_120.glb', 'KUAC1040000_74Doble.glb']) {
  const file = `public/assets/models/Kuo AV/Puesto Doble/${name}`;
  const buffer = fs.readFileSync(file);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });

  console.log(`=== ${name} ===`);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log(`  Size: [${(size.x*1000).toFixed(1)}, ${(size.y*1000).toFixed(1)}, ${(size.z*1000).toFixed(1)}] mm`);
  console.log(`  Min: [${(box.min.x*1000).toFixed(1)}, ${(box.min.y*1000).toFixed(1)}, ${(box.min.z*1000).toFixed(1)}] mm`);
  console.log(`  Max: [${(box.max.x*1000).toFixed(1)}, ${(box.max.y*1000).toFixed(1)}, ${(box.max.z*1000).toFixed(1)}] mm`);

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      const mb = new THREE.Box3().setFromObject(child);
      const ms = new THREE.Vector3();
      mb.getSize(ms);
      console.log(`    Mesh: "${child.name}", Mat: "${child.material?.name}", Color: #${child.material?.color?.getHexString()}, Size: [${(ms.x*1000).toFixed(1)}, ${(ms.y*1000).toFixed(1)}, ${(ms.z*1000).toFixed(1)}] mm, MinY: ${(mb.min.y*1000).toFixed(1)}, MaxY: ${(mb.max.y*1000).toFixed(1)}`);
    }
  });
}
