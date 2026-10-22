import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { getUserPermissions, setUserPermissionOverrides } from '../src/admin/adminUserPermissionsService.js';
import { getAuthorizationSnapshot } from '../src/auth/effectivePermissionsService.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createAuthenticateAccessToken } from '../src/middleware/authenticateAccessToken.js';
import { requirePermission } from '../src/middleware/requirePermission.js';

const ids = {
  actor: '11111111-1111-4111-8111-111111111111',
  target: '22222222-2222-4222-8222-222222222222',
  read: '33333333-3333-4333-8333-333333333333',
  write: '44444444-4444-4444-8444-444444444444',
  missing: '55555555-5555-4555-8555-555555555555',
};
const permissions = [
  { id: ids.read, key: 'admin.users.read', description: 'Leer usuarios', module: 'admin' },
  { id: ids.write, key: 'admin.permissions.write', description: 'Editar excepciones', module: 'admin' },
];
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };

function fixture({ actorRole = 'SUPERADMIN', actorCanWrite = true, targetRoles = ['DESIGNER'], failAt = null } = {}) {
  let targetRoleKeys = targetRoles;
  let roleGrants = { SUPERADMIN: permissions.map(({ id }) => id), ADMIN: [ids.read], DESIGNER: [], VIEWER: [] };
  const actorPermissions = [ids.read, ...(actorCanWrite ? [ids.write] : [])];
  const user = (id, state) => {
    const keys = id === ids.actor ? [actorRole] : targetRoleKeys;
    const grants = id === ids.actor ? actorPermissions : null;
    return { id, username: id === ids.actor ? 'actor' : 'designer', displayName: 'Usuario',
      status: 'ACTIVE', tokenVersion: 1, permissionVersion: state.version,
      roles: keys.map((key) => ({ role: { key, enabled: true, permissions: (grants || roleGrants[key] || [])
        .map((permissionId) => ({ permission: permissions.find((item) => item.id === permissionId) })) } })),
      permissionOverrides: id === ids.target ? state.overrides.map(({ permissionId, effect }) => ({
        effect, permission: permissions.find(({ id: permissionKey }) => permissionKey === permissionId),
      })) : [],
    };
  };
  const makeClient = (state) => ({
    user: {
      findUnique: async ({ where }) => [ids.actor, ids.target].includes(where.id) ? user(where.id, state) : null,
      update: async () => { state.version += 1; },
    },
    permission: { findMany: async ({ where } = {}) => permissions.filter(({ id }) => !where || where.id.in.includes(id)) },
    userPermissionOverride: {
      deleteMany: async () => { state.overrides = []; if (failAt === 'delete') throw new Error('write failed'); },
      createMany: async ({ data }) => { state.overrides = data.map(({ permissionId, effect }) => ({ permissionId, effect })); if (failAt === 'create') throw new Error('write failed'); },
    },
    auditLog: { create: async ({ data }) => { state.events.push(data); if (failAt === 'audit') throw new Error('audit failed'); return data; } },
  });
  const state = { overrides: [], version: 1, events: [] };
  const db = {
    ...makeClient(state),
    $transaction: async (callback, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      const next = { overrides: [...state.overrides], version: state.version, events: [...state.events] };
      const result = await callback(makeClient(next));
      state.overrides = next.overrides;
      state.version = next.version;
      state.events = next.events;
      return result;
    },
  };
  return {
    db, actor: user(ids.actor, state),
    get overrides() { return state.overrides; },
    get version() { return state.version; },
    get events() { return state.events; },
    setRoles(keys) { targetRoleKeys = keys; },
    setRoleGrants(key, grantIds) { roleGrants = { ...roleGrants, [key]: grantIds }; },
    setOverrides(items) { state.overrides = items; },
  };
}

