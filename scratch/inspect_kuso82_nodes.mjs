import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const file = 'public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb';
const buffer = fs.readFileSync(file);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
const gltf = await new Promise((resolve, reject) => {
  loader.parse(arrayBuffer, '', resolve, reject);
});

console.log('=== NODOS Y MESHES EN KUSO820000_120.glb ===');
gltf.scene.traverse((child) => {
  if (child.isMesh) {
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    console.log(`Mesh: "${child.name}", Material: "${child.material?.name}", Size: [${(size.x*1000).toFixed(1)}, ${(size.y*1000).toFixed(1)}, ${(size.z*1000).toFixed(1)}] mm`);
  }
});
