import { resolveEffectivePermissions } from './permissionResolver.js';
import { SUPERADMIN_ROLE_KEY } from '../roles/lastSuperadminGuard.js';

export const authUserInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
  permissionOverrides: { include: { permission: true } },
};

export function getRolePermissionKeys(user) {
  const enabledRoles = (user?.roles || []).map(({ role }) => role).filter((role) => role?.enabled);
  return enabledRoles.flatMap((role) =>
    (role.permissions || []).map(({ permission }) => permission?.key).filter(Boolean)
  );
}

export function getAuthorizationSnapshot(user) {
  const enabledRoles = (user?.roles || []).map(({ role }) => role).filter((role) => role?.enabled);
  const rolePermissions = getRolePermissionKeys(user);
  const isSuperadmin = enabledRoles.some(({ key }) => key === SUPERADMIN_ROLE_KEY);
  return {
    roles: enabledRoles.map(({ key }) => key).sort(),
    permissions: resolveEffectivePermissions({
      rolePermissions,
      overrides: isSuperadmin ? [] : user?.permissionOverrides || [],
    }),
  };
}
