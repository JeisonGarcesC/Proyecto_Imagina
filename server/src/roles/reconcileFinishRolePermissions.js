import { PERMISSION_CATALOG } from '../permissions/permissionCatalog.js';

const finishKeys = PERMISSION_CATALOG
  .filter(({ module }) => module === 'finishes')
  .map(({ key }) => key);

export async function reconcileFinishRolePermissions(prisma, role, allowedKeys) {
  const disallowedKeys = finishKeys.filter((key) => !allowedKeys.includes(key));
  if (disallowedKeys.length === 0) return;

  const permissions = await prisma.permission.findMany({
    where: { key: { in: disallowedKeys } },
    select: { id: true },
  });
  if (permissions.length === 0) return;

  await prisma.rolePermission.deleteMany({
    where: {
      roleId: role.id,
      permissionId: { in: permissions.map(({ id }) => id) },
    },
  });
}
