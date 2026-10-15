import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { resolveKuoAVDobleSupportUpdates } from '../src/mepal/kuoAVDoble/config/kuoAVDobleSupportUpdates.js';
import { expandKuoAVBatchTargets } from '../src/mepal/kuoAV/config/kuoAVBatchTargets.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const assetRoot = join(publicRoot, 'assets', 'models', 'Kuo AV');
const cache = new Map();
test('editing support updates only the selected table, including within the same batch', () => {
  const roots = [
    { userData: { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'first', config: { kuoBatchId: 'a' } } },
    { userData: { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'second', kuoBatchId: 'a' } },
    { userData: { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'third', kuoBatchId: 'a' } },
    { userData: { kind: 'KUO_AV_DOBLE_ASSEMBLY', instanceId: 'other', kuoBatchId: 'b' } },
    { userData: { kind: 'columna', instanceId: 'child', kuoBatchId: 'a' } },
  ];
  for (const id of ['first', 'second', 'third']) {
    const changes = { soporteIntermedio: 'KUSO850000', alturaMm: 1200 };
    const updates = resolveKuoAVDobleSupportUpdates([...roots, roots[0]], id, changes);
    assert.deepEqual(updates, [{ instanceId: id, changes }]);
  }
  assert.deepEqual(resolveKuoAVDobleSupportUpdates(roots, 'first', { alturaMm: 1200 }),
    [{ instanceId: 'first', changes: { alturaMm: 1200 } }]);
  assert.throws(() => resolveKuoAVDobleSupportUpdates(roots, 'missing', {}));
});
async function parse(path) {
  if (!cache.has(path)) {
    const buffer = readFileSync(path);
    const loader = new GLTFLoader();
    // Node validates geometry; texture image decoding requires a browser.
    loader.register(() => ({ name: 'geometryAudit', loadTexture: () => Promise.resolve(null) }));
    cache.set(path, await loader.parseAsync(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), ''
    ));
  }
  return cache.get(path);
}
async function loadGlb(candidates) {
  const path = candidates.map((candidate) =>
    join(publicRoot, ...decodeURI(candidate).split('/').filter(Boolean))
  ).find((candidate) => existsSync(candidate));
  assert.ok(path, `Missing asset: ${candidates[0]}`);
  return parse(path);
}
function bounds(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}
function close(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith('.glb') ? [path] : [];
  });
}

test('complete Kuo batches stay rigid while component selection and other batches stay independent', () => {
  const scene = new THREE.Scene();
  const roots = [];
  for (let index = 0; index < 3; index += 1) {
    const root = new THREE.Group();
    root.userData = {
      kind: index === 0 ? 'KUO_AV_ASSEMBLY' : 'KUO_AV_DOBLE_ASSEMBLY',
      ...(index === 2 ? { config: { kuoBatchId: 'rigid' } } : { kuoBatchId: 'rigid' }),
    };
    root.position.x = index * 1.2;
    scene.add(root);
    roots.push(root);
  }
  const other = new THREE.Group();
  other.userData = { kind: 'KUO_AV_DOBLE_ASSEMBLY', kuoBatchId: 'other' };
  scene.add(other);
  const component = new THREE.Group();
  component.userData = { kind: 'ducto', kuoBatchId: 'rigid', isPartRoot: true };
  roots[1].add(component);
  const candidates = [...roots, other, component, roots[1]];
  const targets = expandKuoAVBatchTargets([roots[1]], candidates);
  assert.equal(targets.length, 3);
  assert.ok(roots.every((root) => targets.includes(root)));
  assert.deepEqual(expandKuoAVBatchTargets([component], candidates), [component]);
  assert.deepEqual(expandKuoAVBatchTargets([other], candidates), [other]);
  const before = roots.map((root) => root.position.clone());
  const delta = new THREE.Vector3(0.2, 0, -0.3);
  targets.forEach((target) => target.position.add(delta));
  roots.forEach((root, index) => assert.deepEqual(root.position.toArray(),
    before[index].clone().add(delta).toArray()));
  const pivot = roots[1].position.clone();
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  targets.forEach((target) => {
    target.position.sub(pivot).applyQuaternion(rotation).add(pivot);
    target.quaternion.premultiply(rotation);
  });
  close(roots[0].position.distanceTo(roots[1].position), 1.2, 1e-10);
  close(roots[1].position.distanceTo(roots[2].position), 1.2, 1e-10);
  assert.deepEqual(other.position.toArray(), [0, 0, 0]);
  assert.deepEqual(component.position.toArray(), [0, 0, 0]);
  assert.ok(roots.every((root) => root.quaternion.equals(rotation)));
  roots.forEach((root, index) => {
    root.position.copy(before[index]);
    root.quaternion.identity();
  });
  close(roots[0].position.distanceTo(roots[2].position), 2.4, 1e-10);
});

