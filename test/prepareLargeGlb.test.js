import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { prepareLargeGlb } from '../electron/prepareLargeGlb.js';
import { ModelAssetStore } from '../electron/modelAssetStore.js';
import { GLTFLoader } from 'three-stdlib';
import { LoadingManager } from 'three';

const hash = (data) => createHash('sha256').update(data).digest('hex');
test('prepara buffers externos sin alterar vistas, accessors ni imagen embebida', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'imagina-prepared-'));
  try {
    const source = path.join(directory, 'source.glb');
    const target = path.join(directory, 'prepared');
    const binary = Buffer.from(Array.from({ length: 24 }, (_, index) => index + 1));
    const json = {
      asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 8, target: 34962 },
        { buffer: 0, byteOffset: 8, byteLength: 8, target: 34963 },
        { buffer: 0, byteOffset: 16, byteLength: 8 },
      ],
      accessors: [{ bufferView: 0, componentType: 5121, count: 8, type: 'SCALAR' }],
      images: [{ bufferView: 2, mimeType: 'image/png' }],
    };
    const encoded = Buffer.from(JSON.stringify(json));
    const padded = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 0x20)]);
    const header = Buffer.alloc(20);
    header.write('glTF', 0); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(20 + padded.length + 8 + binary.length, 8);
    header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
    await writeFile(source, Buffer.concat([header, padded, binHeader, binary]));
    const result = await prepareLargeGlb(source, target, '12345678-1234-1234-1234-123456789abc', { binLimit: 12 });
    const derived = JSON.parse(await readFile(path.join(target, 'model.gltf'), 'utf8'));
    assert.equal(derived.buffers.length, 3);
    assert.deepEqual(derived.accessors, json.accessors);
    assert.deepEqual(derived.images, json.images);
    for (const [index, view] of derived.bufferViews.entries()) {
      const buffer = await readFile(path.join(target, derived.buffers[view.buffer].uri));
      assert.deepEqual(buffer.subarray(view.byteOffset, view.byteOffset + view.byteLength), binary.subarray(index * 8, index * 8 + 8));
    }
    assert.equal(result.binSha256, hash(binary));
    assert.equal(result.usefulSha256, hash(binary));
    for (const entry of result.files) {
      const content = await readFile(path.join(target, entry.name));
      assert.equal((await stat(path.join(target, entry.name))).size, entry.size);
      assert.equal(hash(content), entry.sha256);
    }
  } finally {
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir())
      && path.basename(directory).startsWith('imagina-prepared-')) {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('guarda, reabre y verifica recursos preparados mediante assetRef', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'imagina-prepared-'));
  try {
    const source = path.join(directory, 'source.glb');
    const json = Buffer.from('{"asset":{"version":"2.0"},"buffers":[{"byteLength":8}],"bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":8}]}');
    const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
    const header = Buffer.alloc(20);
    header.write('glTF'); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + 8, 8);
    header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(8, 0); binHeader.writeUInt32LE(0x004e4942, 4);
    await writeFile(source, Buffer.concat([header, padded, binHeader, Buffer.from('12345678')]));
    const store = new ModelAssetStore(path.join(directory, 'staging'));
    const asset = await store.importGlb(source, 'source.glb');
    const preparedDir = path.join(directory, 'staging', asset.assetRef);
    await mkdir(preparedDir);
    await copyFile(path.join(directory, 'staging', `${asset.assetRef}.glb`), path.join(preparedDir, 'original.glb'));
    asset.preparedRepresentation = await prepareLargeGlb(source, preparedDir, asset.assetRef);
    store.allowed.set(asset.assetRef, asset);
    await unlink(path.join(directory, 'staging', `${asset.assetRef}.glb`));
    const project = { entities: [{ kind: 'IMPORTED_MODEL', metadata: asset }] };
    const manifest = path.join(directory, 'project', 'proyecto.json');
    await store.saveComplete(project, manifest);
    const reopened = new ModelAssetStore(path.join(directory, 'other-staging'));
    assert.deepEqual(await reopened.openComplete(manifest), project);
    assert.match(await reopened.resolvePreparedPath(asset.assetRef, 'model.gltf'), /model\.gltf$/);
    await unlink(path.join(directory, 'project', 'assets', 'modelos', asset.assetRef, 'buffer-001.bin'));
    await assert.rejects(reopened.openComplete(manifest), /Falta buffer-001.bin/);
  } finally {
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir())
      && path.basename(directory).startsWith('imagina-prepared-')) await rm(directory, { recursive: true, force: true });
  }
});

test('GLTFLoader carga geometría desde varios buffers externos derivados', async () => {
  globalThis.ProgressEvent ||= class ProgressEvent {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
  };
  const directory = await mkdtemp(path.join(os.tmpdir(), 'imagina-prepared-'));
  try {
    const source = path.join(directory, 'triangle.glb');
    const positions = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
    const normals = Buffer.from(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer);
    const binary = Buffer.concat([positions, normals]);
    const document = {
      asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.2, 0.4, 0.6, 1] } }],
      buffers: [{ byteLength: binary.length }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.length }, { buffer: 0, byteOffset: positions.length, byteLength: normals.length }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
        { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      ],
    };
    const encoded = Buffer.from(JSON.stringify(document));
    const padded = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 0x20)]);
    const header = Buffer.alloc(20);
    header.write('glTF'); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + binary.length, 8);
    header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
    await writeFile(source, Buffer.concat([header, padded, binHeader, binary]));
    const target = path.join(directory, 'prepared');
    await prepareLargeGlb(source, target, '12345678-1234-1234-1234-123456789abc', { binLimit: 36 });
    const derived = JSON.parse(await readFile(path.join(target, 'model.gltf'), 'utf8'));
    assert.equal(derived.buffers.length, 2);
    const resources = new Map(await Promise.all(derived.buffers.map(async ({ uri }) => [uri, await readFile(path.join(target, uri))])));
    const manager = new LoadingManager();
    manager.setURLModifier((url) => {
      const name = url.split('/').at(-1);
      return resources.has(name) ? `data:application/octet-stream;base64,${resources.get(name).toString('base64')}` : url;
    });
    const loader = new GLTFLoader(manager);
    const gltf = await loader.parseAsync(JSON.stringify(derived), 'https://example.invalid/');
    assert.equal(gltf.scenes.length, 1);
    let meshCount = 0;
    gltf.scene.traverse((object) => {
      if (object.isMesh) {
        meshCount++;
        assert.equal(object.geometry.attributes.position.count, 3);
        assert.equal(object.geometry.attributes.normal.count, 3);
        assert.equal(object.material.color.r, 0.2);
      }
    });
    assert.equal(meshCount, 1);
  } finally {
    if (path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir())
      && path.basename(directory).startsWith('imagina-prepared-')) await rm(directory, { recursive: true, force: true });
  }
});
