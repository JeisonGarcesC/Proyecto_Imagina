import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import { createSpecialFinishRouter } from '../src/specialFinishes/specialFinishRouter.js';
import { createSpecialFinish, archiveSpecialFinish, listSpecialFinishes } from '../src/specialFinishes/specialFinishService.js';
import { MAX_TEXTURE_BYTES, validateTexture } from '../src/specialFinishes/textureStorage.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const userId = '11111111-1111-4111-8111-111111111111';
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082', 'hex');
const actor = { userId };

function fixture({ permissions = [], role = 'DESIGNER', auditFailure = false } = {}) {
  const finishes = new Map();
  const assets = new Map();
  const events = [];
  let serial = 1;
  const authUser = { id: userId, status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: role, enabled: true, permissions: permissions.map((key) => ({ permission: { key } })) } }],
    permissionOverrides: [] };
  const hydrate = (row) => row && { ...row, createdBy: { id: userId, displayName: 'Test' },
    asset: row.assetId ? assets.get(row.assetId) : null };
  const db = {
    user: { findUnique: async () => authUser },
    specialFinish: {
      count: async ({ where }) => [...finishes.values()].filter((row) => !row.deletedAt
        && (!where.name || row.name.toLowerCase().includes(where.name.contains.toLowerCase()))).length,
      findMany: async ({ where, skip, take }) => [...finishes.values()].filter((row) => !row.deletedAt
        && (!where.name || row.name.toLowerCase().includes(where.name.contains.toLowerCase())))
        .sort((a, b) => b.createdAt - a.createdAt).slice(skip, skip + take).map(hydrate),
      findUnique: async ({ where }) => hydrate(finishes.get(where.id)),
      create: async ({ data }) => {
        const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(serial++).padStart(12, '0')}`;
        const row = { id, ...data, revision: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
        finishes.set(id, row);
        return hydrate(row);
      },
      updateMany: async ({ where, data }) => {
        const row = finishes.get(where.id);
        if (!row || row.deletedAt) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    specialFinishAsset: {
      findUnique: async ({ where, include }) => {
        const row = assets.get(where.id);
        return include?.finish && row ? { ...row, finish: [...finishes.values()].find((f) => f.assetId === row.id) || null } : row;
      },
      create: async ({ data }) => {
        const row = { id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(serial++).padStart(12, '0')}`, ...data, version: 1, createdAt: new Date() };
        assets.set(row.id, row);
        return row;
      },
    },
    auditLog: { create: async ({ data }) => {
      if (auditFailure) throw new Error('audit unavailable');
      events.push(data);
      return data;
    } },
    $transaction: async (operation) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      const before = new Map([...finishes].map(([id, row]) => [id, { ...row }]));
      try { return await operation(db); } catch (error) {
        finishes.clear();
        for (const [id, row] of before) finishes.set(id, row);
        throw error;
      }
    },
  };
  return { db, finishes, assets, events, authUser };
}