async function put(fx, userId = ids.target, overrides = [{ permissionId: ids.read, effect: 'ALLOW' }]) {
  const app = express();
  app.use(express.json());
  app.use('/admin', createAdminRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = issueAccessToken(fx.actor, { ...tokenOptions, expiresIn: '1m' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/admin/users/${userId}/permissions`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides }),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const actor = { userId: ids.actor, roles: ['SUPERADMIN'], permissions: ['admin.permissions.write'] };
const item = (data, key) => data.permissions.find((permission) => permission.key === key);

test('SUPERADMIN con admin.permissions.write concede ALLOW a DESIGNER y actualiza permissionVersion', async () => {
  const fx = fixture();
  const response = await put(fx);
  assert.equal(response.status, 200);
  assert.equal(item(response.body, 'admin.users.read').roleGranted, false);
  assert.equal(item(response.body, 'admin.users.read').override, 'ALLOW');
  assert.equal(item(response.body, 'admin.users.read').effective, true);
  assert.equal(fx.version, 2);
});

test('ADMIN con admin.permissions.write y SUPERADMIN sin ese permiso reciben 403', async () => {
  assert.equal((await put(fixture({ actorRole: 'ADMIN' }))).status, 403);
  assert.equal((await put(fixture({ actorCanWrite: false }))).status, 403);
});

test('DENY prevalece sobre un permiso concedido por el rol', async () => {
  const fx = fixture({ targetRoles: ['ADMIN'] });
  const response = await put(fx, ids.target, [{ permissionId: ids.read, effect: 'DENY' }]);
  assert.equal(response.status, 200);
  assert.equal(item(response.body, 'admin.users.read').roleGranted, true);
  assert.equal(item(response.body, 'admin.users.read').effective, false);
});

test('quitar override vuelve al rol y cambio de rol o RolePermission recalcula el resultado', async () => {
  const fx = fixture();
  await put(fx);
  fx.setRoles(['VIEWER']);
  assert.equal(item(await getUserPermissions(fx.db, ids.target), 'admin.users.read').effective, true);
  fx.setRoleGrants('VIEWER', [ids.read]);
  assert.equal(item(await getUserPermissions(fx.db, ids.target), 'admin.users.read').effective, true);
  const cleared = await put(fx, ids.target, []);
  assert.equal(item(cleared.body, 'admin.users.read').override, null);
  assert.equal(item(cleared.body, 'admin.users.read').effective, true);
  fx.setRoleGrants('VIEWER', []);
  assert.equal(item(await getUserPermissions(fx.db, ids.target), 'admin.users.read').effective, false);
});

test('el mismo access token usa permisos nuevos en la siguiente petición', async () => {
  const fx = fixture();
  const target = await fx.db.user.findUnique({ where: { id: ids.target } });
  const token = issueAccessToken(target, { ...tokenOptions, expiresIn: '1m' });
  const app = express();
  app.get('/protected', createAuthenticateAccessToken({ db: fx.db, tokenOptions }),
    requirePermission('admin.users.read'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const check = async () => (await fetch(`http://127.0.0.1:${server.address().port}/protected`,
    { headers: { authorization: `Bearer ${token}` } })).status;
  try {
    assert.equal(await check(), 403);
    await setUserPermissionOverrides(fx.db, ids.target,
      { overrides: [{ permissionId: ids.read, effect: 'ALLOW' }] }, actor);
    assert.equal(await check(), 200);
    await setUserPermissionOverrides(fx.db, ids.target, { overrides: [] }, actor);
    assert.equal(await check(), 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('SUPERADMIN objetivo protegido y sus overrides antiguos no anulan permisos de rol', async () => {
  const fx = fixture({ targetRoles: ['SUPERADMIN'] });
  fx.setOverrides([{ permissionId: ids.read, effect: 'DENY' }]);
  assert.equal((await put(fx)).status, 403);
  const data = await getUserPermissions(fx.db, ids.target);
  assert.equal(data.user.superadmin, true);
  assert.equal(item(data, 'admin.users.read').effective, true);
  assert.equal(getAuthorizationSnapshot(await fx.db.user.findUnique({ where: { id: ids.target } })).permissions.includes('admin.users.read'), true);
});

test('rol, permiso y efecto falsos no permiten escalar privilegios', async () => {
  const fx = fixture();
  assert.equal((await put(fx, ids.target, [{ permissionId: ids.read, effect: 'SUPERADMIN' }])).status, 422);
  assert.equal((await put(fx, ids.target, [{ permissionId: ids.missing, effect: 'ALLOW' }])).status, 404);
  assert.equal((await put(fx, ids.missing)).status, 404);
  assert.deepEqual(fx.overrides, []);
});

test('falla intermedia revierte overrides, versión y auditoría', async () => {
  for (const failAt of ['delete', 'create', 'audit']) {
    const fx = fixture({ failAt });
    fx.setOverrides([{ permissionId: ids.read, effect: 'DENY' }]);
    await assert.rejects(() => setUserPermissionOverrides(fx.db, ids.target,
      { overrides: [{ permissionId: ids.write, effect: 'ALLOW' }] }, actor),
    { message: failAt === 'audit' ? 'audit failed' : 'write failed' });
    assert.deepEqual(fx.overrides, [{ permissionId: ids.read, effect: 'DENY' }]);
    assert.equal(fx.version, 1);
    assert.equal(fx.events.length, 0);
  }
});

test('auditoría guarda actor, usuario y cambios sin secretos', async () => {
  const fx = fixture();
  const response = await put(fx);
  assert.equal(response.status, 200);
  assert.equal(fx.events.length, 1);
  const event = fx.events[0];
  assert.equal(event.actorUserId, ids.actor);
  assert.equal(event.targetId, ids.target);
  assert.equal(event.action, 'ADMIN_USER_PERMISSIONS_UPDATED');
  assert.deepEqual(event.before.overrides, []);
  assert.deepEqual(event.after.overrides, [{ permissionKey: 'admin.users.read', effect: 'ALLOW' }]);
  assert.equal(/password|hash|token|secret/i.test(JSON.stringify(event)), false);
});
