import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { setRolePermissions } from '../src/admin/adminService.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const ids = {
  SUPERADMIN: '11111111-1111-4111-8111-111111111111',
  ADMIN: '22222222-2222-4222-8222-222222222222',
  DESIGNER: '33333333-3333-4333-8333-333333333333',
  read: '44444444-4444-4444-8444-444444444444',
  write: '55555555-5555-4555-8555-555555555555',
  missing: '66666666-6666-4666-8666-666666666666',
  user: '77777777-7777-4777-8777-777777777777',
};
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };
const permissions = [
  { id: ids.read, key: 'admin.roles.read' },
  { id: ids.write, key: 'admin.roles.write' },
];

function fixture({ actorRole = 'SUPERADMIN', canWrite = true, failAt = null } = {}) {
  let assigned = new Map(Object.values(['SUPERADMIN', 'ADMIN', 'DESIGNER']).map((key) => [ids[key], [ids.read]]));
  let events = [];
  let version = 1;
  const user = {
    id: ids.user, username: 'actor', status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: actorRole, enabled: true, permissions: [
      { permission: { key: 'admin.roles.read' } },
      ...(canWrite ? [{ permission: { key: 'admin.roles.write' } }] : []),
    ] } }], permissionOverrides: [],
  };
  const makeClient = (state, audit) => ({
    role: {
      findUnique: async ({ where }) => {
        const key = Object.keys(ids).find((item) => ['SUPERADMIN', 'ADMIN', 'DESIGNER'].includes(item) && ids[item] === where.id);
        return key ? { id: ids[key], key, name: key, description: null, system: true, enabled: true,
          permissions: state.get(where.id).map((id) => ({ permission: permissions.find((item) => item.id === id) })) } : null;
      },
    },
    permission: { findMany: async ({ where }) => permissions.filter(({ id }) => where.id.in.includes(id)) },
    rolePermission: {
      deleteMany: async ({ where }) => { state.set(where.roleId, []); if (failAt === 'delete') throw new Error('write failed'); },
      createMany: async ({ data }) => { state.set(data[0].roleId, data.map(({ permissionId }) => permissionId)); if (failAt === 'create') throw new Error('write failed'); },
    },
    user: { updateMany: async () => { version += 1; } },
    auditLog: { create: async ({ data }) => { audit.push(data); if (failAt === 'audit') throw new Error('audit failed'); return data; } },
  });
  const db = {
    ...makeClient(assigned, events),
    user: { ...makeClient(assigned, events).user, findUnique: async () => user },
    $transaction: async (callback, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      const next = new Map([...assigned].map(([key, value]) => [key, [...value]]));
      const nextEvents = [...events];
      const priorVersion = version;
      try {
        const result = await callback(makeClient(next, nextEvents));
        assigned = next;
        events = nextEvents;
        return result;
      } catch (error) {
        version = priorVersion;
        throw error;
      }
    },
  };
  return { db, user, get assigned() { return assigned; }, get events() { return events; }, get version() { return version; } };
}

async function put(fx, roleId, permissionIds = [ids.write]) {
  const app = express();
  app.use(express.json());
  app.use('/admin', createAdminRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = issueAccessToken(fx.user, { ...tokenOptions, expiresIn: '1m' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/admin/roles/${roleId}/permissions`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds }),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('SUPERADMIN con permiso de escritura modifica DESIGNER y ADMIN', async () => {
  assert.match(ids.write, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  for (const key of ['DESIGNER', 'ADMIN']) {
    const fx = fixture();
    const response = await put(fx, ids[key]);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.permissionKeys, ['admin.roles.write']);
    assert.deepEqual(fx.assigned.get(ids[key]), [ids.write]);
    assert.equal(fx.version, 2);
  }
});

test('SUPERADMIN no puede cambiar los permisos de SUPERADMIN', async () => {
  const fx = fixture();
  assert.equal((await put(fx, ids.SUPERADMIN)).status, 403);
  assert.equal((await put(fx, ids.SUPERADMIN, ['invalid'])).status, 403);
  assert.deepEqual(fx.assigned.get(ids.SUPERADMIN), [ids.read]);
  assert.equal(fx.events.length, 0);
});

test('ADMIN y DESIGNER con admin.roles.write no pueden cambiar RolePermission', async () => {
  for (const actorRole of ['ADMIN', 'DESIGNER']) {
    const fx = fixture({ actorRole });
    assert.equal((await put(fx, ids.DESIGNER)).status, 403);
    assert.deepEqual(fx.assigned.get(ids.DESIGNER), [ids.read]);
  }
});

test('sin admin.roles.write se devuelve 403 incluso al SUPERADMIN', async () => {
  const fx = fixture({ canWrite: false });
  assert.equal((await put(fx, ids.DESIGNER)).status, 403);
  await assert.rejects(() => setRolePermissions(fx.db, ids.DESIGNER, { permissionIds: [] },
    { userId: ids.user, roles: ['SUPERADMIN'], permissions: [] }, {}), { status: 403 });
});

test('rol y permiso inexistentes se rechazan sin escritura', async () => {
  const fx = fixture();
  assert.equal((await put(fx, ids.missing)).status, 404);
  assert.equal((await put(fx, ids.DESIGNER, [ids.missing])).status, 404);
  assert.deepEqual(fx.assigned.get(ids.DESIGNER), [ids.read]);
  assert.equal(fx.events.length, 0);
});

test('identificadores duplicados o mal formados se rechazan', async () => {
  const fx = fixture();
  assert.equal((await put(fx, ids.DESIGNER, [ids.read, ids.read])).status, 422);
  assert.equal((await put(fx, ids.DESIGNER, ['unknown'])).status, 422);
  assert.deepEqual(fx.assigned.get(ids.DESIGNER), [ids.read]);
});

test('falla después de borrar o insertar relaciones revierte todos los cambios', async () => {
  for (const failAt of ['delete', 'create', 'audit']) {
    const fx = fixture({ failAt });
    await assert.rejects(() => setRolePermissions(fx.db, ids.DESIGNER,
      { permissionIds: [ids.write] }, { userId: ids.user, roles: ['SUPERADMIN'], permissions: ['admin.roles.write'] }, {}),
    { message: failAt === 'audit' ? 'audit failed' : 'write failed' });
    assert.deepEqual(fx.assigned.get(ids.DESIGNER), [ids.read]);
    assert.equal(fx.events.length, 0);
    assert.equal(fx.version, 1);
  }
});

test('el cambio audita actor, rol y permisos antes/después sin secretos', async () => {
  const fx = fixture();
  await put(fx, ids.DESIGNER, [ids.write]);
  assert.equal(fx.events.length, 1);
  const event = fx.events[0];
  assert.equal(event.actorUserId, ids.user);
  assert.equal(event.targetId, ids.DESIGNER);
  assert.equal(event.action, 'ADMIN_ROLE_PERMISSIONS_UPDATED');
  assert.deepEqual(event.before.permissionKeys, ['admin.roles.read']);
  assert.deepEqual(event.after.permissionKeys, ['admin.roles.write']);
  assert.equal(/password|hash|token|secret/i.test(JSON.stringify(event)), false);
});
