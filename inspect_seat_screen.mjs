import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

const dir = './public/assets/models/Mila/panelDivisor';
const seatPath = './public/assets/models/Mila/TKSSI011000.glb';
const loader = new GLTFLoader();

async function inspectModels() {
  // 1. Inspect Single Seat TKSSI011000
  const seatBuf = fs.readFileSync(seatPath);
  await new Promise(res => {
    loader.parse(seatBuf.buffer.slice(seatBuf.byteOffset, seatBuf.byteOffset + seatBuf.byteLength), '', gltf => {
      const scene = gltf.scene;
      const box = new THREE.Box3().setFromObject(scene);
      console.log('=== SEAT BOUNDS (TKSSI011000) ===');
      console.log('Box X:', [box.min.x.toFixed(3), box.max.x.toFixed(3)]);
      console.log('Box Y:', [box.min.y.toFixed(3), box.max.y.toFixed(3)]);
      console.log('Box Z:', [box.min.z.toFixed(3), box.max.z.toFixed(3)]);

      // Check where backrest vs seat cushion is along Z
      let cushionZ = 0, backrestZ = 0;
      scene.traverse(node => {
        if (node.isMesh) {
          const b = new THREE.Box3().setFromObject(node);
          console.log(`  Mesh: ${node.name}, Box Z: [${b.min.z.toFixed(3)}, ${b.max.z.toFixed(3)}], Y: [${b.min.y.toFixed(3)}, ${b.max.y.toFixed(3)}]`);
        }
      });
      res();
    });
  });

  // 2. Inspect Screen IZQ and DER for 180 (3 puestos) and 120 (2 puestos)
  for (const code of ['TKSPN090000_180_W_2P_IZQ.glb', 'TKSPN090000_180_W_2P_DER.glb']) {
    const buf = fs.readFileSync(path.join(dir, code));
    await new Promise(res => {
      loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', gltf => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        console.log(`\n=== SCREEN: ${code} ===`);
        console.log('Box X:', [box.min.x.toFixed(3), box.max.x.toFixed(3)]);
        console.log('Box Y:', [box.min.y.toFixed(3), box.max.y.toFixed(3)]);
        console.log('Box Z:', [box.min.z.toFixed(3), box.max.z.toFixed(3)]);
        res();
      });
    });
  }
}

inspectModels();
