import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { getAdminAudit, listAdminAudit } from '../src/admin/adminAuditService.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };

function fixture({ role = 'ADMIN', permission = true } = {}) {
  const actor = { id: actorId, username: 'admin', status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: role, enabled: true, permissions: permission ? [{ permission: { key: 'admin.audit.read' } }] : [] } }],
    permissionOverrides: [] };
  const rows = [
    { id: '44444444-4444-4444-8444-444444444444', actorUserId: actorId, actorDeviceId: null,
      actorUser: { id: actorId, username: 'admin', displayName: 'Administrador', passwordHash: 'secret' }, actorDevice: null,
      action: 'ADMIN_USER_ROLES_CHANGED', targetType: 'USER', targetId,
      before: { roles: ['DESIGNER'], passwordHash: 'secret-before' },
      after: { roles: ['ADMIN'], refreshTokenHash: 'secret-after' }, createdAt: new Date('2026-02-02T12:00:00Z'),
      refreshTokenHash: 'secret-row' },
    { id: '55555555-5555-4555-8555-555555555555', actorUserId: actorId, actorDeviceId: null,
      actorUser: { id: actorId, username: 'admin', displayName: 'Administrador' }, actorDevice: null,
      action: 'ADMIN_USER_PASSWORD_RESET', targetType: 'USER', targetId,
      before: { password: 'old', accessToken: 'secret-token' }, after: { password: 'new', refreshToken: 'secret-refresh' },
      createdAt: new Date('2026-02-01T12:00:00Z') },
  ];
  const calls = { count: 0, find: 0, writes: 0, lastWhere: null, lastQuery: null };
  const project = (row, select) => Object.fromEntries(Object.entries(select).filter(([, enabled]) => Boolean(enabled))
    .map(([key, enabled]) => [key, enabled === true ? row[key] : row[key] ? project(row[key], enabled.select) : null]));
  const db = {
    user: { findUnique: async () => actor, findMany: async () => [{ id: targetId }] },
    auditLog: {
      count: async ({ where }) => { calls.count += 1; calls.lastWhere = where; return rows.length; },
      findMany: async (query) => { calls.find += 1; calls.lastQuery = query; return rows.map((row) => project(row, query.select)); },
      findUnique: async ({ where, select }) => {
        const row = rows.find(({ id }) => id === where.id);
        return row ? project(row, select) : null;
      },
      create: async () => { calls.writes += 1; throw new Error('No debe escribir auditoría.'); },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  return { actor, db, calls };
}

async function request(fx, path, authenticated = true) {
  const app = express();
  app.use('/admin', createAdminRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = issueAccessToken(fx.actor, { ...tokenOptions, expiresIn: '1m' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      headers: authenticated ? { authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('lectura exige permiso incluso a ADMIN y SUPERADMIN', async () => {
  assert.equal((await request(fixture(), '/admin/audit', false)).status, 401);
  for (const role of ['ADMIN', 'SUPERADMIN', 'DESIGNER']) {
    assert.equal((await request(fixture({ role, permission: false }), '/admin/audit')).status, 403);
  }
  assert.equal((await request(fixture(), '/admin/audit')).status, 200);
  assert.equal((await request(fixture({ role: 'SUPERADMIN' }), '/admin/audit')).status, 200);
});

test('paginación, acción, usuario, fecha y búsqueda usan consulta de base de datos', async () => {
  const fx = fixture();
  const result = await listAdminAudit(fx.db, { page: '2', pageSize: '10', action: 'ADMIN_USER_ROLES_CHANGED',
    user: 'admin', from: '2026-02-01', until: '2026-02-02', search: 'USER' });
  assert.equal(result.page, 2);
  assert.equal(result.total, 2);
  assert.deepEqual(fx.calls.lastQuery.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.equal(fx.calls.lastQuery.skip, 10);
  assert.equal(fx.calls.lastQuery.take, 10);
  assert.equal(fx.calls.lastWhere.action.contains, 'ADMIN_USER_ROLES_CHANGED');
  assert.ok(fx.calls.lastWhere.OR);
  assert.ok(fx.calls.lastWhere.AND);
  assert.equal(fx.calls.lastWhere.createdAt.gte.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(fx.calls.lastWhere.createdAt.lt.toISOString(), '2026-02-03T00:00:00.000Z');
  assert.equal(fx.calls.writes, 0);
});

test('detalle conserva cambios históricos, oculta secretos y responde 404', async () => {
  const fx = fixture();
  const event = await getAdminAudit(fx.db, '44444444-4444-4444-8444-444444444444');
  assert.deepEqual(event.before, { roles: ['DESIGNER'] });
  assert.deepEqual(event.after, { roles: ['ADMIN'] });
  assert.equal(event.affectedUserId, targetId);
  assert.equal(/secret|passwordHash|refreshTokenHash|accessToken/i.test(JSON.stringify(event)), false);
  const reset = await getAdminAudit(fx.db, '55555555-5555-4555-8555-555555555555');
  assert.equal(reset.before, null);
  assert.equal(reset.after, null);
  assert.equal((await request(fx, `/admin/audit/${missingId}`)).status, 404);
  assert.equal(fx.calls.writes, 0);
});

test('filtros y fechas inválidos se rechazan', async () => {
  const fx = fixture();
  assert.equal((await request(fx, '/admin/audit?pageSize=101')).status, 400);
  assert.equal((await request(fx, '/admin/audit?from=2026-02-30')).status, 422);
  assert.equal((await request(fx, '/admin/audit?from=2026-02-03&until=2026-02-01')).status, 422);
});
