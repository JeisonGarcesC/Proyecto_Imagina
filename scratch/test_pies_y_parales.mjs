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

// 1. Costado Doble Izquierdo (Pie + Torre central KUSO820000)
const pieIzq = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieIzq.position.set(-halfWidthM, 0, 0.613);
assembly.add(pieIzq);

// 2. Costado Doble Derecho (Pie + Torre central KUSO820000)
const pieDer = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
pieDer.position.set(halfWidthM - 0.0823, 0, 0.613);
assembly.add(pieDer);

// 3. Parales Blancos (4 unidades montadas exactamente sobre las bases de los pies)
// Izquierdo Frontal & Posterior:
const paralIzqF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralIzqF.position.set(-halfWidthM + 0.016, 0.023, 0.35);
paralIzqF.rotation.set(0, 0, 0);
assembly.add(paralIzqF);

const paralIzqP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralIzqP.position.set(-halfWidthM + 0.066, 0.023, -0.27);
paralIzqP.rotation.set(0, Math.PI, 0);
assembly.add(paralIzqP);

// Derecho Frontal & Posterior:
const paralDerF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralDerF.position.set(halfWidthM - 0.066, 0.023, 0.35);
paralDerF.rotation.set(0, 0, 0);
assembly.add(paralDerF);

const paralDerP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74.glb');
paralDerP.position.set(halfWidthM - 0.016, 0.023, -0.27);
paralDerP.rotation.set(0, Math.PI, 0);
assembly.add(paralDerP);

// 4. Vigas soporte superiores KUSO420000
const vigaF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaF.position.set(-0.598, 0.650, 0.5565);
assembly.add(vigaF);

const vigaP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaP.position.set(0.598, 0.650, -0.5565);
vigaP.rotation.set(0, Math.PI, 0);
assembly.add(vigaP);

// 5. Ducto central KUSO830000
const ducto = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');
ducto.position.set(-0.55455, 0.28, 0.1225); // Conecta las dos torres centrales a media altura
assembly.add(ducto);

// 6. Grommet central doble LKAC250000_DOBLE
const grommet = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/LKAC250000_DOBLE.glb');
grommet.position.set(-0.256, 0.6965, 0.1285);
assembly.add(grommet);

// 7. Soportes de tomas KUAC680000
const sopF = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopF.position.set(-0.3035, 0.28, 0.1161);
assembly.add(sopF);

const sopP = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopP.position.set(0.3035, 0.28, -0.1161);
sopP.rotation.set(0, Math.PI, 0);
assembly.add(sopP);

// 8. Vértebra KUAC650000
const vertebra = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertebra.position.set(0.06, 0.002, 0.0807);
assembly.add(vertebra);

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

console.log(`\n=== ENSAMBLE PERFECTO PUESTO DOBLE CON PIES Y PARALES ===`);
console.log(`  Size (mm): X=${(totalSize.x*1000).toFixed(1)}, Y=${(totalSize.y*1000).toFixed(1)}, Z=${(totalSize.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(totalBox.min.x*1000).toFixed(1)}, Y=${(totalBox.min.y*1000).toFixed(1)}, Z=${(totalBox.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(totalBox.max.x*1000).toFixed(1)}, Y=${(totalBox.max.y*1000).toFixed(1)}, Z=${(totalBox.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(totalCenter.x*1000).toFixed(1)}, Y=${(totalCenter.y*1000).toFixed(1)}, Z=${(totalCenter.z*1000).toFixed(1)}`);
