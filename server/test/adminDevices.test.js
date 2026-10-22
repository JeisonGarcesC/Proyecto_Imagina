import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminRouter } from '../src/admin/adminRouter.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { issueAccessToken } from '../src/auth/tokenService.js';
import { createAuthenticateAccessToken } from '../src/middleware/authenticateAccessToken.js';
import { listAdminDevices, listAdminSessions, revokeAdminDevice, revokeAdminSession } from '../src/admin/adminDeviceSessionService.js';

const ids = {
  actor: '11111111-1111-4111-8111-111111111111',
  user: '22222222-2222-4222-8222-222222222222',
  device: '33333333-3333-4333-8333-333333333333',
  active: '44444444-4444-4444-8444-444444444444',
  other: '55555555-5555-4555-8555-555555555555',
  expired: '66666666-6666-4666-8666-666666666666',
  missing: '77777777-7777-4777-8777-777777777777',
  otherDevice: '88888888-8888-4888-8888-888888888888',
  unlinked: '99999999-9999-4999-8999-999999999999',
};
const tokenOptions = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };

function fixture({ role = 'ADMIN', read = true, revoke = false } = {}) {
  const actor = {
    id: ids.actor, username: 'actor', status: 'ACTIVE', tokenVersion: 1,
    roles: [{ role: { key: role, enabled: true, permissions: [
      ...(read ? [{ permission: { key: 'admin.devices.read' } }] : []),
      ...(revoke ? [{ permission: { key: 'admin.devices.revoke' } }] : []),
    ] } }], permissionOverrides: [],
  };
  const owner = { id: ids.user, username: 'owner', displayName: 'Owner', tokenVersion: 1,
    status: 'ACTIVE', roles: [], permissionOverrides: [] };
  const device = { id: ids.device, userId: ids.user, name: 'PC-Diseño', platform: 'Windows', status: 'ACTIVE',
    enrolledAt: new Date('2026-01-01'), lastSeenAt: null, revokedAt: null, user: owner,
    publicKeyThumbprint: 'secret-thumbprint' };
  const future = new Date(Date.now() + 3600000);
  const past = new Date(Date.now() - 3600000);
  const sessions = [
    { id: ids.active, userId: ids.user, deviceId: ids.device, user: owner, device,
      createdAt: past, lastUsedAt: past, expiresAt: future, revokedAt: null, refreshTokenHash: 'secret-active' },
    { id: ids.other, userId: ids.user, deviceId: ids.otherDevice, user: owner,
      device: { id: ids.otherDevice, name: 'Otro PC', platform: 'macOS', status: 'ACTIVE' },
      createdAt: past, lastUsedAt: past, expiresAt: future, revokedAt: null, refreshTokenHash: 'secret-other' },
    { id: ids.unlinked, userId: ids.user, deviceId: null, user: owner, device: null,
      createdAt: past, lastUsedAt: past, expiresAt: future, revokedAt: null, refreshTokenHash: 'secret-unlinked' },
    { id: ids.expired, userId: ids.user, deviceId: null, user: owner, device: null,
      createdAt: past, lastUsedAt: past, expiresAt: past, revokedAt: null, refreshTokenHash: 'secret-expired' },
  ];
  const events = [];
  const offlineGrant = { id: 'grant-1', deviceId: ids.device, revokedAt: null };
  const calls = { sessions: 0, grants: 0, users: 0 };
  const project = (row, select) => Object.fromEntries(Object.entries(select)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key, enabled]) => [key, enabled === true ? row[key]
      : row[key] && project(row[key], enabled.select)]));
  const db = {
    user: { findUnique: async ({ where }) => where.id === ids.actor ? actor : where.id === ids.user ? owner : null,
      update: async () => { calls.users += 1; throw new Error('No debe modificar usuarios.'); } },
    device: {
      count: async () => 1,
      findMany: async ({ select }) => [project(device, select)],
      findUnique: async ({ where, select }) => where.id === ids.device ? project(device, select) : null,
      updateMany: async ({ where, data }) => {
        if (where.id !== ids.device || device.status === 'REVOKED') return { count: 0 };
        device.status = data.status;
        device.revokedAt = data.revokedAt;
        return { count: 1 };
      },
    },
    refreshSession: {
      count: async ({ where }) => where.deviceId ? 1 : sessions.length,
      findMany: async ({ select }) => sessions.map((session) => project(session, select)),
      findUnique: async ({ where, select }) => {
        const session = sessions.find(({ id }) => id === where.id);
        return session ? project(session, select) : null;
      },
      updateMany: async ({ where, data }) => {
        calls.sessions += 1;
        const session = sessions.find(({ id }) => id === where.id && !sessions.find((item) => item.id === id).revokedAt);
        if (!session) return { count: 0 };
        session.revokedAt = data.revokedAt;
        return { count: 1 };
      },
    },
    offlineGrant: { updateMany: async () => { calls.grants += 1; throw new Error('No debe modificar grants.'); } },
    auditLog: { create: async ({ data }) => { events.push(data); return data; } },
    $transaction: async (work) => typeof work === 'function' ? work(db) : Promise.all(work),
  };
  return { db, actor, device, sessions, offlineGrant, owner, events, calls };
}

