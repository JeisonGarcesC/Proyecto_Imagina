import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ModelAssetStore } from '../electron/modelAssetStore.js';

function glb() {
  const bytes = Buffer.alloc(20);
  bytes.write('glTF');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(0, 12);
  bytes.write('JSON', 16);
  return bytes;
}

test('asset GLB: copia binaria, manifiesto portable, ausencia y corrupción', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imagina-assets-'));
  try {
    const source = path.join(root, 'origen.glb');
    const manifest = path.join(root, 'proyecto', 'proyecto.json');
    await writeFile(source, glb());
    const store = new ModelAssetStore(path.join(root, 'staging'));
    const asset = await store.importGlb(source, 'origen.glb');
    const project = { version: 2, entities: [{ kind: 'IMPORTED_MODEL', metadata: asset }] };
    await store.saveComplete(project, manifest);
    assert.deepEqual(JSON.parse(await readFile(manifest, 'utf8')), project);
    const reopened = new ModelAssetStore(path.join(root, 'other-staging'));
    assert.deepEqual(await reopened.openComplete(manifest), project);
    const modelPath = path.join(root, 'proyecto', 'assets', 'modelos', `${asset.assetRef}.glb`);
    await writeFile(modelPath, Buffer.from(glb().map((byte, index) => index === 19 ? 0 : byte)));
    await assert.rejects(reopened.openComplete(manifest), /corrupto/);
    await unlink(modelPath);
    await assert.rejects(reopened.openComplete(manifest));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('asset GLB: rechaza referencias ajenas e identificadores de ruta', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imagina-assets-'));
  try {
    const store = new ModelAssetStore(path.join(root, 'staging'));
    await assert.rejects(store.resolvePath('../secreto'));
    await assert.rejects(store.resolvePath(randomUUID()));
    const source = path.join(root, 'origen.glb');
    await writeFile(source, glb());
    const asset = await store.importGlb(source, 'origen.glb');
    store.clearProject();
    await assert.rejects(store.resolvePath(asset.assetRef));
  } finally { await rm(root, { recursive: true, force: true }); }
});
