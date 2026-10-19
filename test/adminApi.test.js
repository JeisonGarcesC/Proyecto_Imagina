import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSession, logoutSession } from '../src/auth/authApi.js';
import {
  createAdminUser, getAdminAudit, getAdminAuditEvent, getAdminDevice, getAdminDevices, getAdminPermissions, getAdminRole, getAdminRoles, getAdminSessions, getAdminUserPermissions, getAdminUsers,
  resetAdminUserPassword, revokeAdminDevice, revokeAdminSession, updateAdminRolePermissions, updateAdminUserPermissions, updateAdminUserRoles, updateAdminUserStatus,
} from '../src/admin/adminApi.js';

const session = {
  user: { id: 'u1', username: 'root', status: 'ACTIVE' },
  roles: ['SUPERADMIN'], permissions: ['admin.users.read', 'admin.users.write'],
  accessToken: 'access-token', expiresIn: 900,
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function allowRelativeRequests(t) {
  const OriginalRequest = globalThis.Request;
  globalThis.Request = class extends OriginalRequest {
    constructor(input, init) {
      super(typeof input === 'string' && input.startsWith('/') ? `https://example.test${input}` : input, init);
    }
  };
  t.after(() => { globalThis.Request = OriginalRequest; });
}

test('el listado envía filtros al servidor con el bearer en memoria', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    requests.push(input);
    return json({ items: [], page: 2, pageSize: 10, total: 0 });
  };
  await loginSession('root', 'secret');
  const result = await getAdminUsers({ page: 2, pageSize: 10, search: 'ana', status: 'ACTIVE', role: 'DESIGNER' });
  assert.equal(result.page, 2);
  assert.equal(requests.length, 1);
  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/api/admin/users');
  assert.equal(url.searchParams.get('search'), 'ana');
  assert.equal(url.searchParams.get('status'), 'ACTIVE');
  assert.equal(url.searchParams.get('role'), 'DESIGNER');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(requests[0].headers.get('Authorization'), 'Bearer access-token');
  await logoutSession();
});

test('auditoría consulta listado y detalle sin mutaciones', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    return json({ items: [], total: 0, page: 1, pageSize: 20 });
  };
  await loginSession('root', 'secret');
  await getAdminAudit({ page: 2, action: 'ADMIN_USER_CREATED', from: '2026-02-01', user: 'ana' });
  await getAdminAuditEvent('event-1');
  assert.equal(new URL(calls[0].url).pathname, '/api/admin/audit');
  assert.equal(new URL(calls[0].url).searchParams.get('user'), 'ana');
  assert.equal(new URL(calls[0].url).searchParams.get('from'), '2026-02-01');
  assert.equal(new URL(calls[1].url).pathname, '/api/admin/audit/event-1');
  assert.ok(calls.every((call) => call.method === 'GET'));
  await logoutSession();
});

test('roles, detalle y catálogo se consultan con la sesión existente', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const paths = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    paths.push(new URL(input.url).pathname);
    return json([]);
  };
  await loginSession('root', 'secret');
  await getAdminRoles();
  await getAdminRole('role-1');
  await getAdminPermissions();
  assert.deepEqual(paths, ['/api/admin/roles', '/api/admin/roles/role-1', '/api/admin/permissions']);
  await logoutSession();
});

test('mutaciones usan contratos ADM-1 y muestran errores 403/409', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    if (input.url.includes('/status')) return json({ error: 'PERMISSION_DENIED', message: 'Permiso insuficiente.' }, 403);
    if (input.url.endsWith('/users')) return json({ error: 'USERNAME_EXISTS', message: 'El nombre de usuario ya existe.' }, 409);
    return json({ ok: true });
  };
  await loginSession('root', 'secret');
  await assert.rejects(() => createAdminUser({ username: 'ana', password: 'a-secure-password' }),
    { status: 409, code: 'USERNAME_EXISTS', message: 'El nombre de usuario ya existe.' });
  await assert.rejects(() => updateAdminUserStatus('u2', 'DISABLED'),
    { status: 403, code: 'PERMISSION_DENIED', message: 'No tienes permisos para realizar esta operación.' });
  await resetAdminUserPassword('u2', 'another-secure-password');
  await updateAdminUserRoles('u2', ['DESIGNER']);
  assert.equal(JSON.parse(await calls[2].text()).password, 'another-secure-password');
  assert.deepEqual(JSON.parse(await calls[3].text()).roleKeys, ['DESIGNER']);
  assert.equal(calls[2].method, 'POST');
  assert.equal(calls[3].method, 'PUT');
  await logoutSession();
});

