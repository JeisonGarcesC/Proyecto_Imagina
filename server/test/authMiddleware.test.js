import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAuthenticateAccessToken } from '../src/middleware/authenticateAccessToken.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };

async function withServer(user, callback) {
  const db = { user: { findUnique: async () => user } };
  const app = express();
  const authenticate = createAuthenticateAccessToken({ db, tokenOptions });
  app.get('/me', authenticate, (req, res) => res.json({ userId: req.auth.userId, permissions: req.auth.permissions }));
  app.get('/allowed', authenticate, requirePermission('bom.view'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}

function authUser(overrides = {}) {
  return {
    id: 'u1', username: 'user', status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: 'VIEWER', enabled: true, permissions: [{ permission: { key: 'bom.view' } }] } }],
    permissionOverrides: [], ...overrides,
  };
}

test('endpoint protegido devuelve 401 sin token', async () => {
  await withServer(authUser(), async (base) => assert.equal((await fetch(`${base}/me`)).status, 401));
});

test('access token y tokenVersion válidos autentican', async () => {
  const user = authUser();
  const token = issueAccessToken(user, { ...tokenOptions, expiresIn: '1m' });
  await withServer(user, async (base) => {
    const response = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).permissions, ['bom.view']);
  });
});

test('tokenVersion incorrecto devuelve 401', async () => {
  const token = issueAccessToken(authUser(), { ...tokenOptions, expiresIn: '1m' });
  await withServer(authUser({ tokenVersion: 2 }), async (base) => {
    assert.equal((await fetch(`${base}/me`, { headers: { authorization: `Bearer ${token}` } })).status, 401);
  });
});

test('permiso faltante devuelve 403 y permiso válido 200', async () => {
  const allowed = authUser();
  const token = issueAccessToken(allowed, { ...tokenOptions, expiresIn: '1m' });
  await withServer(allowed, async (base) => {
    assert.equal((await fetch(`${base}/allowed`, { headers: { authorization: `Bearer ${token}` } })).status, 200);
  });
  await withServer(authUser({ roles: [] }), async (base) => {
    assert.equal((await fetch(`${base}/allowed`, { headers: { authorization: `Bearer ${token}` } })).status, 403);
  });
});
