import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const file = 'public/assets/models/Kuo AV/KUAC680000.glb';
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

console.log(`KUAC680000.glb:`);
console.log(`  Size (m): X=${size.x.toFixed(4)}, Y=${size.y.toFixed(4)}, Z=${size.z.toFixed(4)}`);
console.log(`  Min (m): X=${box.min.x.toFixed(4)}, Y=${box.min.y.toFixed(4)}, Z=${box.min.z.toFixed(4)}`);
console.log(`  Max (m): X=${box.max.x.toFixed(4)}, Y=${box.max.y.toFixed(4)}, Z=${box.max.z.toFixed(4)}`);
console.log(`  Center (m): X=${center.x.toFixed(4)}, Y=${center.y.toFixed(4)}, Z=${center.z.toFixed(4)}`);
