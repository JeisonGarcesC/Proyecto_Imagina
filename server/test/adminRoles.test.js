import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { getRole } from '../src/admin/adminService.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const roleId = '11111111-1111-4111-8111-111111111111';
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };

function fixture(canRead) {
  const user = {
    id: 'user-1', username: 'reader', status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: 'READER', enabled: true, permissions: canRead
      ? [{ permission: { key: 'admin.roles.read' } }] : [] } }], permissionOverrides: [],
  };
  const role = {
    id: roleId, key: 'DESIGNER', name: 'Diseño', description: 'Diseño y edición.',
    system: true, enabled: true, permissions: [{ permission: { key: 'editor.view.3d' } }],
  };
  const db = {
    user: { findUnique: async () => user },
    role: { findMany: async () => [role], findUnique: async ({ where }) => where.id === roleId ? role : null },
    permission: { findMany: async () => [{ key: 'editor.view.3d', description: 'editor: view.3d', module: 'editor' }] },
  };
  return { db, user };
}

async function requestWith(fx, path) {
  const app = express();
  app.use('/admin', createAdminRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = issueAccessToken(fx.user, { ...tokenOptions, expiresIn: '1m' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers: { authorization: `Bearer ${token}` } });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('sin admin.roles.read no se consulta el detalle', async () => {
  assert.equal((await requestWith(fixture(false), `/admin/roles/${roleId}`)).status, 403);
});

test('detalle autorizado devuelve rol y claves asignadas sin datos de usuario', async () => {
  const response = await requestWith(fixture(true), `/admin/roles/${roleId}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.permissionKeys, ['editor.view.3d']);
  assert.equal(response.body.key, 'DESIGNER');
  assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
});

test('rol inexistente se rechaza', async () => {
  await assert.rejects(() => getRole(fixture(true).db, '22222222-2222-4222-8222-222222222222'), { code: 'ROLE_NOT_FOUND' });
});