async function request(fx, method, path, authenticated = true) {
  const app = express();
  app.use('/admin', createAdminRouter({ db: fx.db, tokenOptions }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const token = issueAccessToken(fx.actor, { ...tokenOptions, expiresIn: '1m' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: authenticated ? { authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('lectura exige autenticación y admin.devices.read', async () => {
  const fx = fixture();
  assert.equal((await request(fx, 'GET', '/admin/devices', false)).status, 401);
  assert.equal((await request(fixture({ read: false }), 'GET', '/admin/devices')).status, 403);
  assert.equal((await request(fx, 'GET', '/admin/devices')).status, 200);
  assert.equal((await request(fx, 'GET', '/admin/sessions')).status, 200);
  assert.equal((await request(fixture({ role: 'VIEWER', read: false }), 'GET', '/admin/sessions')).status, 403);
});

test('listados y detalle exponen datos seguros y sesiones sin dispositivo', async () => {
  const fx = fixture();
  const devices = await listAdminDevices(fx.db, { page: 1, pageSize: 10, search: 'owner' });
  const sessions = await listAdminSessions(fx.db, { page: 1, pageSize: 10 });
  assert.equal(devices.total, 1);
  assert.equal(sessions.items.length, 4);
  assert.equal(sessions.items.find(({ id }) => id === ids.unlinked).device, null);
  assert.equal(sessions.items.find(({ id }) => id === ids.expired).status, 'EXPIRED');
  assert.equal(JSON.stringify({ devices, sessions }).includes('refreshTokenHash'), false);
  assert.equal(JSON.stringify({ devices, sessions }).includes('publicKeyThumbprint'), false);
  assert.equal((await request(fx, 'GET', `/admin/devices/${ids.device}`)).status, 200);
  assert.equal((await request(fx, 'GET', `/admin/devices/${ids.missing}`)).status, 404);
});

test('revocación exige admin.devices.revoke; ADMIN con permiso y SUPERADMIN pueden', async () => {
  assert.equal((await request(fixture(), 'POST', `/admin/sessions/${ids.active}/revoke`)).status, 403);
  for (const role of ['ADMIN', 'SUPERADMIN']) {
    const fx = fixture({ role, revoke: true });
    assert.equal((await request(fx, 'POST', `/admin/sessions/${ids.active}/revoke`)).status, 200);
    assert.ok(fx.sessions[0].revokedAt);
  }
});

test('revocar una sesión conserva las demás, dispositivo y OfflineGrant', async () => {
  const fx = fixture({ revoke: true });
  await revokeAdminSession(fx.db, ids.active, { userId: ids.actor });
  assert.equal(fx.sessions[0].revokedAt instanceof Date, true);
  assert.equal(fx.sessions[1].revokedAt, null);
  assert.equal(fx.device.status, 'ACTIVE');
  assert.equal(fx.calls.grants, 0);
});

test('sesión inexistente, revocada y expirada se rechazan', async () => {
  const fx = fixture({ revoke: true });
  assert.equal((await request(fx, 'POST', `/admin/sessions/${ids.missing}/revoke`)).status, 404);
  await request(fx, 'POST', `/admin/sessions/${ids.active}/revoke`);
  assert.equal((await request(fx, 'POST', `/admin/sessions/${ids.active}/revoke`)).status, 409);
  assert.equal((await request(fx, 'POST', `/admin/sessions/${ids.expired}/revoke`)).status, 409);
});

test('auditoría de sesión conserva actor y usuario sin tokens ni hashes', async () => {
  const fx = fixture({ revoke: true });
  await request(fx, 'POST', `/admin/sessions/${ids.active}/revoke`);
  assert.equal(fx.events.length, 1);
  assert.equal(fx.events[0].action, 'ADMIN_SESSION_REVOKED');
  assert.equal(fx.events[0].actorUserId, ids.actor);
  assert.equal(fx.events[0].before.userId, ids.user);
  assert.equal(/token|hash|secret/i.test(JSON.stringify(fx.events)), false);
});

test('revocar dispositivo exige permiso, marca REVOKED y rechaza repetición', async () => {
  assert.equal((await request(fixture(), 'POST', `/admin/devices/${ids.device}/revoke`)).status, 403);
  const fx = fixture({ revoke: true });
  assert.equal((await request(fx, 'POST', `/admin/devices/${ids.missing}/revoke`)).status, 404);
  const response = await request(fx, 'POST', `/admin/devices/${ids.device}/revoke`);
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'REVOKED');
  assert.equal(fx.device.status, 'REVOKED');
  assert.ok(fx.device.revokedAt);
  assert.equal((await request(fx, 'POST', `/admin/devices/${ids.device}/revoke`)).status, 409);
  assert.equal(fx.events.length, 1);
});

test('revocar dispositivo no cambia sesiones, grants ni tokenVersion', async () => {
  const fx = fixture({ revoke: true });
  const beforeSessions = fx.sessions.map(({ id, deviceId, revokedAt }) => ({ id, deviceId, revokedAt }));
  const accessToken = issueAccessToken(fx.owner, { ...tokenOptions, expiresIn: '1m' });
  const app = express();
  app.get('/protected', createAuthenticateAccessToken({ db: fx.db, tokenOptions }), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const result = await revokeAdminDevice(fx.db, ids.device, { userId: ids.actor });
  assert.equal(result.status, 'REVOKED');
  assert.deepEqual(fx.sessions.map(({ id, deviceId, revokedAt }) => ({ id, deviceId, revokedAt })), beforeSessions);
  assert.equal(fx.sessions.find(({ id }) => id === ids.active).revokedAt, null);
  assert.equal(fx.sessions.find(({ id }) => id === ids.other).revokedAt, null);
  assert.equal(fx.sessions.find(({ id }) => id === ids.unlinked).revokedAt, null);
  assert.equal(fx.offlineGrant.revokedAt, null);
  assert.deepEqual(fx.calls, { sessions: 0, grants: 0, users: 0 });
  assert.equal(fx.owner.tokenVersion, 1);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`,
      { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('auditoría y DTO de revocación de dispositivo omiten secretos', async () => {
  const fx = fixture({ revoke: true });
  const response = await request(fx, 'POST', `/admin/devices/${ids.device}/revoke`);
  assert.equal(fx.events[0].action, 'ADMIN_DEVICE_REVOKED');
  assert.equal(fx.events[0].actorUserId, ids.actor);
  assert.equal(fx.events[0].before.userId, ids.user);
  assert.equal(fx.events[0].before.status, 'ACTIVE');
  assert.equal(fx.events[0].after.status, 'REVOKED');
  assert.equal(/token|hash|secret|publicKeyThumbprint/i.test(JSON.stringify({ body: response.body, events: fx.events })), false);
});
