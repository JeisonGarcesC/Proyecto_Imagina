import { hashPassword } from '../auth/passwordService.js';
import { revokeAllUserSessions } from '../auth/authService.js';
import { toPublicUser } from '../users/userDto.js';
import { writeAudit } from '../audit/auditService.js';
import { assertCanRemoveActiveSuperadmin, SUPERADMIN_ROLE_KEY } from '../roles/lastSuperadminGuard.js';
import { parseAdminPagination } from './adminPagination.js';

const userSelect = {
  id: true, username: true, email: true, displayName: true, status: true,
  createdAt: true, updatedAt: true, lastLoginAt: true,
  roles: { select: { role: { select: { id: true, key: true, name: true, enabled: true } } } },
};
const statuses = new Set(['ACTIVE', 'DISABLED', 'LOCKED']);
const privilegedRoles = new Set(['SUPERADMIN', 'ADMIN']);
const roleDetailSelect = {
  id: true, key: true, name: true, description: true, system: true, enabled: true,
  permissions: { select: { permission: { select: { id: true, key: true } } } },
};

function fail(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_BODY', 'Se requiere un objeto JSON.');
  return value;
}

function fields(body, allowed) {
  for (const key of Object.keys(object(body))) {
    if (!allowed.includes(key)) fail(400, 'INVALID_FIELD', `Campo no permitido: ${key}.`);
  }
}

function stringField(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    fail(422, 'INVALID_FIELD', `${name} debe tener entre 1 y ${max} caracteres.`);
  }
  return value.trim();
}

function identity(value, name, max) {
  return stringField(value, name, max).toLowerCase();
}

