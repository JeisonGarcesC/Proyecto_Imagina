import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { createUser, normalizeAdminError, resetPassword, setUserRoles, setUserStatus } from '../src/admin/adminService.js';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };
const role = (key, permissionKeys = []) => ({ key, enabled: true, permissions: permissionKeys.map((permission) => ({ permission: { key: permission } })) });

function dbFixture({ permissions = [], roles = ['SUPERADMIN'], users = [] } = {}) {
  const stored = new Map(users.map((user) => [user.id, { ...user }]));
  const events = [];
  const revoked = [];
  const roleRows = ['SUPERADMIN', 'ADMIN', 'DESIGNER'].map((key) => ({ id: `${key}-id`, key, enabled: true }));
  const authUser = {
    id, username: 'root', status: 'ACTIVE', tokenVersion: 1,
    roles: roles.map((key) => ({ role: role(key, permissions) })), permissionOverrides: [],
  };
  const db = {
    user: {
      findUnique: async ({ where }) => where.id === id && !stored.has(id) ? authUser : stored.get(where.id) || null,
      findFirst: async ({ where }) => [...stored.values()].find((user) =>
        (!where.id?.not || user.id !== where.id.not) &&
        Object.entries(where).some(([key, value]) => ['username', 'email'].includes(key)
          && user[key]?.toLowerCase() === value.equals)) || null,
      create: async ({ data }) => {
        const user = { id: otherId, username: data.username, email: data.email, displayName: data.displayName,
          passwordHash: data.passwordHash, status: 'ACTIVE', tokenVersion: 1,
          roles: [{ role: roleRows.find((item) => item.id === data.roles.create.roleId) }] };
        stored.set(user.id, user);
        return user;
      },
      update: async ({ where, data }) => {
        const user = stored.get(where.id);
        if (!user) throw Object.assign(new Error('Missing'), { code: 'P2025' });
        for (const [key, value] of Object.entries(data)) {
          user[key] = value?.increment ? (user[key] || 0) + value.increment : value;
        }
        return { ...user };
      },
      count: async () => stored.size,
      findMany: async () => [...stored.values()],
    },
    role: {
      findMany: async ({ where }) => roleRows.filter((item) => where.key.in.includes(item.key)),
    },
    userRole: {
      count: async () => [...stored.values()].filter((user) => user.status === 'ACTIVE' && user.roles.some(({ role: r }) => r.key === 'SUPERADMIN')).length,
      deleteMany: async ({ where }) => { stored.get(where.userId).roles = []; },
      createMany: async ({ data }) => { stored.get(data[0].userId).roles = data.map((row) => ({ role: roleRows.find((item) => item.id === row.roleId) })); },
    },
    refreshSession: { updateMany: async ({ where }) => { revoked.push(where.userId); return { count: 1 }; } },
    auditLog: { create: async ({ data }) => { events.push(data); return data; } },
    $transaction: async (work) => typeof work === 'function' ? work(db) : Promise.all(work),
  };
  return { db, stored, events, revoked, authUser };
}

const actor = { userId: id, roles: ['SUPERADMIN'] };
const user = (overrides = {}) => ({
  id: otherId, username: 'designer', email: 'designer@example.com', displayName: 'Designer',
  passwordHash: 'hidden', status: 'ACTIVE', tokenVersion: 1,
  roles: [{ role: { id: 'DESIGNER-id', key: 'DESIGNER', name: 'Designer', enabled: true } }], ...overrides,
});

