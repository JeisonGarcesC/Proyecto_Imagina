import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_CATALOG } from '../src/roles/roleCatalog.js';
import { PERMISSION_CATALOG } from '../src/permissions/permissionCatalog.js';
import { reconcileFinishRolePermissions } from '../src/roles/reconcileFinishRolePermissions.js';

const finishKeys = PERMISSION_CATALOG.filter(({ module }) => module === 'finishes').map(({ key }) => key);

test('la matriz de roles concede acabados completos solo a ADMIN, DESIGNER y SUPERADMIN', () => {
  for (const role of ROLE_CATALOG) {
    const actual = role.permissions.filter((key) => key.startsWith('finishes.'));
    const expected = ['ADMIN', 'DESIGNER', 'SUPERADMIN'].includes(role.key) ? finishKeys : [];
    assert.deepEqual(actual, expected, role.key);
  }
});

test('el seed retira solo asignaciones antiguas de acabados de un rol sin acceso', async () => {
  const removed = [];
  const prisma = {
    permission: {
      findMany: async ({ where }) => {
        assert.deepEqual(where.key.in, finishKeys);
        return finishKeys.map((key, index) => ({ id: index + 1, key }));
      },
    },
    rolePermission: {
      deleteMany: async ({ where }) => removed.push(where),
    },
  };
  await reconcileFinishRolePermissions(prisma, { id: 7 }, []);
  assert.deepEqual(removed, [{ roleId: 7, permissionId: { in: [1, 2, 3, 4] } }]);
});

test('el seed no retira asignaciones de acabados de roles con acceso completo', async () => {
  const prisma = {
    permission: { findMany: async () => { throw new Error('No debe consultar'); } },
    rolePermission: { deleteMany: async () => { throw new Error('No debe borrar'); } },
  };
  await reconcileFinishRolePermissions(prisma, { id: 1 }, finishKeys);
});
