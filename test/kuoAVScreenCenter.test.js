import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const cache = new Map();
async function loadGlb(candidates) {
  const path = candidates.map((candidate) =>
    join(publicRoot, ...decodeURI(candidate).split('/').filter(Boolean))
  ).find(existsSync);
  assert.ok(path, `Missing GLB: ${candidates[0]}`);
  if (!cache.has(path)) {
    const buffer = readFileSync(path);
    const loader = new GLTFLoader();
    loader.register(() => ({ name: 'geometryAudit', loadTexture: () => Promise.resolve(null) }));
    cache.set(path, await loader.parseAsync(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), ''
    ));
  }
  return cache.get(path);
}

test('real double screen panels are equidistant from both tops at every offered size and height', async () => {
  for (const pantallaTipo of ['FORMICA', 'MELAMINA', 'TELA', 'VIDRIO']) {
    for (const anchoMm of [1200, 1300, 1400, 1500, 1600, 1650]) {
      for (const alturaMm of [730, 1200]) {
        const config = { pantalla: true, pantallaTipo, anchoMm, alturaMm,
          profundidadMm: anchoMm === 1200 ? 600 : 750 };
        const { object } = await createKuoAVDobleInstance({ config, loadGlb });
        object.updateMatrixWorld(true);
        const front = object.children.find((part) => part.userData.role === 'SURFACE_FRONT');
        const back = object.children.find((part) => part.userData.role === 'SURFACE_BACK');
        const frontBox = new THREE.Box3().setFromObject(front);
        const backBox = new THREE.Box3().setFromObject(back);
        const screen = object.children.find((part) => part.userData.role === 'PANTALLA');
        let panels = 0;
        screen.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const box = new THREE.Box3().setFromObject(mesh);
          const size = box.getSize(new THREE.Vector3());
          if (size.y < 0.5 || size.z > 0.02) return;
          panels++;
          assert.ok(Math.abs((box.min.z + box.max.z) / 2) < 1e-6,
            `${pantallaTipo} ${anchoMm}/${alturaMm}: panel not centered`);
          assert.ok(Math.abs((frontBox.min.z - box.max.z)
            - (box.min.z - backBox.max.z)) < 1e-6, 'Unequal clearance to tops');
        });
        assert.ok(panels > 0);
        const baseline = buildKuoAVDoble({ ...config, pantalla: false }).parts;
        assert.deepEqual(
          buildKuoAVDoble(config).parts.filter((part) => part.type !== 'pantalla'), baseline
        );
      }
    }
  }
});
