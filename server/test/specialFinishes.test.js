import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import { createSpecialFinishRouter } from '../src/specialFinishes/specialFinishRouter.js';
import { createPredefinedCatalog, predefinedCatalog } from '../src/specialFinishes/predefinedCatalog.js';
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
  const hydrate = (row) => row && { ...row, createdBy: { displayName: 'Test' },
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

async function serverTest(fx, callback, catalog) {
  const app = express();
  app.use(express.json());
  app.use('/special-finishes', createSpecialFinishRouter({ db: fx.db, tokenOptions, catalog }));
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

test('catálogo oficial usa identidad estable, preview autenticada y protege revisión y eliminación', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'imagina-predefined-'));
  const firstId = '22222222-2222-4222-8222-222222222221';
  const firstAsset = '33333333-3333-4333-8333-333333333331';
  const laterAsset = '33333333-3333-4333-8333-333333333332';
  const floorId = '22222222-2222-4222-8222-222222222222';
  const floorAsset = '33333333-3333-4333-8333-333333333333';
  try {
    await mkdir(path.join(folder, 'walls'));
    await mkdir(path.join(folder, 'floors'));
    for (const filename of ['walls/brick-v1.png', 'walls/brick-v2.png',
      'walls/brick-preview.png', 'floors/carpet.png', 'floors/carpet-preview.png']) {
      await writeFile(path.join(folder, filename), png);
    }
    const catalog = createPredefinedCatalog({ schemaVersion: 1, items: [
      { id: firstId, name: 'Ladrillo grande', category: 'WALL', subcategory: 'BRICK',
        origin: 'GENERATED_LOCALLY', license: 'Proyecto Imagina original',
        compatibleScopes: ['WALL', 'COLUMN'], suggestedTileWidth: 0.25,
        revisions: [
          { revision: 1, assetId: firstAsset, assetVersion: 1,
            image: 'walls/brick-v1.png', preview: 'walls/brick-preview.png' },
          { revision: 2, assetId: laterAsset, assetVersion: 2,
            image: 'walls/brick-v2.png', preview: 'walls/brick-preview.png' },
        ] },
      { id: floorId, name: 'Alfombra', category: 'FLOOR', subcategory: 'CARPET',
        origin: 'GENERATED_LOCALLY', license: 'Proyecto Imagina original',
        compatibleScopes: ['FLOOR'], suggestedTileWidth: 0.5,
        revisions: [{ revision: 1, assetId: floorAsset, assetVersion: 1,
          image: 'floors/carpet.png', preview: 'floors/carpet-preview.png' }] },
    ] }, folder);
    assert.equal(catalog.list('ladrillo').items[0].source, 'PREDEFINED');
    assert.equal(catalog.list('ladrillo').items[0].type, 'TEXTURE');
    assert.equal(catalog.list('ladrillo').items[0].revision, 2);
    assert.equal(catalog.list('ladrillo').items[0].asset.id, laterAsset);
    assert.equal(catalog.getAsset(firstAsset).version, 1);
    assert.equal(catalog.list('alfombra').items[0].category, 'FLOOR');
    const fx = fixture({ permissions: ['finishes.view', 'finishes.delete'] });
    await serverTest(fx, async (base, headers) => {
      const listed = await fetch(`${base}/predefined?search=ladrillo`, { headers });
      assert.equal(listed.status, 200);
      assert.equal((await listed.json()).items[0].id, firstId);
      assert.equal((await fetch(`${base}/textures/${firstAsset}`, { headers })).status, 200);
      const preview = await fetch(`${base}/textures/${laterAsset}?preview=1`, { headers });
      assert.equal(preview.headers.get('content-type'), 'image/png');
      assert.deepEqual(Buffer.from(await preview.arrayBuffer()), png);
      assert.equal((await fetch(`${base}/${firstId}`, { method: 'DELETE', headers })).status, 403);
      assert.equal((await fetch(`${base}/predefined`, { headers })).status, 200);
      assert.equal((await fetch(`${base}/textures/${laterAsset}`, { headers })).status, 200);
      assert.equal((await fetch(base, { method: 'POST', headers: { ...headers,
        'content-type': 'application/json' }, body: JSON.stringify({ name: 'Falso',
        type: 'TEXTURE', assetId: laterAsset }) })).status, 403);
    }, catalog);
    const creator = fixture({ permissions: ['finishes.view', 'finishes.create'] });
    await serverTest(creator, async (base, headers) => {
      assert.equal((await fetch(`${base}/predefined`, { headers })).status, 200);
      assert.equal((await fetch(base, { method: 'POST', headers: { ...headers,
        'content-type': 'application/json' }, body: JSON.stringify({ name: 'Falso',
        type: 'TEXTURE', assetId: laterAsset }) })).status, 422);
      assert.equal((await fetch(base, { method: 'POST', headers: { ...headers,
        'content-type': 'application/json' }, body: JSON.stringify({ name: 'RGB propio',
        type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }) })).status, 201);
    }, catalog);
    const denied = fixture({ permissions: [] });
    await serverTest(denied, async (base, headers) => {
      assert.equal((await fetch(`${base}/predefined`, { headers })).status, 403);
      assert.equal((await fetch(`${base}/textures/${laterAsset}`, { headers })).status, 403);
    }, catalog);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('biblioteca profesional conserva originales, separa personalizados y usa previews pequeñas', async () => {
  assert.equal(predefinedCatalog.list().total, 40);
  assert.equal(predefinedCatalog.list('ladrillo').total, 6);
  assert.ok(predefinedCatalog.list('piedra').total >= 5);
  assert.ok(predefinedCatalog.list('alfombra').total >= 3);
  assert.ok(predefinedCatalog.list('gris').items.every((item) => item.name.toLowerCase().includes('gris')));
  const wallItems = predefinedCatalog.list().items.filter((item) => item.category === 'WALL');
  const floorItems = predefinedCatalog.list().items.filter((item) => item.category === 'FLOOR');
  assert.equal(wallItems.length, 26);
  assert.equal(floorItems.length, 14);
  assert.ok(wallItems.every((item) => item.compatibleScopes.includes('COLUMN')));
  assert.ok(floorItems.every((item) => !item.compatibleScopes.includes('WALL')));
  assert.equal(new Set(predefinedCatalog.list().items.map((item) => item.id)).size, 40);
  for (const item of predefinedCatalog.list().items) {
    const asset = predefinedCatalog.getAsset(item.asset.id);
    assert.equal(item.source, 'PREDEFINED');
    assert.equal(item.type, 'TEXTURE');
    assert.equal(item.revision, 1);
    assert.equal(item.asset.version, 1);
    assert.ok(item.subcategory);
    assert.equal(item.origin, 'GENERATED_LOCALLY');
    assert.equal(item.license, 'Proyecto Imagina original');
    assert.ok(item.suggestedTileWidth >= 0.01 && item.suggestedTileWidth <= 10);
    assert.equal(asset.width, 512);
    assert.equal(asset.height, 512);
    assert.ok((await readFile(asset.previewFilename)).length < (await readFile(asset.filename)).length);
  }
  await serverTest(fixture({ permissions: ['finishes.view'] }), async (base, headers) => {
    assert.equal((await (await fetch(base, { headers })).json()).total, 0);
    assert.equal((await (await fetch(`${base}/predefined`, { headers })).json()).total, 40);
    const assetId = wallItems[0].asset.id;
    assert.equal((await fetch(`${base}/textures/${assetId}?preview=1`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/textures/${assetId}`, { headers })).status, 200);
  }, predefinedCatalog);
});

test('textura valida extensión, MIME, tamaño y firma', () => {
  const exact = Buffer.concat([png.subarray(0, -12),
    Buffer.alloc(MAX_TEXTURE_BYTES - png.length), png.subarray(-12)]);
  assert.equal(MAX_TEXTURE_BYTES, 5_242_880);
  assert.equal(validateTexture(exact, 'image/png', 'sample.png').byteSize, MAX_TEXTURE_BYTES);
  assert.equal(validateTexture(png, 'image/png', 'sample.png').byteSize, png.length);
  assert.equal(validateTexture(png, 'image/png', 'sample.png').width, 1);
  assert.throws(() => validateTexture(png, 'image/png', 'sample.svg'), { code: 'TEXTURE_EXTENSION_INVALID' });
  assert.throws(() => validateTexture(png, 'image/jpeg', 'sample.jpg'), { code: 'TEXTURE_INVALID' });
  assert.throws(() => validateTexture(png, 'image/jpeg', 'sample.png'), { code: 'TEXTURE_MIME_INVALID' });
  assert.throws(() => validateTexture(png.subarray(0, 24), 'image/png', 'sample.png'), { code: 'TEXTURE_INVALID' });
  assert.throws(() => validateTexture(Buffer.alloc(MAX_TEXTURE_BYTES + 1), 'image/png', 'sample.png'), { code: 'TEXTURE_TOO_LARGE' });
});

test('upload HTTP acepta 2,35 MiB y 5 MiB exactos; rechaza más de 5 MiB', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'imagina-limit-'));
  const old = process.env.SPECIAL_FINISH_STORAGE_DIR;
  process.env.SPECIAL_FINISH_STORAGE_DIR = folder;
  try {
    const fx = fixture({ permissions: ['finishes.create'] });
    await serverTest(fx, async (base, headers) => {
      for (const size of [2_464_154, MAX_TEXTURE_BYTES]) {
        const bytes = Buffer.concat([png.subarray(0, -12),
          Buffer.alloc(size - png.length), png.subarray(-12)]);
        const response = await fetch(`${base}/textures`, { method: 'POST', headers: {
          ...headers, 'content-type': 'image/png', 'x-file-name': 'sample.png',
        }, body: bytes });
        assert.equal(response.status, 201, String(size));
      }
      const tooLarge = await fetch(`${base}/textures`, { method: 'POST', headers: {
        ...headers, 'content-type': 'image/png', 'x-file-name': 'sample.png',
      }, body: Buffer.alloc(MAX_TEXTURE_BYTES + 2) });
      assert.equal(tooLarge.status, 413);
      assert.equal((await tooLarge.json()).error, 'TEXTURE_TOO_LARGE');
    });
  } finally {
    if (old === undefined) delete process.env.SPECIAL_FINISH_STORAGE_DIR; else process.env.SPECIAL_FINISH_STORAGE_DIR = old;
    await rm(folder, { recursive: true, force: true });
  }
});

test('ADMIN y DESIGNER crean y consultan acabado con autor, fecha y revisión sin datos privados', async () => {
  for (const role of ['ADMIN', 'DESIGNER']) {
    const fx = fixture({ role, permissions: ['finishes.view', 'finishes.create'] });
    await serverTest(fx, async (base, headers) => {
      const created = await fetch(base, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ name: role, type: 'RGB', rgb: { r: 1, g: 2, b: 3 } }) });
      assert.equal(created.status, 201);
      const listed = await (await fetch(base, { headers })).json();
      assert.equal(listed.items[0].createdBy.displayName, 'Test');
      assert.ok(listed.items[0].createdAt);
      assert.equal(listed.items[0].revision, 1);
      assert.equal(listed.items[0].createdById, undefined);
      assert.equal(listed.items[0].createdBy.id, undefined);
      assert.equal(listed.items[0].createdBy.passwordHash, undefined);
    });
  }
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
