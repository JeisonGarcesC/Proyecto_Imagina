import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

for (const name of ['KUSO800000_IZQ.glb', 'KUSO800000_DER.glb']) {
  const file = `public/assets/models/Kuo AV/${name}`;
  const buffer = fs.readFileSync(file);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });

  console.log(`=== ${name} ===`);
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      const box = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log(`  Mesh: "${child.name}", Mat: "${child.material?.name}", Size: [${(size.x*1000).toFixed(1)}, ${(size.y*1000).toFixed(1)}, ${(size.z*1000).toFixed(1)}] mm, MinY: ${(box.min.y*1000).toFixed(1)}, MaxY: ${(box.max.y*1000).toFixed(1)}`);
    }
  });
}