test('three doubles default to AUTO and editing the middle union preserves the other tables and BOM', async () => {
  const tables = [];
  for (let kuoBatchIndex = 0; kuoBatchIndex < 3; kuoBatchIndex += 1) {
    const { object } = await createKuoAVDobleInstance({
      config: {
        instanceId: `local-support-${kuoBatchIndex}`,
        kuoBatchId: 'local-support-batch',
        kuoBatchSize: 3,
        kuoBatchIndex,
        anchoMm: 1200,
        profundidadMm: 600,
        kitFuente: true,
      },
      loadGlb,
    });
    tables.push(object);
  }
  const intermediate = (object) => object.children.find(
    (part) => part.userData.role === 'SUPPORT_INTERMEDIATE'
  );
  assert.equal(intermediate(tables[0]), undefined);
  assert.equal(intermediate(tables[1]).userData.lookupTag, 'KUSO840000');
  assert.equal(intermediate(tables[2]).userData.lookupTag, 'KUSO840000');
  const previous = tables.slice();
  const previousBOM = tables.map((object) => JSON.stringify(object.userData.bom));
  const updates = resolveKuoAVDobleSupportUpdates(tables, tables[1].userData.instanceId,
    { soporteIntermedio: 'KUSO850000' });
  for (const update of updates) {
    const index = tables.findIndex((object) => object.userData.instanceId === update.instanceId);
    const { object } = await createKuoAVDobleInstance({
      config: { ...tables[index].userData.config, ...update.changes }, loadGlb,
    });
    tables[index] = object;
  }
  assert.equal(updates.length, 1);
  assert.equal(intermediate(tables[1]).userData.lookupTag, 'KUSO850000');
  assert.equal(tables[0], previous[0]);
  assert.equal(tables[2], previous[2]);
  assert.equal(JSON.stringify(tables[0].userData.bom), previousBOM[0]);
  assert.equal(JSON.stringify(tables[2].userData.bom), previousBOM[2]);
  assert.notEqual(JSON.stringify(tables[1].userData.bom), previousBOM[1]);
});

test('all uploaded Kuo GLBs parse with finite, nonempty native geometry', async () => {
  for (const path of files(assetRoot)) {
    const scene = (await parse(path)).scene;
    const box = bounds(scene);
    assert.ok(!box.isEmpty(), path);
    assert.ok([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite), path);
    assert.ok(box.getSize(new THREE.Vector3()).toArray().every((size) => size > 0), path);
  }
});

test('KUSO810000 variants are identical 60 cm bases, not rematable 75 cm bases', () => {
  const dir = join(assetRoot, 'Puesto Doble');
  const base = readFileSync(join(dir, 'KUSO810000.glb'));
  for (const name of ['KUSO810000_60.glb', 'KUSO810000_75.glb']) {
    assert.ok(base.equals(readFileSync(join(dir, name))), name);
  }
});

test('double native supports follow map depth thresholds, stay centered and match BOM', async () => {
  for (const type of ['KUSO840000', 'KUSO850000']) {
    for (const depth of [600, 700, 740, 750]) {
      for (const height of [730, 1200]) {
        const { object, built } = await createKuoAVDobleInstance({
          config: {
            anchoMm: 1400, profundidadMm: depth, especial: true, alturaMm: height,
            kuoBatchIndex: 1, kuoBatchSize: 2, soporteIntermedio: type,
          },
          loadGlb,
        });
        const support = object.children.find((part) => part.userData.role === 'SUPPORT_INTERMEDIATE');
        assert.ok(support);
        assert.equal(support.userData.lookupTag, type);
        assert.deepEqual(support.scale.toArray(), [1, 1, 1]);
        const part = built.parts.find((part) => part.partId.endsWith('_FOOT_LEFT'));
        assert.ok(part.glb.endsWith(`/${type}_${depth === 750 ? 150 : 120}.glb`));
        const box = bounds(support);
        close(box.getCenter(new THREE.Vector3()).x, -0.7);
        close(box.getCenter(new THREE.Vector3()).z, 0);
        close(box.min.y, 0);
        close(box.max.y, 0.454);
        close(box.getSize(new THREE.Vector3()).z, depth === 750 ? 0.87 : 0.72);
        const code = type === 'KUSO840000'
          ? depth === 750 ? '22000134921' : '22000134920'
          : depth === 750 ? '22000134923' : '22000134922';
        assert.equal(built.bom.find((row) => row.code === code)?.quantity, 1);
        assert.equal(support.userData.parentAssemblyId, object.userData.instanceId);
      }
    }
  }
});