test('guardar permisos envía una única solicitud y conserva errores 403/409', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    if (calls.length === 1) return json({ id: 'role-1', permissionKeys: ['admin.roles.read'] });
    if (calls.length === 2) return json({ error: 'ROLE_PERMISSIONS_DENIED' }, 403);
    return json({ error: 'CONCURRENT_UPDATE', message: 'Conflicto concurrente; intente nuevamente.' }, 409);
  };
  await loginSession('root', 'secret');
  const permissionIds = ['11111111-1111-4111-8111-111111111111'];
  assert.equal((await updateAdminRolePermissions('role-1', permissionIds)).id, 'role-1');
  assert.equal(calls[0].method, 'PUT');
  assert.equal(new URL(calls[0].url).pathname, '/api/admin/roles/role-1/permissions');
  assert.deepEqual(JSON.parse(await calls[0].text()), { permissionIds });
  await assert.rejects(() => updateAdminRolePermissions('role-1', permissionIds), { status: 403 });
  await assert.rejects(() => updateAdminRolePermissions('role-1', permissionIds),
    { status: 409, code: 'CONCURRENT_UPDATE', message: 'Conflicto concurrente; intente nuevamente.' });
  await logoutSession();
});

test('permisos individuales consultan detalle y guardan solo overrides explícitos', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    if (calls.length === 3) return json({ error: 'USER_PERMISSIONS_DENIED' }, 403);
    if (calls.length === 4) return json({ error: 'CONCURRENT_UPDATE', message: 'Conflicto concurrente; intente nuevamente.' }, 409);
    return json({ user: { id: 'u2' }, permissions: [] });
  };
  await loginSession('root', 'secret');
  await getAdminUserPermissions('u2');
  const overrides = [{ permissionId: 'p1', effect: 'ALLOW' }, { permissionId: 'p2', effect: 'DENY' }];
  await updateAdminUserPermissions('u2', overrides);
  assert.equal(new URL(calls[0].url).pathname, '/api/admin/users/u2/permissions');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[1].method, 'PUT');
  assert.deepEqual(JSON.parse(await calls[1].text()), { overrides });
  await assert.rejects(() => updateAdminUserPermissions('u2', []), { status: 403 });
  await assert.rejects(() => updateAdminUserPermissions('u2', []),
    { status: 409, code: 'CONCURRENT_UPDATE', message: 'Conflicto concurrente; intente nuevamente.' });
  await logoutSession();
});

test('dispositivos y sesiones consultan filtros y revocan sin enviar secretos', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    if (calls.length === 4) return json({ error: 'PERMISSION_DENIED' }, 403);
    if (calls.length === 5) return json({ error: 'SESSION_ALREADY_REVOKED', message: 'La sesión ya fue revocada.' }, 409);
    return json({ items: [], total: 0, page: 1, pageSize: 20 });
  };
  await loginSession('root', 'secret');
  await getAdminDevices({ page: 2, status: 'ACTIVE', search: 'PC' });
  await getAdminDevice('device-1');
  await getAdminSessions({ deviceId: 'device-1', status: 'EXPIRED' });
  assert.equal(new URL(calls[0].url).searchParams.get('status'), 'ACTIVE');
  assert.equal(new URL(calls[1].url).pathname, '/api/admin/devices/device-1');
  assert.equal(new URL(calls[2].url).searchParams.get('deviceId'), 'device-1');
  await assert.rejects(() => revokeAdminSession('session-1'), { status: 403 });
  await assert.rejects(() => revokeAdminSession('session-1'), { status: 409, code: 'SESSION_ALREADY_REVOKED' });
  assert.equal(calls[3].method, 'POST');
  assert.equal(new URL(calls[3].url).pathname, '/api/admin/sessions/session-1/revoke');
  await logoutSession();
});

test('revocar dispositivo usa el endpoint administrativo y conserva 403/409', async (t) => {
  allowRelativeRequests(t);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input.endsWith('/auth/login')) return json(session);
    if (typeof input === 'string' && input.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    calls.push(input);
    if (calls.length === 2) return json({ error: 'PERMISSION_DENIED' }, 403);
    if (calls.length === 3) return json({ error: 'DEVICE_ALREADY_REVOKED', message: 'El dispositivo ya fue revocado.' }, 409);
    return json({ id: 'device-1', status: 'REVOKED' });
  };
  await loginSession('root', 'secret');
  assert.equal((await revokeAdminDevice('device-1')).status, 'REVOKED');
  assert.equal(calls[0].method, 'POST');
  assert.equal(new URL(calls[0].url).pathname, '/api/admin/devices/device-1/revoke');
  await assert.rejects(() => revokeAdminDevice('device-1'), { status: 403 });
  await assert.rejects(() => revokeAdminDevice('device-1'), { status: 409, code: 'DEVICE_ALREADY_REVOKED' });
  await logoutSession();
});
