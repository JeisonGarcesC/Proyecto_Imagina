import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG, assertUniquePermissionKeys } from '../src/permissions/permissionCatalog.js';
import { ROLE_CATALOG } from '../src/roles/roleCatalog.js';

const prisma = new PrismaClient();

async function seed() {
  assertUniquePermissionKeys();

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description, module: permission.module },
      create: permission,
    });
  }

  for (const definition of ROLE_CATALOG) {
    const { permissions, ...roleData } = definition;
    const role = await prisma.role.upsert({
      where: { key: roleData.key },
      update: roleData,
      create: roleData,
    });

    for (const permissionKey of permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

seed()
  .then(() => console.log('Permisos y roles iniciales sincronizados.'))
  .finally(() => prisma.$disconnect());
