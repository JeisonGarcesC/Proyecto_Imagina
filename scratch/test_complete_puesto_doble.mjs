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

// 1. Costado Central Spine (KUSO820000)
const spine = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO820000_120.glb');
spine.position.set(-0.04115, 0, 0.613);
assembly.add(spine);

// 2. Columnas Izquierdas (Frontal y Posterior)
const colIzqF = await loadGlbLocal('public/assets/models/Kuo AV/KUSO800000_IZQ.glb');
colIzqF.position.set(-0.600, 0, 0.600);
assembly.add(colIzqF);

const colIzqP = await loadGlbLocal('public/assets/models/Kuo AV/KUSO800000_DER.glb');
colIzqP.position.set(-0.600 + 0.0761, 0, -0.600);
colIzqP.rotation.set(0, Math.PI, 0);
assembly.add(colIzqP);

// 3. Columnas Derechas (Frontal y Posterior)
const colDerF = await loadGlbLocal('public/assets/models/Kuo AV/KUSO800000_DER.glb');
colDerF.position.set(0.600 - 0.0761, 0, 0.600);
assembly.add(colDerF);

const colDerP = await loadGlbLocal('public/assets/models/Kuo AV/KUSO800000_IZQ.glb');
colDerP.position.set(0.600, 0, -0.600);
colDerP.rotation.set(0, Math.PI, 0);
assembly.add(colDerP);

// 4. Vigas
const vigaF = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaF.position.set(-0.598, 0.660, 0.5565);
assembly.add(vigaF);

const vigaP = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO420000_120.glb');
vigaP.position.set(0.598, 0.660, -0.5565);
vigaP.rotation.set(0, Math.PI, 0);
assembly.add(vigaP);

// 5. Ducto Central Doble
const ducto = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUSO830000_120.glb');
ducto.position.set(-0.55455, 0.5541, 0.1225);
assembly.add(ducto);

// 6. Grommet Doble
const grommet = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/LKAC250000_DOBLE.glb');
grommet.position.set(-0.256, 0.6965, 0.1285);
assembly.add(grommet);

// 7. Kit Fuente y Soportes
const kitFuente = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC1040000_74Doble.glb');
kitFuente.position.set(-0.024, 0.1239, 0.040);
assembly.add(kitFuente);

const sopF = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopF.position.set(-0.3035, 0.5541, 0.1161);
assembly.add(sopF);

const sopP = await loadGlbLocal('public/assets/models/Kuo AV/KUAC680000.glb');
sopP.position.set(0.3035, 0.5541, -0.1161);
sopP.rotation.set(0, Math.PI, 0);
assembly.add(sopP);

// 8. Vértebras
const vertIzq = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertIzq.position.set(-0.06, 0.002, 0.0807);
vertIzq.rotation.set(0, Math.PI, 0);
assembly.add(vertIzq);

const vertDer = await loadGlbLocal('public/assets/models/Kuo AV/Puesto Doble/KUAC650000.glb');
vertDer.position.set(0.06, 0.002, 0.0807);
assembly.add(vertDer);

assembly.updateMatrixWorld(true);
const totalBox = new THREE.Box3().setFromObject(assembly);
const totalSize = new THREE.Vector3();
const totalCenter = new THREE.Vector3();
totalBox.getSize(totalSize);
totalBox.getCenter(totalCenter);

console.log(`\n=== ENSAMBLE COMPLETO PUESTO DOBLE CON COLUMNAS Y VIGAS ===`);
console.log(`  Size (mm): X=${(totalSize.x*1000).toFixed(1)}, Y=${(totalSize.y*1000).toFixed(1)}, Z=${(totalSize.z*1000).toFixed(1)}`);
console.log(`  Min (mm): X=${(totalBox.min.x*1000).toFixed(1)}, Y=${(totalBox.min.y*1000).toFixed(1)}, Z=${(totalBox.min.z*1000).toFixed(1)}`);
console.log(`  Max (mm): X=${(totalBox.max.x*1000).toFixed(1)}, Y=${(totalBox.max.y*1000).toFixed(1)}, Z=${(totalBox.max.z*1000).toFixed(1)}`);
console.log(`  Center (mm): X=${(totalCenter.x*1000).toFixed(1)}, Y=${(totalCenter.y*1000).toFixed(1)}, Z=${(totalCenter.z*1000).toFixed(1)}`);
