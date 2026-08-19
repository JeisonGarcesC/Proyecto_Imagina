import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const dirs = [
  'public/assets/models/Kuo AV',
  'public/assets/models/Kuo AV/Puesto Doble'
];

console.log('=== AUDITORÍA COMPLETA DE TODOS LOS GLBS ===\n');

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
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

    console.log(`[${dir}/${file}]`);
    console.log(`  Size (mm): X=${(size.x*1000).toFixed(1)}, Y=${(size.y*1000).toFixed(1)}, Z=${(size.z*1000).toFixed(1)}`);
    console.log(`  Min (mm): X=${(box.min.x*1000).toFixed(1)}, Y=${(box.min.y*1000).toFixed(1)}, Z=${(box.min.z*1000).toFixed(1)}`);
    console.log(`  Max (mm): X=${(box.max.x*1000).toFixed(1)}, Y=${(box.max.y*1000).toFixed(1)}, Z=${(box.max.z*1000).toFixed(1)}`);
    console.log(`  Center (mm): X=${(center.x*1000).toFixed(1)}, Y=${(center.y*1000).toFixed(1)}, Z=${(center.z*1000).toFixed(1)}`);
    
    // Meshes internos
    const meshNames = [];
    gltf.scene.traverse(c => {
      if (c.isMesh) meshNames.push(`${c.name || 'mesh'}(${c.material?.name || 'no-mat'})`);
    });
    console.log(`  Meshes (${meshNames.length}): ${meshNames.slice(0, 8).join(', ')}${meshNames.length > 8 ? '...' : ''}\n`);
  }
}