test('single intermediate uses KUSO810000 at native size for every allowed depth', async () => {
  for (const profundidadMm of [600, 700, 750]) {
    const { object, built } = await createKuoAVInstance({
      config: {
        anchoMm: 1400, profundidadMm, especial: true, kitFuente: true,
        kuoBatchIndex: 1, kuoBatchSize: 2,
      },
      loadGlb,
    });
    const part = built.parts.find((part) => part.isIntermediate);
    assert.ok(part.model.src.endsWith('/KUSO810000.glb'));
    const support = object.children.find((child) => child.userData.code === 'KUSO810000');
    assert.ok(support);
    assert.deepEqual(support.scale.toArray(), [1, 1, 1]);
    const box = bounds(support);
    close(box.getSize(new THREE.Vector3()).z, 0.6);
    close(box.getSize(new THREE.Vector3()).x, 0.171);
    close(box.getCenter(new THREE.Vector3()).x, -0.7);
    close(box.min.y, 0);
    assert.equal(object.userData.bom.find((row) => row.code === '22000128085')?.quantity, 1);
  }
});

test('single tables and formica-separated doubles keep terminal supports', async () => {
  for (const config of [
    { kuoBatchSize: 1, soporteIntermedio: 'KUSO850000' },
    { kuoBatchSize: 2, kuoBatchIndex: 1, baldosaFormica: true, soporteIntermedio: 'KUSO850000' },
  ]) {
    const { object } = await createKuoAVDobleInstance({ config, loadGlb });
    assert.ok(!object.children.some((part) => part.userData.role === 'SUPPORT_INTERMEDIATE'));
    assert.equal(object.children.filter((part) => part.userData.lookupTag === 'KUSO820000').length, 2);
  }
});

test('lateral vertebras point right at native scale and retain calibrated contact height', async () => {
  for (const double of [false, true]) {
    for (const anchoMm of [1200, 1500, 1650]) {
      for (const alturaMm of [730, 1200]) {
        const create = double ? createKuoAVDobleInstance : createKuoAVInstance;
        const { object } = await create({
          config: { anchoMm, alturaMm, kitFuente: true, vertebraLateral: true }, loadGlb,
        });
        const vertebras = object.children.filter((part) => part.userData.role?.includes('VERTEBRA'));
        assert.equal(vertebras.length, double ? 2 : 1);
        for (const [index, vertebra] of vertebras.entries()) {
          close(vertebra.rotation.y, 0);
          assert.deepEqual(vertebra.scale.toArray(), [1, 1, 1]);
          close(vertebra.position.x, double
            ? anchoMm / 2000 - (index === 1 ? 0.31 : 0.305) : 0.288202892);
          close(vertebra.position.y, double ? 0.435 : 0.4409);
          const box = bounds(vertebra);
          assert.ok(box.min.x > 0, 'Lateral cable chain is on the right');
          close(box.max.y, (double ? 0.435 : 0.4409)
            + (alturaMm === 1200 ? 0.6552175735 : 0.1522163492));
        }
        const quantity = object.userData.bom.filter((row) => row.code === '22000116690')
          .reduce((sum, row) => sum + row.quantity, 0);
        assert.equal(quantity, double ? 2 : 1);
      }
    }
  }
});

test('perimetral lateral upper terminal meets the socket box side at both heights and all widths', async () => {
  for (const anchoMm of [1200, 1500, 1650]) {
    for (const alturaMm of [730, 1200]) {
      const { object } = await createKuoAVInstance({
        config: { anchoMm, alturaMm, kitFuente: true, vertebraLateral: true }, loadGlb,
      });
      object.updateMatrixWorld(true);
      const vertebra = object.children.find((part) => part.userData.lookupTag === 'KUAC650000_ALT_LAT');
      const socket = object.children.find((part) => part.userData.lookupTag === 'KUAC680000');
      assert.ok(vertebra && socket);
      const box = bounds(vertebra);
      const terminal = new THREE.Vector3(box.min.x, box.max.y - 0.01335, (box.min.z + box.max.z) / 2);
      const ray = new THREE.Ray(terminal.clone().add(new THREE.Vector3(0.02, 0, 0)),
        new THREE.Vector3(-1, 0, 0));
      const triangle = new THREE.Triangle();
      const hit = new THREE.Vector3();
      let firstHit = null;
      socket.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const positions = mesh.geometry.attributes.position;
        const indices = mesh.geometry.index;
        for (let n = 0; n < (indices?.count ?? positions.count); n += 3) {
          triangle.a.fromBufferAttribute(positions, indices ? indices.getX(n) : n).applyMatrix4(mesh.matrixWorld);
          triangle.b.fromBufferAttribute(positions, indices ? indices.getX(n + 1) : n + 1).applyMatrix4(mesh.matrixWorld);
          triangle.c.fromBufferAttribute(positions, indices ? indices.getX(n + 2) : n + 2).applyMatrix4(mesh.matrixWorld);
          if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit)
            && (!firstHit || hit.x > firstHit.x)) firstHit = hit.clone();
        }
      });
      assert.ok(firstHit, `Socket side is missing at the terminal: ${anchoMm}/${alturaMm}`);
      assert.ok(firstHit.distanceTo(terminal) < 0.0001,
        `Upper terminal gap exceeds 0.1 mm: ${anchoMm}/${alturaMm}`);
    }
  }
});
