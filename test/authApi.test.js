import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_ENDPOINTS,
  authFetch,
  loginSession,
  logoutSession,
  subscribeToSessionInvalidation,
} from '../src/auth/authApi.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const session = {
  user: { id: 'user-1', username: 'admin', displayName: 'Admin', status: 'ACTIVE' },
  roles: ['ADMIN'],
  permissions: ['project.view'],
  accessToken: 'access-token',
  expiresIn: 900,
};

test('login usa el endpoint centralizado, incluye credenciales y no persiste el token', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  let storageWrites = 0;
  const storage = { setItem: () => { storageWrites += 1; } };
  globalThis.localStorage = storage;
  globalThis.sessionStorage = storage;
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse(session);
  };

  await loginSession('admin', 'secret');

  assert.equal(request.url, AUTH_ENDPOINTS.login);
  assert.equal(request.options.credentials, 'include');
  assert.deepEqual(JSON.parse(request.options.body), {
    usernameOrEmail: 'admin',
    password: 'secret',
  });
  assert.equal(storageWrites, 0);
});

test('authFetch refresca una vez ante 401 y reintenta con el token nuevo', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = async (input, options) => {
    requests.push({ input, options });
    if (input === AUTH_ENDPOINTS.refresh) {
      return jsonResponse({ ...session, accessToken: 'renewed-token' });
    }
    if (requests.filter(({ input: value }) => value instanceof Request).length === 1) {
      return jsonResponse({ message: 'Expirado' }, 401);
    }
    return jsonResponse({ ok: true });
  };

  const response = await authFetch('https://example.test/projects', { method: 'GET' });

  assert.equal(response.status, 200);
  assert.equal(requests.filter(({ input }) => input === AUTH_ENDPOINTS.refresh).length, 1);
  const retriedRequest = requests.at(-1).input;
  assert.equal(retriedRequest.headers.get('Authorization'), 'Bearer renewed-token');
  assert.equal(retriedRequest.credentials, 'include');

  await logoutSession();
});

test('refresh fallido invalida la sesión y elimina el access token', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    if (input === AUTH_ENDPOINTS.login) return jsonResponse(session);
    if (input === AUTH_ENDPOINTS.refresh) {
      return jsonResponse({ error: 'INVALID_REFRESH_TOKEN', message: 'Sesión no válida.' }, 401);
    }
    return jsonResponse({ message: 'Expirado' }, 401);
  };
  await loginSession('admin', 'secret');

  let invalidations = 0;
  const unsubscribe = subscribeToSessionInvalidation(() => { invalidations += 1; });
  t.after(unsubscribe);
  const response = await authFetch('https://example.test/projects');

  assert.equal(response.status, 401);
  assert.equal(invalidations, 1);

  let requestAfterFailure;
  globalThis.fetch = async (input) => {
    requestAfterFailure = input;
    return jsonResponse({ ok: true });
  };
  await authFetch('https://example.test/after-failure');
  assert.equal(requestAfterFailure.headers.get('Authorization'), null);
});

test('logout elimina el access token en memoria', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    if (input === AUTH_ENDPOINTS.login) return jsonResponse(session);
    if (input === AUTH_ENDPOINTS.logout) return new Response(null, { status: 204 });
    return jsonResponse({ ok: true });
  };
  await loginSession('admin', 'secret');
  await logoutSession();

  let requestAfterLogout;
  globalThis.fetch = async (input) => {
    requestAfterLogout = input;
    return jsonResponse({ ok: true });
  };
  await authFetch('https://example.test/after-logout');

  assert.equal(requestAfterLogout.headers.get('Authorization'), null);
});
