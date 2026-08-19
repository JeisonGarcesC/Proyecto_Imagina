import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const file = 'public/assets/models/Kuo AV/KUSO860000_120.glb';
const buffer = fs.readFileSync(file);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const loader = new GLTFLoader();
const gltf = await new Promise((resolve, reject) => {
  loader.parse(arrayBuffer, '', resolve, reject);
});

const box = new THREE.Box3().setFromObject(gltf.scene);
const size = new THREE.Vector3();
const center = new THREE.Vector3();
box.getSize(size);
box.getCenter(center);

console.log(`=== KUSO860000_120.glb (Canal Superior) ===`);
console.log(`  Size (mm): X=${(size.x*1000).toFixed(1)}, Y=${(size.y*1000).toFixed(1)}, Z=${(size.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(box.min.x*1000).toFixed(1)}, Y=${(box.min.y*1000).toFixed(1)}, Z=${(box.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(box.max.x*1000).toFixed(1)}, Y=${(box.max.y*1000).toFixed(1)}, Z=${(box.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(center.x*1000).toFixed(1)}, Y=${(center.y*1000).toFixed(1)}, Z=${(center.z*1000).toFixed(1)}`);

gltf.scene.traverse((c) => {
  if (c.isMesh) {
    const mb = new THREE.Box3().setFromObject(c);
    const ms = new THREE.Vector3();
    mb.getSize(ms);
    console.log(`    Mesh: "${c.name}", Mat: "${c.material?.name}", Size: [${(ms.x*1000).toFixed(1)}, ${(ms.y*1000).toFixed(1)}, ${(ms.z*1000).toFixed(1)}] mm`);
  }
});
