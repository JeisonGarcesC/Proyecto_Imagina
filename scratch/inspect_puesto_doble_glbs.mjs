import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const dir = 'public/assets/models/Kuo AV/Puesto Doble';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));

console.log('=== INSPECCIÓN DE GLB PUESTO DOBLE ===');

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

  console.log(`\nArchivo: ${file}`);
  console.log(`  Size (m): X=${size.x.toFixed(4)}, Y=${size.y.toFixed(4)}, Z=${size.z.toFixed(4)}`);
  console.log(`  Size (mm): X=${(size.x*1000).toFixed(1)}, Y=${(size.y*1000).toFixed(1)}, Z=${(size.z*1000).toFixed(1)}`);
  console.log(`  Min (m): X=${box.min.x.toFixed(4)}, Y=${box.min.y.toFixed(4)}, Z=${box.min.z.toFixed(4)}`);
  console.log(`  Max (m): X=${box.max.x.toFixed(4)}, Y=${box.max.y.toFixed(4)}, Z=${box.max.z.toFixed(4)}`);
  console.log(`  Center (m): X=${center.x.toFixed(4)}, Y=${center.y.toFixed(4)}, Z=${center.z.toFixed(4)}`);
}
