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

// 1. Pies Dobles KUSO820000
const pieIzq = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieIzq.position.set(-halfWidthM, 0, 0.613);
assembly.add(pieIzq);

const pieDer = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieDer.position.set(halfWidthM - 0.0823, 0, 0.613);
assembly.add(pieDer);

// 2. Parales Linak Blancos (4 unidades)
const paralIzqF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralIzqF.position.set(-halfWidthM + 0.016, 0.023, 0.35);
assembly.add(paralIzqF);

const paralIzqP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralIzqP.position.set(-halfWidthM + 0.066, 0.023, -0.27);
paralIzqP.rotation.set(0, Math.PI, 0);
assembly.add(paralIzqP);

const paralDerF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralDerF.position.set(halfWidthM - 0.066, 0.023, 0.35);
assembly.add(paralDerF);

const paralDerP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralDerP.position.set(halfWidthM - 0.016, 0.023, -0.27);
paralDerP.rotation.set(0, Math.PI, 0);
assembly.add(paralDerP);

// 3. Vigas soporte superiores KUSO420000
const vigaF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaF.position.set(-0.598, 0.650, 0.5565);
assembly.add(vigaF);

const vigaP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaP.position.set(0.598, 0.650, -0.5565);
vigaP.rotation.set(0, Math.PI, 0);
assembly.add(vigaP);

// 4. Canal Superior de Electrificación KUSO860000 (Bajo superficies en Z=0)
const canalSupF = await loadGlbLocal('public/assets/models/Kuo AV/KUSO860000_120.glb');
canalSupF.position.set(-0.5545, 0.5541, 0.140);
assembly.add(canalSupF);

const canalSupP = await loadGlbLocal('public/assets/models/Kuo AV/KUSO860000_120.glb');
canalSupP.position.set(0.5545, 0.5541, -0.140);
canalSupP.rotation.set(0, Math.PI, 0);
assembly.add(canalSupP);

// 5. Ducto / Viga Central Inferior KUSO830000 (Entre las torres de los pies)
const ductoInf = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');
ductoInf.position.set(-0.55455, 0.28, 0.1225);
assembly.add(ductoInf);

// 6. Grommet Central Doble LKAC250000_DOBLE
const grommet = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/LKAC250000_DOBLE.glb');
grommet.position.set(-0.256, 0.6965, 0.1285);
assembly.add(grommet);

// 7. Soportes de Tomas KUAC680000
const sopF = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopF.position.set(-0.3035, 0.5541, 0.1161);
assembly.add(sopF);

const sopP = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopP.position.set(0.3035, 0.5541, -0.1161);
sopP.rotation.set(0, Math.PI, 0);
assembly.add(sopP);

// 8. Vértebras Pasacables KUAC650000 (U-Loop entre el canal superior y el ducto inferior)
const vertF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertF.position.set(-0.035, 0.08, 0.10);
assembly.add(vertF);

const vertP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertP.position.set(0.035, 0.08, -0.10);
vertP.rotation.set(0, Math.PI, 0);
assembly.add(vertP);

// 9. Superficies
const geoSurf = new THREE.BoxGeometry(1.2, 0.03, 0.6);
const surfF = new THREE.Mesh(geoSurf, new THREE.MeshBasicMaterial());
surfF.position.set(0, 0.715, 0.3065);
assembly.add(surfF);

const surfP = new THREE.Mesh(geoSurf, new THREE.MeshBasicMaterial());
surfP.position.set(0, 0.715, -0.3065);
assembly.add(surfP);

assembly.updateMatrixWorld(true);
const totalBox = new THREE.Box3().setFromObject(assembly);
const totalSize = new THREE.Vector3();
const totalCenter = new THREE.Vector3();
totalBox.getSize(totalSize);
totalBox.getCenter(totalCenter);

console.log(`\n=== ENSAMBLE COMPLETO CON CANAL Y VÉRTEBRAS ===`);
console.log(`  Size (mm): X=${(totalSize.x*1000).toFixed(1)}, Y=${(totalSize.y*1000).toFixed(1)}, Z=${(totalSize.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(totalBox.min.x*1000).toFixed(1)}, Y=${(totalBox.min.y*1000).toFixed(1)}, Z=${(totalBox.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(totalBox.max.x*1000).toFixed(1)}, Y=${(totalBox.max.y*1000).toFixed(1)}, Z=${(totalBox.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(totalCenter.x*1000).toFixed(1)}, Y=${(totalCenter.y*1000).toFixed(1)}, Z=${(totalCenter.z*1000).toFixed(1)}`);