function emailField(value) {
  const email = identity(value, 'email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(422, 'INVALID_EMAIL', 'Correo electrónico inválido.');
  return email;
}

function usernameField(value) {
  const username = identity(value, 'username', 64);
  if (!/^[a-z0-9._-]+$/.test(username)) fail(422, 'INVALID_USERNAME', 'Nombre de usuario inválido.');
  return username;
}

function passwordField(value) {
  if (typeof value !== 'string' || value.length < 12) fail(422, 'INVALID_PASSWORD', 'La contraseña debe tener al menos 12 caracteres.');
  return value;
}

function publicAdminUser(user) {
  return { ...toPublicUser(user), roles: user.roles.map(({ role }) => role) };
}

function roleKeys(user) {
  return user.roles.map(({ role }) => role.key);
}

function assertPrivilegedAssignment(actor, roles) {
  if (roles.some((role) => privilegedRoles.has(role.key)) && !actor.roles.includes(SUPERADMIN_ROLE_KEY)) {
    fail(403, 'PRIVILEGED_ROLE_DENIED', 'Solo un SUPERADMIN puede asignar roles administrativos.');
  }
}

async function findUser(db, id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    fail(400, 'INVALID_USER_ID', 'Identificador de usuario inválido.');
  }
  const user = await db.user.findUnique({ where: { id }, select: userSelect });
  if (!user) fail(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
  return user;
}

async function assertUniqueIdentity(tx, data, excludeId) {
  for (const field of ['username', 'email']) {
    if (!data[field]) continue;
    const existing = await tx.user.findFirst({
      where: { [field]: { equals: data[field], mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) fail(409, field === 'email' ? 'EMAIL_EXISTS' : 'USERNAME_EXISTS',
      field === 'email' ? 'El correo ya existe.' : 'El nombre de usuario ya existe.');
  }
}

async function findRoles(db, keys) {
  const roles = await db.role.findMany({ where: { key: { in: keys } }, select: { id: true, key: true, enabled: true } });
  if (roles.length !== keys.length) fail(404, 'ROLE_NOT_FOUND', 'Uno o más roles no existen.');
  if (roles.some((role) => !role.enabled)) fail(422, 'ROLE_DISABLED', 'No se puede asignar un rol deshabilitado.');
  return roles;
}

function parseRoleKeys(value) {
  if (!Array.isArray(value) || !value.length || value.some((key) => typeof key !== 'string' || !key.trim())) {
    fail(422, 'INVALID_ROLES', 'roleKeys debe ser una lista no vacía de claves de rol.');
  }
  const keys = value.map((key) => key.trim());
  if (new Set(keys).size !== keys.length) fail(422, 'INVALID_ROLES', 'No se permiten roles repetidos.');
  return keys;
}

async function protectLastSuperadmin(tx, before, nextStatus, nextRoles) {
  const removesActive = before.status === 'ACTIVE'
    && before.roles.some(({ role }) => role.key === SUPERADMIN_ROLE_KEY && role.enabled)
    && (nextStatus !== 'ACTIVE' || !nextRoles.includes(SUPERADMIN_ROLE_KEY));
  if (!removesActive) return;
  const count = await tx.userRole.count({
    where: { user: { status: 'ACTIVE' }, role: { key: SUPERADMIN_ROLE_KEY, enabled: true } },
  });
  try {
    assertCanRemoveActiveSuperadmin({ targetIsActiveSuperadmin: true, activeSuperadminCount: count });
  } catch {
    fail(409, 'LAST_SUPERADMIN_REQUIRED', 'La operación dejaría al sistema sin un SUPERADMIN activo.');
  }
}

function auditContext(actor, context, action, targetId, before, after) {
  return { actorUserId: actor.userId, action, targetType: 'USER', targetId, before, after, ...context };
}

export function normalizeAdminError(error) {
  if (error?.status) return error;
  if (error?.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : '';
    return Object.assign(new Error('El usuario o correo ya existe.'), { status: 409, code: target.includes('email') ? 'EMAIL_EXISTS' : 'USERNAME_EXISTS' });
  }
  if (error?.code === 'P2025') return Object.assign(new Error('Usuario no encontrado.'), { status: 404, code: 'USER_NOT_FOUND' });
  if (error?.code === 'P2034') return Object.assign(new Error('Conflicto concurrente; intente nuevamente.'), { status: 409, code: 'CONCURRENT_UPDATE' });
  return Object.assign(new Error('Error interno del servidor.'), { status: 500, code: 'INTERNAL_ERROR' });
}

export async function listUsers(db, query) {
  const { page, pageSize } = parseAdminPagination(query);
  const search = query.search === undefined || query.search === '' ? '' : stringField(query.search, 'search', 160);
  const status = query.status;
  if (status !== undefined && !statuses.has(status)) fail(400, 'INVALID_STATUS', 'Estado inválido.');
  const role = query.role;
  if (role !== undefined && (typeof role !== 'string' || !role.trim())) fail(400, 'INVALID_ROLE', 'Rol inválido.');
  const where = {
    ...(search ? { OR: [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ] } : {}),
    ...(status ? { status } : {}),
    ...(role ? { roles: { some: { role: { key: role.trim() } } } } : {}),
  };
  const [total, users] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({ where, select: userSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items: users.map(publicAdminUser), page, pageSize, total };
}

export async function getUser(db, id) {
  return publicAdminUser(await findUser(db, id));
}

export async function createUser(db, body, actor, context) {
  fields(body, ['username', 'email', 'displayName', 'password', 'roleKey']);
  const username = usernameField(body.username);
  const email = emailField(body.email);
  const displayName = stringField(body.displayName, 'displayName', 160);
  const roleKey = stringField(body.roleKey, 'roleKey', 64);
  const passwordHash = await hashPassword(passwordField(body.password));
  return db.$transaction(async (tx) => {
    await assertUniqueIdentity(tx, { username, email });
    const [role] = await findRoles(tx, [roleKey]);
    assertPrivilegedAssignment(actor, [role]);
    const user = await tx.user.create({
      data: { username, email, displayName, passwordHash, roles: { create: { roleId: role.id } } },
      select: userSelect,
    });
    const after = publicAdminUser(user);
    await writeAudit(tx, auditContext(actor, context, 'ADMIN_USER_CREATED', user.id, undefined, after));
    return after;
  });
}

export async function updateUser(db, id, body, actor, context) {
  fields(body, ['username', 'email', 'displayName']);
  const data = {};
  if ('username' in body) data.username = usernameField(body.username);
  if ('email' in body) data.email = emailField(body.email);
  if ('displayName' in body) data.displayName = stringField(body.displayName, 'displayName', 160);
  if (!Object.keys(data).length) fail(400, 'EMPTY_UPDATE', 'No hay campos para actualizar.');
  return db.$transaction(async (tx) => {
    const before = await findUser(tx, id);
    const beforePublic = publicAdminUser(before);
    await assertUniqueIdentity(tx, data, id);
    const after = await tx.user.update({ where: { id }, data, select: userSelect });
    await writeAudit(tx, auditContext(actor, context, 'ADMIN_USER_UPDATED', id, beforePublic, publicAdminUser(after)));
    return publicAdminUser(after);
  });
}

export async function setUserStatus(db, id, body, actor, context) {
  fields(body, ['status']);
  if (!statuses.has(body.status)) fail(422, 'INVALID_STATUS', 'Estado inválido.');
  return db.$transaction(async (tx) => {
    const before = await findUser(tx, id);
    const previousStatus = before.status;
    await protectLastSuperadmin(tx, before, body.status, roleKeys(before));
    const after = await tx.user.update({ where: { id }, data: { status: body.status }, select: userSelect });
    if (body.status !== 'ACTIVE' && previousStatus === 'ACTIVE') await revokeAllUserSessions(tx, id);
    await writeAudit(tx, auditContext(actor, context, 'ADMIN_USER_STATUS_CHANGED', id, { status: previousStatus }, { status: after.status }));
    return publicAdminUser(after);
  }, { isolationLevel: 'Serializable' });
}

export async function resetPassword(db, id, body, actor, context) {
  fields(body, ['password']);
  const passwordHash = await hashPassword(passwordField(body.password));
  return db.$transaction(async (tx) => {
    await findUser(tx, id);
    await tx.user.update({ where: { id }, data: { passwordHash } });
    await revokeAllUserSessions(tx, id);
    await writeAudit(tx, auditContext(actor, context, 'ADMIN_USER_PASSWORD_RESET', id));
    return { reset: true };
  });
}

export async function setUserRoles(db, id, body, actor, context) {
  fields(body, ['roleKeys']);
  const keys = parseRoleKeys(body.roleKeys);
  return db.$transaction(async (tx) => {
    const before = await findUser(tx, id);
    const previousRoles = roleKeys(before);
    const roles = await findRoles(tx, keys);
    assertPrivilegedAssignment(actor, roles);
    await protectLastSuperadmin(tx, before, before.status, keys);
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.userRole.createMany({ data: roles.map((role) => ({ userId: id, roleId: role.id })) });
    await tx.user.update({ where: { id }, data: { permissionVersion: { increment: 1 } } });
    const after = await findUser(tx, id);
    await writeAudit(tx, auditContext(actor, context, 'ADMIN_USER_ROLES_CHANGED', id, { roles: previousRoles }, { roles: roleKeys(after) }));
    return publicAdminUser(after);
  }, { isolationLevel: 'Serializable' });
}

export async function listRoles(db) {
  return db.role.findMany({ select: { id: true, key: true, name: true, description: true, system: true, enabled: true }, orderBy: { key: 'asc' } });
}

export async function getRole(db, id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    fail(400, 'INVALID_ROLE_ID', 'Identificador de rol inválido.');
  }
  const role = await db.role.findUnique({
    where: { id },
    select: roleDetailSelect,
  });
  if (!role) fail(404, 'ROLE_NOT_FOUND', 'Rol no encontrado.');
  const { permissions, ...details } = role;
  return { ...details, permissionKeys: permissions.map(({ permission }) => permission.key).sort() };
}

export async function listPermissions(db) {
  return db.permission.findMany({ select: { id: true, key: true, description: true, module: true }, orderBy: { key: 'asc' } });
}

export async function setRolePermissions(db, id, body, actor, context) {
  if (!actor?.roles?.includes(SUPERADMIN_ROLE_KEY) || !actor?.permissions?.includes('admin.roles.write')) {
    fail(403, 'ROLE_PERMISSIONS_DENIED', 'Solo un SUPERADMIN con admin.roles.write puede modificar permisos de roles.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    fail(400, 'INVALID_ROLE_ID', 'Identificador de rol inválido.');
  }
  return db.$transaction(async (tx) => {
    const role = await tx.role.findUnique({ where: { id }, select: roleDetailSelect });
    if (!role) fail(404, 'ROLE_NOT_FOUND', 'Rol no encontrado.');
    if (role.key === SUPERADMIN_ROLE_KEY) {
      fail(403, 'SUPERADMIN_IMMUTABLE', 'Los permisos del rol SUPERADMIN son inmutables.');
    }
    fields(body, ['permissionIds']);
    const ids = body.permissionIds;
    if (!Array.isArray(ids) || ids.some((value) => typeof value !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
      || new Set(ids).size !== ids.length) {
      fail(422, 'INVALID_PERMISSIONS', 'permissionIds debe ser una lista de identificadores únicos y válidos.');
    }
    const permissions = await tx.permission.findMany({
      where: { id: { in: ids } }, select: { id: true, key: true },
    });
    if (permissions.length !== ids.length) fail(404, 'PERMISSION_NOT_FOUND', 'Uno o más permisos no existen.');

    const before = role.permissions.map(({ permission }) => permission.key).sort();
    const after = permissions.map(({ key }) => key).sort();
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    if (ids.length) {
      await tx.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: id, permissionId })) });
    }
    await tx.user.updateMany({
      where: { roles: { some: { roleId: id } } },
      data: { permissionVersion: { increment: 1 } },
    });
    await writeAudit(tx, {
      actorUserId: actor.userId, action: 'ADMIN_ROLE_PERMISSIONS_UPDATED',
      targetType: 'ROLE', targetId: id,
      before: { roleKey: role.key, permissionKeys: before },
      after: { roleKey: role.key, permissionKeys: after },
      ...context,
    });
    return { id: role.id, key: role.key, name: role.name, description: role.description,
      system: role.system, enabled: role.enabled, permissionKeys: after };
  }, { isolationLevel: 'Serializable' });
}
