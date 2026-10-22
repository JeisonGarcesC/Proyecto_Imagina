import { authFetch } from '../auth/authApi.js';

const base = '/api/admin';

async function request(path, { method = 'GET', body } = {}) {
  const response = await authFetch(`${base}${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(response.status === 403
      ? 'No tienes permisos para realizar esta operación.'
      : payload?.message || 'No fue posible completar la operación.');
    error.status = response.status;
    error.code = payload?.error;
    throw error;
  }
  return payload;
}

export function getAdminUsers(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) params.set(key, String(value));
  }
  return request(`/users?${params}`);
}

export const getAdminUser = (id) => request(`/users/${encodeURIComponent(id)}`);
export const getAdminUserPermissions = (id) => request(`/users/${encodeURIComponent(id)}/permissions`);
export const updateAdminUserPermissions = (id, overrides) => request(`/users/${encodeURIComponent(id)}/permissions`, { method: 'PUT', body: { overrides } });
export const createAdminUser = (data) => request('/users', { method: 'POST', body: data });
export const updateAdminUser = (id, data) => request(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: data });
export const updateAdminUserStatus = (id, status) => request(`/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });
export const resetAdminUserPassword = (id, password) => request(`/users/${encodeURIComponent(id)}/password`, { method: 'POST', body: { password } });
export const getAdminRoles = () => request('/roles');
export const getAdminRole = (id) => request(`/roles/${encodeURIComponent(id)}`);
export const getAdminPermissions = () => request('/permissions');
export const updateAdminRolePermissions = (id, permissionIds) => request(`/roles/${encodeURIComponent(id)}/permissions`, { method: 'PUT', body: { permissionIds } });
export const updateAdminUserRoles = (id, roleKeys) => request(`/users/${encodeURIComponent(id)}/roles`, { method: 'PUT', body: { roleKeys } });

function adminQuery(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) params.set(key, String(value));
  }
  return params.toString();
}

export const getAdminDevices = (filters = {}) => request(`/devices?${adminQuery(filters)}`);
export const getAdminDevice = (id) => request(`/devices/${encodeURIComponent(id)}`);
export const revokeAdminDevice = (id) => request(`/devices/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
export const getAdminSessions = (filters = {}) => request(`/sessions?${adminQuery(filters)}`);
export const revokeAdminSession = (id) => request(`/sessions/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
export const getAdminAudit = (filters = {}) => request(`/audit?${adminQuery(filters)}`);
export const getAdminAuditEvent = (id) => request(`/audit/${encodeURIComponent(id)}`);
