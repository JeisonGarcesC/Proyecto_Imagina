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

const assembly = new THREE.Group();
const widthMm = 1200;
const halfWidthM = widthMm / 2000;

// 1. Pie Izquierdo KUSO820000 (Mirando hacia adentro)
const pieIzq = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieIzq.position.set(-halfWidthM, 0, 0.613);
pieIzq.rotation.set(0, 0, 0);
assembly.add(pieIzq);

// 2. Pie Derecho KUSO820000 (Rotado 180° para que mire hacia adentro)
const pieDer = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieDer.position.set(halfWidthM, 0, -0.613);
pieDer.rotation.set(0, Math.PI, 0);
assembly.add(pieDer);

// 3. Ducto Central KUSO830000 ajustado a la altura de socket Y = 0.308m
const ductoInf = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');
ductoInf.position.set(-0.55455, 0.308, 0.1225);
assembly.add(ductoInf);

assembly.updateMatrixWorld(true);
const totalBox = new THREE.Box3().setFromObject(assembly);
const totalSize = new THREE.Vector3();
const totalCenter = new THREE.Vector3();
totalBox.getSize(totalSize);
totalBox.getCenter(totalCenter);

console.log(`\n=== ALINEACIÓN DE PIES Y DUCTO CENTRAL ===`);
console.log(`  Size (mm): X=${(totalSize.x*1000).toFixed(1)}, Y=${(totalSize.y*1000).toFixed(1)}, Z=${(totalSize.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(totalBox.min.x*1000).toFixed(1)}, Y=${(totalBox.min.y*1000).toFixed(1)}, Z=${(totalBox.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(totalBox.max.x*1000).toFixed(1)}, Y=${(totalBox.max.y*1000).toFixed(1)}, Z=${(totalBox.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(totalCenter.x*1000).toFixed(1)}, Y=${(totalCenter.y*1000).toFixed(1)}, Z=${(totalCenter.z*1000).toFixed(1)}`);
