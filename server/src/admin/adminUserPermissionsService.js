import { authUserInclude, getAuthorizationSnapshot, getRolePermissionKeys } from '../auth/effectivePermissionsService.js';
import { writeAudit } from '../audit/auditService.js';
import { SUPERADMIN_ROLE_KEY } from '../roles/lastSuperadminGuard.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}

function validateUserId(id) {
  if (!uuidPattern.test(id)) fail(400, 'INVALID_USER_ID', 'Identificador de usuario inválido.');
}

async function findPermissionUser(db, id) {
  const user = await db.user.findUnique({ where: { id }, include: authUserInclude });
  if (!user) fail(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
  return user;
}

function isSuperadmin(user) {
  return user.roles.some(({ role }) => role.key === SUPERADMIN_ROLE_KEY);
}

function serializeOverrides(user) {
  return user.permissionOverrides
    .map(({ effect, permission }) => ({ permissionKey: permission.key, effect }))
    .sort((a, b) => a.permissionKey.localeCompare(b.permissionKey));
}

export async function getUserPermissions(db, id) {
  validateUserId(id);
  const user = await findPermissionUser(db, id);
  const catalog = await db.permission.findMany({
    select: { id: true, key: true, description: true, module: true }, orderBy: { key: 'asc' },
  });
  const roleKeys = new Set(getRolePermissionKeys(user));
  const effectiveKeys = new Set(getAuthorizationSnapshot(user).permissions);
  const overrides = new Map(user.permissionOverrides.map(({ permission, effect }) => [permission.key, effect]));
  return {
    user: { id: user.id, username: user.username, displayName: user.displayName,
      roleKeys: user.roles.map(({ role }) => role.key).sort(), superadmin: isSuperadmin(user) },
    permissions: catalog.map((permission) => ({
      ...permission, roleGranted: roleKeys.has(permission.key),
      override: overrides.get(permission.key) || null, effective: effectiveKeys.has(permission.key),
    })),
  };
}

export async function setUserPermissionOverrides(db, id, body, actor, context = {}) {
  if (!actor?.roles?.includes(SUPERADMIN_ROLE_KEY) || !actor?.permissions?.includes('admin.permissions.write')) {
    fail(403, 'USER_PERMISSIONS_DENIED', 'Solo un SUPERADMIN con admin.permissions.write puede modificar permisos individuales.');
  }
  validateUserId(id);
  return db.$transaction(async (tx) => {
    const user = await findPermissionUser(tx, id);
    if (isSuperadmin(user)) {
      fail(403, 'SUPERADMIN_IMMUTABLE', 'No se pueden modificar los permisos individuales de un SUPERADMIN.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => key !== 'overrides') || !Array.isArray(body.overrides)) {
      fail(400, 'INVALID_BODY', 'Se requiere una lista de overrides.');
    }
    const overrides = body.overrides;
    if (overrides.some((item) => !item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).some((key) => !['permissionId', 'effect'].includes(key))
      || typeof item.permissionId !== 'string' || !uuidPattern.test(item.permissionId)
      || !['ALLOW', 'DENY'].includes(item.effect))
      || new Set(overrides.map(({ permissionId }) => permissionId)).size !== overrides.length) {
      fail(422, 'INVALID_OVERRIDES', 'Los overrides requieren IDs únicos y efectos ALLOW o DENY.');
    }
    const ids = overrides.map(({ permissionId }) => permissionId);
    const permissions = await tx.permission.findMany({
      where: { id: { in: ids } }, select: { id: true, key: true },
    });
    if (permissions.length !== ids.length) fail(404, 'PERMISSION_NOT_FOUND', 'Uno o más permisos no existen.');
    const keyById = new Map(permissions.map(({ id: permissionId, key }) => [permissionId, key]));
    const before = serializeOverrides(user);
    const after = overrides.map(({ permissionId, effect }) => ({ permissionKey: keyById.get(permissionId), effect }))
      .sort((a, b) => a.permissionKey.localeCompare(b.permissionKey));
    await tx.userPermissionOverride.deleteMany({ where: { userId: id } });
    if (overrides.length) {
      await tx.userPermissionOverride.createMany({
        data: overrides.map(({ permissionId, effect }) => ({ userId: id, permissionId, effect })),
      });
    }
    await tx.user.update({ where: { id }, data: { permissionVersion: { increment: 1 } } });
    await writeAudit(tx, {
      actorUserId: actor.userId, action: 'ADMIN_USER_PERMISSIONS_UPDATED',
      targetType: 'USER', targetId: id,
      before: { overrides: before }, after: { overrides: after }, ...context,
    });
    return getUserPermissions(tx, id);
  }, { isolationLevel: 'Serializable' });
}
