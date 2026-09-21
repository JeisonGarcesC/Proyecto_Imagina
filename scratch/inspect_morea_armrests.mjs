import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const files = [
  'public/assets/models/Morea/HSI030000_IZQ.glb',
  'public/assets/models/Morea/HSI030000_DER.glb',
  'public/assets/models/Morea/sillaMorea/HSO010000.glb',
  'public/assets/models/Morea/sillaMorea/HSI010000_W_SEAT.glb',
];

const loader = new GLTFLoader();

for (const file of files) {
  const buf = fs.readFileSync(file);
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });

  gltf.scene.updateMatrixWorld(true);
  const rootBox = new THREE.Box3().setFromObject(gltf.scene);
  const rootSize = rootBox.getSize(new THREE.Vector3());
  const rootCenter = rootBox.getCenter(new THREE.Vector3());

  console.log('\nFILE', file);
  console.log('ROOT', {
    min: rootBox.min.toArray().map((value) => Number(value.toFixed(4))),
    max: rootBox.max.toArray().map((value) => Number(value.toFixed(4))),
    size: rootSize.toArray().map((value) => Number(value.toFixed(4))),
    center: rootCenter.toArray().map((value) => Number(value.toFixed(4))),
  });

  const rows = [];
  gltf.scene.traverse((child) => {
    if (!child?.isMesh) return;
    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    rows.push({
      name: child.name || 'mesh',
      centerX: Number(center.x.toFixed(4)),
      centerY: Number(center.y.toFixed(4)),
      centerZ: Number(center.z.toFixed(4)),
      sizeX: Number(size.x.toFixed(4)),
      sizeY: Number(size.y.toFixed(4)),
      sizeZ: Number(size.z.toFixed(4)),
      minX: Number(box.min.x.toFixed(4)),
      maxX: Number(box.max.x.toFixed(4)),
      minY: Number(box.min.y.toFixed(4)),
      maxY: Number(box.max.y.toFixed(4)),
      minZ: Number(box.min.z.toFixed(4)),
      maxZ: Number(box.max.z.toFixed(4)),
    });
  });

  rows.sort((a, b) => {
    if (a.centerX !== b.centerX) return a.centerX - b.centerX;
    if (a.centerY !== b.centerY) return a.centerY - b.centerY;
    return a.centerZ - b.centerZ;
  });

  console.table(rows);
}
