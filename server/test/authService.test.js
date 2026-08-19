import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../src/auth/passwordService.js';
import { loginUser, logoutUser, refreshUserSession } from '../src/auth/authService.js';
import { hashRefreshToken } from '../src/auth/refreshTokenService.js';

const tokenOptions = {
  secret: '0123456789abcdef0123456789abcdef',
  issuer: 'test', audience: 'test', expiresIn: '15m', expiresInSeconds: 900,
};

function user(overrides = {}) {
  return {
    id: 'user-1', username: 'admin', email: 'admin@example.com', displayName: 'Admin',
    status: 'ACTIVE', tokenVersion: 1, roles: [], permissionOverrides: [],
    ...overrides,
  };
}

function loginDb(foundUser) {
  const audits = [];
  const sessions = [];
  return {
    audits, sessions,
    user: {
      findFirst: async () => foundUser,
      update: async () => foundUser,
    },
    refreshSession: { create: async ({ data }) => (sessions.push(data), data) },
    auditLog: { create: async ({ data }) => (audits.push(data), data) },
    $transaction: async (operations) => Promise.all(operations),
  };
}

test('login válido crea sesión y devuelve permisos', async () => {
  const found = user({
    passwordHash: await hashPassword('correct-horse-battery-staple', 4),
    roles: [{ role: { key: 'VIEWER', enabled: true, permissions: [{ permission: { key: 'bom.view' } }] } }],
  });
  const db = loginDb(found);
  const result = await loginUser({ db, usernameOrEmail: 'admin', password: 'correct-horse-battery-staple', refreshTtlSeconds: 60, tokenOptions });
  assert.equal(result.user.username, 'admin');
  assert.deepEqual(result.permissions, ['bom.view']);
  assert.equal(db.sessions[0].refreshTokenHash, hashRefreshToken(result.refreshToken));
  assert.equal(db.audits.at(-1).action, 'AUTH_LOGIN_SUCCESS');
});

for (const [name, found, password] of [
  ['password inválido', user({ passwordHash: '$2b$04$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin' }), 'incorrecta'],
  ['usuario inexistente', null, 'incorrecta'],
  ['usuario DISABLED', user({ status: 'DISABLED', passwordHash: 'unused' }), 'incorrecta'],
  ['usuario LOCKED', user({ status: 'LOCKED', passwordHash: 'unused' }), 'incorrecta'],
]) {
  test(`login rechaza ${name} sin enumerar`, async () => {
    const db = loginDb(found);
    await assert.rejects(
      loginUser({ db, usernameOrEmail: 'target', password, refreshTtlSeconds: 60, tokenOptions }),
      { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' }
    );
    assert.equal(db.audits.at(-1).action, 'AUTH_LOGIN_FAILED');
  });
}

function refreshDb(session) {
  const audits = [];
  let updateData = null;
  const tx = {
    refreshSession: {
      findUnique: async () => session,
      updateMany: async ({ data }) => (updateData = data, { count: 1 }),
    },
  };
  return {
    audits,
    get updateData() { return updateData; },
    auditLog: { create: async ({ data }) => (audits.push(data), data) },
    $transaction: async (callback) => callback(tx),
  };
}

test('refresh válido rota token', async () => {
  const db = refreshDb({ id: 's1', user: user(), tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
  const result = await refreshUserSession({ db, refreshToken: 'old-token', refreshTtlSeconds: 60, tokenOptions });
  assert.notEqual(result.refreshToken, 'old-token');
  assert.equal(db.updateData.refreshTokenHash, hashRefreshToken(result.refreshToken));
  assert.equal(db.audits[0].action, 'AUTH_REFRESH');
});

for (const [name, session] of [
  ['expirado', { id: 's1', user: user(), tokenVersion: 1, expiresAt: new Date(0), revokedAt: null }],
  ['revocado', { id: 's1', user: user(), tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() }],
  ['tokenVersion incorrecto', { id: 's1', user: user({ tokenVersion: 2 }), tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: null }],
]) {
  test(`refresh rechaza token ${name}`, async () => {
    await assert.rejects(
      refreshUserSession({ db: refreshDb(session), refreshToken: 'old', refreshTtlSeconds: 60, tokenOptions }),
      { code: 'INVALID_REFRESH_TOKEN' }
    );
  });
}

test('logout revoca sesión y es idempotente sin token', async () => {
  let revokedAt;
  const db = {
    refreshSession: {
      findUnique: async () => ({ id: 's1', userId: 'user-1', revokedAt: null }),
      update: async ({ data }) => (revokedAt = data.revokedAt),
    },
    auditLog: { create: async ({ data }) => data },
  };
  assert.equal((await logoutUser({ db, refreshToken: 'token' })).revoked, true);
  assert.ok(revokedAt instanceof Date);
  assert.deepEqual(await logoutUser({ db, refreshToken: '' }), { revoked: false });
});