async function withServer(fixture, callback) {
  const app = express();
  app.use(express.json());
  app.use('/admin', createAdminRouter({ db: fixture.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = issueAccessToken(fixture.authUser, { ...tokenOptions, expiresIn: '1m' });
    await callback(base, token);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('rutas administrativas exigen autenticación y permiso', async () => {
  const fixture = dbFixture();
  await withServer(fixture, async (base, token) => {
    assert.equal((await fetch(`${base}/admin/users`)).status, 401);
    assert.equal((await fetch(`${base}/admin/users`, { headers: { authorization: `Bearer ${token}` } })).status, 403);
  });
  const allowed = dbFixture({ permissions: ['admin.users.read'] });
  await withServer(allowed, async (base, token) => {
    const response = await fetch(`${base}/admin/users`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items, []);
  });
});

test('crear usuario usa hash, rol existente y auditoría sin secretos', async () => {
  const fixture = dbFixture();
  const result = await createUser(fixture.db, {
    username: 'New.User', email: 'NEW@example.com', displayName: 'New User',
    password: 'a-secure-password', roleKey: 'DESIGNER',
  }, actor, {});
  assert.equal(result.username, 'new.user');
  assert.deepEqual(result.roles.map((item) => item.key), ['DESIGNER']);
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  assert.equal(JSON.stringify(fixture.events).includes('a-secure-password'), false);
  assert.equal(JSON.stringify(fixture.events).includes('passwordHash'), false);
  assert.equal(fixture.events[0].action, 'ADMIN_USER_CREATED');
  await assert.rejects(() => createUser(fixture.db, {
    username: 'new.user', email: 'different@example.com', displayName: 'Duplicate',
    password: 'a-secure-password', roleKey: 'DESIGNER',
  }, actor, {}), { code: 'USERNAME_EXISTS' });
  await assert.rejects(() => createUser(fixture.db, {
    username: 'different', email: 'NEW@example.com', displayName: 'Duplicate',
    password: 'a-secure-password', roleKey: 'DESIGNER',
  }, actor, {}), { code: 'EMAIL_EXISTS' });
});

test('reset incrementa tokenVersion, revoca sesiones y audita sin hash', async () => {
  const fixture = dbFixture({ users: [user()] });
  await resetPassword(fixture.db, otherId, { password: 'a-new-secure-password' }, actor, {});
  assert.equal(fixture.stored.get(otherId).tokenVersion, 2);
  assert.deepEqual(fixture.revoked, [otherId]);
  assert.equal(fixture.events[0].action, 'ADMIN_USER_PASSWORD_RESET');
  assert.equal(JSON.stringify(fixture.events).includes('password'), false);
  assert.equal(JSON.stringify(fixture.events).includes('hash'), false);
});

test('el último SUPERADMIN activo no puede desactivarse ni perder su rol', async () => {
  const fixture = dbFixture({ users: [user({ roles: [{ role: { id: 'SUPERADMIN-id', key: 'SUPERADMIN', enabled: true } }] })] });
  await assert.rejects(() => setUserStatus(fixture.db, otherId, { status: 'DISABLED' }, actor, {}), { code: 'LAST_SUPERADMIN_REQUIRED' });
  await assert.rejects(() => setUserRoles(fixture.db, otherId, { roleKeys: ['DESIGNER'] }, actor, {}), { code: 'LAST_SUPERADMIN_REQUIRED' });
  assert.equal(fixture.stored.get(otherId).status, 'ACTIVE');
});

test('desactivar un usuario revoca sus sesiones y un usuario inexistente devuelve 404', async () => {
  const fixture = dbFixture({ users: [user()] });
  const result = await setUserStatus(fixture.db, otherId, { status: 'DISABLED' }, actor, {});
  assert.equal(result.status, 'DISABLED');
  assert.equal(fixture.stored.get(otherId).tokenVersion, 2);
  assert.deepEqual(fixture.revoked, [otherId]);
  assert.equal(fixture.events[0].action, 'ADMIN_USER_STATUS_CHANGED');
  await assert.rejects(() => resetPassword(fixture.db, '33333333-3333-4333-8333-333333333333',
    { password: 'a-new-secure-password' }, actor, {}), { code: 'USER_NOT_FOUND' });
});

test('asignación de rol actualiza el usuario y registra auditoría', async () => {
  const fixture = dbFixture({ users: [user()] });
  const result = await setUserRoles(fixture.db, otherId, { roleKeys: ['ADMIN'] }, actor, {});
  assert.deepEqual(result.roles.map((item) => item.key), ['ADMIN']);
  assert.equal(fixture.events[0].action, 'ADMIN_USER_ROLES_CHANGED');
  await assert.rejects(() => setUserRoles(fixture.db, otherId, { roleKeys: ['SUPERADMIN'] },
    { userId: id, roles: ['ADMIN'] }, {}), { code: 'PRIVILEGED_ROLE_DENIED' });
});

test('errores de Prisma se convierten a códigos públicos sin detalles internos', () => {
  const error = normalizeAdminError({ code: 'P2002', meta: { target: ['email'] } });
  assert.equal(error.status, 409);
  assert.equal(error.code, 'EMAIL_EXISTS');
  assert.equal(normalizeAdminError(new Error('SQL secret')).message, 'Error interno del servidor.');
});
