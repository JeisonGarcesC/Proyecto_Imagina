import { resolveEffectivePermissions } from './permissionResolver.js';

export const authUserInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
  permissionOverrides: { include: { permission: true } },
};

export function getAuthorizationSnapshot(user) {
  const enabledRoles = (user?.roles || []).map(({ role }) => role).filter((role) => role?.enabled);
  const rolePermissions = enabledRoles.flatMap((role) =>
    (role.permissions || []).map(({ permission }) => permission?.key).filter(Boolean)
  );
  return {
    roles: enabledRoles.map(({ key }) => key).sort(),
    permissions: resolveEffectivePermissions({
      rolePermissions,
      overrides: user?.permissionOverrides || [],
    }),
  };
}
