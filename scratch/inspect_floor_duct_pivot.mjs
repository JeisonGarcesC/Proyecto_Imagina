import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

const files = [
  './public/assets/models/koncisaPlus/2KSO333000.glb', // bajante sencillo grommet
  './public/assets/models/koncisaPlus/2KSO348000_120_IZQ.glb', // ducto horizontal terminal (referencia)
];

const loader = new GLTFLoader();

async function inspect(file) {
  const buf = fs.readFileSync(file);
  await new Promise((res) => {
    loader.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      '',
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        console.log(`\n=== ${file} ===`);
        console.log('Origen local del scene (position):', scene.position.toArray());
        console.log('Bounding box X:', [box.min.x.toFixed(4), box.max.x.toFixed(4)]);
        console.log('Bounding box Y:', [box.min.y.toFixed(4), box.max.y.toFixed(4)]);
        console.log('Bounding box Z:', [box.min.z.toFixed(4), box.max.z.toFixed(4)]);
        console.log('Altura total (Y max-min):', (box.max.y - box.min.y).toFixed(4));
        res();
      }
    );
  });
}

for (const f of files) {
  await inspect(f);
}
