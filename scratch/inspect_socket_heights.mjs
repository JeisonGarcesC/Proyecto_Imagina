import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function loadGlbLocal(filePath) {
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });
  return gltf.scene;
}

const kuso82 = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
const kuso83 = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');

console.log('=== INSPECCIÓN DE SOCKET KUSO82 Y KUSO83 ===');

// Nodos de la torre de KUSO82
kuso82.traverse(c => {
  if (c.isMesh && c.name === '15') {
    const box = new THREE.Box3().setFromObject(c);
    console.log(`Torre central KUSO82 Mesh 15: MinY=${(box.min.y*1000).toFixed(1)}, MaxY=${(box.max.y*1000).toFixed(1)}, MinZ=${(box.min.z*1000).toFixed(1)}, MaxZ=${(box.max.z*1000).toFixed(1)}`);
  }
});

// Nodos de KUSO83
const box83 = new THREE.Box3().setFromObject(kuso83);
console.log(`Ducto KUSO83: Height=${((box83.max.y - box83.min.y)*1000).toFixed(1)} mm, MinY=${(box83.min.y*1000).toFixed(1)}, MaxY=${(box83.max.y*1000).toFixed(1)}`);
