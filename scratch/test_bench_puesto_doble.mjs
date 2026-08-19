import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildKuoAVDoble } from './src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

async function loadGlbLocal(filePath) {
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });
  return gltf.scene;
}

// 1. Construir dos Puestos Dobles KUO AV
const desk1Def = buildKuoAVDoble({ anchoMm: 1200, profundidadMm: 600, alturaMm: 730 });
const desk2Def = buildKuoAVDoble({ anchoMm: 1200, profundidadMm: 600, alturaMm: 730 });

console.log('Desk 1 parts count:', desk1Def.parts.length);
console.log('Desk 2 parts count:', desk2Def.parts.length);

const scene = new THREE.Scene();
const desk1Group = new THREE.Group();
desk1Group.position.set(-0.600, 0, 0);
desk1Group.userData = { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'DOBLE_1' };
scene.add(desk1Group);

const desk2Group = new THREE.Group();
desk2Group.position.set(0.600, 0, 0);
desk2Group.userData = { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'DOBLE_2' };
scene.add(desk2Group);

scene.updateMatrixWorld(true);
const box1 = new THREE.Box3().setFromObject(desk1Group);
const box2 = new THREE.Box3().setFromObject(desk2Group);

console.log(`Desk 1 X Range: [${(box1.min.x*1000).toFixed(1)}, ${(box1.max.x*1000).toFixed(1)}]`);
console.log(`Desk 2 X Range: [${(box2.min.x*1000).toFixed(1)}, ${(box2.max.x*1000).toFixed(1)}]`);
console.log('Snap Lateral test OK!');
