import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

console.log('=== TEST ENSAMBLE EXACTO PUESTO DOBLE ===');

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

// 1. Costado Central / Intermedio
const costadoInt = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
costadoInt.position.set(-0.04115, 0, 0.613);
assembly.add(costadoInt);

// 2. Costado Izquierdo
const costadoIzq = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
costadoIzq.position.set(-0.55885, 0, 0.613);
assembly.add(costadoIzq);

// 3. Costado Derecho
const costadoDer = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
costadoDer.position.set(0.5177, 0, 0.613);
assembly.add(costadoDer);

// 4. Vigas
const vigaF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaF.position.set(-0.598, 0.650, 0.5565);
assembly.add(vigaF);

const vigaP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaP.position.set(0.598, 0.650, -0.5565);
vigaP.rotation.set(0, Math.PI, 0);
assembly.add(vigaP);

// 5. Ducto Central
const ducto = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');
ducto.position.set(-0.55455, 0.5541, 0.1225);
assembly.add(ducto);

// 6. Grommet Doble
const grommet = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/LKAC250000_DOBLE.glb');
grommet.position.set(-0.256, 0.6965, 0.1285);
assembly.add(grommet);

// 7. Vértebra
const vertebra = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertebra.position.set(0.06, 0.002, 0.0807);
assembly.add(vertebra);

// 8. Kit Fuente Doble
const kitFuente = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74Doble.glb');
kitFuente.position.set(-0.024, 0.1239, 0.040);
assembly.add(kitFuente);

// 9. Superficies Procedurales
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

console.log(`\nEnsamble Total Puesto Doble:`);
console.log(`  Size (mm): X=${(totalSize.x*1000).toFixed(1)}, Y=${(totalSize.y*1000).toFixed(1)}, Z=${(totalSize.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(totalBox.min.x*1000).toFixed(1)}, Y=${(totalBox.min.y*1000).toFixed(1)}, Z=${(totalBox.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(totalBox.max.x*1000).toFixed(1)}, Y=${(totalBox.max.y*1000).toFixed(1)}, Z=${(totalBox.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(totalCenter.x*1000).toFixed(1)}, Y=${(totalCenter.y*1000).toFixed(1)}, Z=${(totalCenter.z*1000).toFixed(1)}`);

if (Math.abs(totalBox.min.y) < 0.005 && Math.abs(totalCenter.x) < 0.01 && Math.abs(totalCenter.z) < 0.01) {
  console.log('\n>>> ALINEACIÓN PERFECTA: Centrado en X=0, Z=0 y apoyado en el piso Y=0 <<<');
}