async function serverTest(fx, callback) {
  const app = express();
  app.use(express.json());
  app.use('/special-finishes', createSpecialFinishRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/special-finishes`;
    const token = issueAccessToken(fx.authUser, { ...tokenOptions, expiresIn: '1m' });
    const headers = { authorization: `Bearer ${token}` };
    await callback(base, headers);
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('RGB válido, rango inválido, listado, búsqueda, detalle y auditoría', async () => {
  const fx = fixture();
  const finish = await createSpecialFinish(fx.db, { name: 'Nogal Especial', type: 'RGB', rgb: { r: 210, g: 158, b: 108 } }, actor);
  assert.deepEqual(finish.rgb, { r: 210, g: 158, b: 108 });
  assert.equal((await listSpecialFinishes(fx.db, { search: 'nogal' })).total, 1);
  assert.equal((await listSpecialFinishes(fx.db, { search: 'roble' })).total, 0);
  assert.equal(fx.events[0].action, 'SPECIAL_FINISH_CREATED');
  await assert.rejects(() => createSpecialFinish(fx.db, { name: 'Bad', type: 'RGB', rgb: { r: 256, g: 0, b: 0 } }, actor), { code: 'INVALID_RGB' });
  await serverTest(fixture({ permissions: ['finishes.view', 'finishes.create'] }), async (base, headers) => {
    const created = await fetch(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Azul', type: 'RGB', rgb: { r: 0, g: 0, b: 255 } }) });
    assert.equal(created.status, 201);
    const id = (await created.json()).id;
    assert.equal((await fetch(`${base}?search=azul`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/${id}`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/33333333-3333-4333-8333-333333333333`, { headers })).status, 404);
  });
});

test('textura valida extensión, MIME, tamaño y firma', () => {
  assert.equal(validateTexture(png, 'image/png', 'sample.png').width, 1);
  assert.throws(() => validateTexture(png, 'image/png', 'sample.svg'), { code: 'TEXTURE_EXTENSION_INVALID' });
  assert.throws(() => validateTexture(png, 'image/jpeg', 'sample.jpg'), { code: 'TEXTURE_INVALID' });
  assert.throws(() => validateTexture(png, 'image/jpeg', 'sample.png'), { code: 'TEXTURE_MIME_INVALID' });
  assert.throws(() => validateTexture(png.subarray(0, 24), 'image/png', 'sample.png'), { code: 'TEXTURE_INVALID' });
  assert.throws(() => validateTexture(Buffer.alloc(MAX_TEXTURE_BYTES + 1), 'image/png', 'sample.png'), { code: 'TEXTURE_TOO_LARGE' });
});

test('upload, creación TEXTURE y archivado conservan bytes sin auditarlos', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'imagina-finish-'));
  const old = process.env.SPECIAL_FINISH_STORAGE_DIR;
  process.env.SPECIAL_FINISH_STORAGE_DIR = folder;
  try {
    const fx = fixture({ permissions: ['finishes.view', 'finishes.create', 'finishes.delete'] });
    await serverTest(fx, async (base, headers) => {
      const upload = await fetch(`${base}/textures`, { method: 'POST', headers: { ...headers,
        'content-type': 'image/png', 'x-file-name': 'sample.png' }, body: png });
      assert.equal(upload.status, 201);
      const asset = await upload.json();
      const created = await fetch(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Textura', type: 'TEXTURE', assetId: asset.id }) });
      assert.equal(created.status, 201);
      const finish = await created.json();
      assert.equal(finish.asset.id, asset.id);
      assert.equal((await fetch(`${base}/${finish.id}`, { method: 'DELETE', headers })).status, 200);
      assert.equal((await fetch(`${base}/${finish.id}`, { method: 'DELETE', headers })).status, 409);
      assert.equal((await (await fetch(`${base}/textures/${asset.id}`, { headers })).arrayBuffer()).byteLength, png.length);
      assert.deepEqual(await readFile(path.join(folder, fx.assets.get(asset.id).storageKey)), png);
      assert.equal((await (await fetch(base, { headers })).json()).total, 0);
      assert.deepEqual(fx.events.map((event) => event.action), ['SPECIAL_FINISH_CREATED', 'SPECIAL_FINISH_DELETED']);
      assert.equal(JSON.stringify(fx.events).includes(png.toString('base64')), false);
      assert.equal(JSON.stringify(fx.events).includes('storageKey'), false);
    });
  } finally {
    if (old === undefined) delete process.env.SPECIAL_FINISH_STORAGE_DIR; else process.env.SPECIAL_FINISH_STORAGE_DIR = old;
    await rm(folder, { recursive: true, force: true });
  }
});

test('permisos HTTP distinguen create y delete; DESIGNER, ADMIN y SUPERADMIN pueden borrar con permiso', async () => {
  for (const role of ['DESIGNER', 'ADMIN', 'SUPERADMIN']) {
    const fx = fixture({ role, permissions: ['finishes.view', 'finishes.create', 'finishes.delete'] });
    const row = await createSpecialFinish(fx.db, { name: role, type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }, actor);
    await serverTest(fx, async (base, headers) => assert.equal((await fetch(`${base}/${row.id}`, { method: 'DELETE', headers })).status, 200));
  }
  const fx = fixture({ role: 'DESIGNER', permissions: ['finishes.view'] });
  await serverTest(fx, async (base, headers) => {
    assert.equal((await fetch(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'No', type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }) })).status, 403);
    assert.equal((await fetch(`${base}/33333333-3333-4333-8333-333333333333`, { method: 'DELETE', headers })).status, 403);
  });
  const absent = fixture({ role: 'DESIGNER', permissions: ['finishes.delete'] });
  await serverTest(absent, async (base, headers) => assert.equal((await fetch(`${base}/33333333-3333-4333-8333-333333333333`, { method: 'DELETE', headers })).status, 404));
});

test('auditoría fallida revierte creación y archivado', async () => {
  const fx = fixture({ auditFailure: true });
  await assert.rejects(() => createSpecialFinish(fx.db, { name: 'Azul', type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }, actor));
  assert.equal(fx.finishes.size, 0);
  const good = fixture();
  const row = await createSpecialFinish(good.db, { name: 'Azul', type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }, actor);
  good.db.auditLog.create = async () => { throw new Error('audit unavailable'); };
  await assert.rejects(() => archiveSpecialFinish(good.db, row.id, actor));
  assert.equal(good.finishes.get(row.id).deletedAt, null);
});
