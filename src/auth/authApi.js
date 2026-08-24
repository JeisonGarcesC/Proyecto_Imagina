const API_BASE_URL = '/api';

export const AUTH_ENDPOINTS = Object.freeze({
  login: `${API_BASE_URL}/auth/login`,
  refresh: `${API_BASE_URL}/auth/refresh`,
  logout: `${API_BASE_URL}/auth/logout`,
  me: `${API_BASE_URL}/auth/me`,
});

let accessToken = null;
let refreshPromise = null;
const sessionInvalidationListeners = new Set();

function setAccessToken(token) {
  accessToken = typeof token === 'string' && token ? token : null;
}

function invalidateSession() {
  setAccessToken(null);
  sessionInvalidationListeners.forEach((listener) => listener());
}

export function subscribeToSessionInvalidation(listener) {
  sessionInvalidationListeners.add(listener);
  return () => sessionInvalidationListeners.delete(listener);
}

async function readResponseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function authEndpointRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    const error = new Error(body?.message || 'No fue posible completar la solicitud.');
    error.status = response.status;
    error.code = body?.error || null;
    throw error;
  }

  return body;
}

function acceptSession(payload) {
  if (!payload?.user || !payload?.accessToken) {
    throw new Error('La respuesta de autenticación no contiene una sesión válida.');
  }
  setAccessToken(payload.accessToken);
  return payload;
}

export async function loginSession(usernameOrEmail, password) {
  const payload = await authEndpointRequest(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  return acceptSession(payload);
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authEndpointRequest(AUTH_ENDPOINTS.refresh, { method: 'POST' })
      .then(acceptSession)
      .catch((error) => {
        invalidateSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function logoutSession() {
  try {
    await authEndpointRequest(AUTH_ENDPOINTS.logout, { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

function withAccessToken(request) {
  const headers = new Headers(request.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return new Request(request, { headers, credentials: 'include' });
}

export async function authFetch(input, init) {
  const original = new Request(input, init);
  const retry = original.clone();
  let response = await fetch(withAccessToken(original));

  if (response.status !== 401) return response;

  try {
    await refreshSession();
  } catch {
    return response;
  }

  response = await fetch(withAccessToken(retry));
  return response;
}
