import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { ModelAssetStore } from '../electron/modelAssetStore.js';
import { parseModelAssetRequestUrl } from '../electron/modelAssetRequest.js';
import { registerModelAssetIpcHandlers } from '../electron/modelAssetIpc.js';

const ref = '12345678-1234-1234-1234-123456789abc';

test('URL de carga se decide por metadatos autorizados del proceso principal', () => {
  const store = new ModelAssetStore(path.join(os.tmpdir(), 'unused-model-assets'));
  store.allowed.set(ref, { assetRef: ref });
  assert.equal(store.getLoadUrl(ref), `imagina-asset://model/${ref}.glb`);
  store.allowed.set(ref, { assetRef: ref, preparedRepresentation: { kind: 'split-gltf-v1' } });
  assert.equal(store.getLoadUrl(ref), `imagina-asset://model/${ref}/model.gltf`);
  assert.equal(store.isPrepared(ref), true);
  assert.throws(() => store.getLoadUrl('../outside'), /no autorizada/);
  assert.throws(() => store.getLoadUrl('99999999-9999-9999-9999-999999999999'), /no autorizada/);
});

test('registro IPC ofrece load-url mediante ModelAssetStore', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, callback) { assert.equal(handlers.has(channel), false); handlers.set(channel, callback); } };
  const store = new ModelAssetStore(path.join(os.tmpdir(), 'unused-model-assets'));
  registerModelAssetIpcHandlers(ipcMain, store);
  assert.equal(handlers.has('model-asset:load-url'), true);
  assert.equal(handlers.has('model-asset:discard-import'), true);
  store.allowed.set(ref, { assetRef: ref, preparedRepresentation: { kind: 'split-gltf-v1' } });
  assert.equal(await handlers.get('model-asset:load-url')({}, ref), `imagina-asset://model/${ref}/model.gltf`);
  assert.notEqual(await handlers.get('model-asset:load-url')({}, ref), `imagina-asset://model/${ref}.glb`);
  assert.throws(() => handlers.get('model-asset:load-url')({}, '../outside'), /no autorizada/);
  store.allowed.set(ref, { assetRef: ref });
  assert.equal(await handlers.get('model-asset:load-url')({}, ref), `imagina-asset://model/${ref}.glb`);
});

test('preload consulta Electron para la URL y no decide con metadata del renderer', async () => {
  const source = await readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8');
  let api;
  const calls = [];
  vm.runInNewContext(source, {
    require: () => ({
      contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
      ipcRenderer: { invoke: (...args) => { calls.push(args); return Promise.resolve(`imagina-asset://model/${ref}/model.gltf`); } },
      webUtils: { getPathForFile: () => '' },
    }),
  });
  assert.equal(await api.getModelAssetUrl(ref), `imagina-asset://model/${ref}/model.gltf`);
  assert.deepEqual(calls[0], ['model-asset:load-url', ref]);
  await api.discardImportedModelAsset(ref);
  assert.deepEqual(calls[1], ['model-asset:discard-import', ref]);
  assert.throws(() => api.getModelAssetUrl('../escape'), /inválida/);
  assert.throws(() => api.discardImportedModelAsset('../escape'), /inválida/);
});

test('cancelación retira solo el asset importado del staging', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imagina-cancel-asset-'));
  try {
    const directory = path.join(root, ref);
    await mkdir(directory);
    await writeFile(path.join(directory, 'model.gltf'), '{}');
    await writeFile(path.join(root, `${ref}.glb`), 'glb');
    const store = new ModelAssetStore(root);
    store.allowed.set(ref, { assetRef: ref });
    const handlers = new Map();
    registerModelAssetIpcHandlers({ handle(channel, callback) { handlers.set(channel, callback); } }, store);
    assert.equal(await handlers.get('model-asset:discard-import')({}, ref), true);
    assert.equal(await stat(directory).then(() => true, () => false), false);
    assert.equal(await stat(path.join(root, `${ref}.glb`)).then(() => true, () => false), false);
    assert.equal(store.allowed.has(ref), false);
    await assert.rejects(handlers.get('model-asset:discard-import')({}, '../escape'), /no autorizada/);
    store.allowed.set(ref, { ref });
    await assert.rejects(handlers.get('model-asset:discard-import')({}, ref), /no autorizada/);
  } finally {
    if (path.dirname(path.resolve(root)) === path.resolve(os.tmpdir())
      && path.basename(root).startsWith('imagina-cancel-asset-')) await rm(root, { recursive: true, force: true });
  }
});

test('preload identifica proceso principal antiguo sin handler IPC', async () => {
  const source = await readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8');
  let api;
  vm.runInNewContext(source, {
    require: () => ({
      contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
      ipcRenderer: { invoke: () => Promise.reject(new Error("No handler registered for 'model-asset:load-url'")) },
      webUtils: { getPathForFile: () => '' },
    }),
  });
  await assert.rejects(api.getModelAssetUrl(ref), /Cierra Electron por completo/);
});

test('protocolo admite model.gltf y diez buffers; rechaza rutas ajenas', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'imagina-asset-protocol-'));
  try {
    const directory = path.join(root, ref);
    await mkdir(directory);
    const files = [{ name: 'model.gltf' }, ...Array.from({ length: 10 }, (_, index) => ({ name: `buffer-${String(index + 1).padStart(3, '0')}.bin` }))];
    for (const { name } of files) await writeFile(path.join(directory, name), name);
    const store = new ModelAssetStore(root);
    store.allowed.set(ref, { assetRef: ref, preparedRepresentation: { kind: 'split-gltf-v1', files } });
    for (const { name } of files) {
      const relativeUrl = new URL(name, `imagina-asset://model/${ref}/model.gltf`).href;
      const parsed = parseModelAssetRequestUrl(relativeUrl);
      assert.deepEqual(parsed, { assetRef: ref, fileName: name, prepared: true });
      assert.equal(path.basename(await store.resolvePreparedPath(parsed.assetRef, parsed.fileName)), name);
    }
    assert.deepEqual(parseModelAssetRequestUrl(`imagina-asset://model/${ref}.glb`), { assetRef: ref, fileName: null, prepared: false });
    for (const invalid of [
      `imagina-asset://model/${ref}/../secret.bin`,
      `imagina-asset://model/${ref}/buffer-011.bin?x=1`,
      `imagina-asset://model/${ref}/original.glb`,
      `imagina-asset://model/${ref}/buffer-xyz.bin`,
      'imagina-asset://other/12345678-1234-1234-1234-123456789abc/model.gltf',
    ]) assert.equal(parseModelAssetRequestUrl(invalid), null);
    await assert.rejects(store.resolvePreparedPath(ref, 'original.glb'), /no autorizado/);
    await assert.rejects(store.resolvePreparedPath(ref, 'buffer-011.bin'), /no declarado/);
  } finally {
    if (path.dirname(path.resolve(root)) === path.resolve(os.tmpdir())
      && path.basename(root).startsWith('imagina-asset-protocol-')) await rm(root, { recursive: true, force: true });
  }
});
