import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapSuperadmin } from '../src/roles/bootstrapSuperadminService.js';

test('bootstrap crea primer SUPERADMIN usando el rol sembrado', async () => {
  let created;
  const db = {
    userRole: { count: async () => 0 },
    role: { findUnique: async () => ({ id: 'role-1', enabled: true }) },
    user: { create: async ({ data }) => (created = data, { id: 'u1', username: data.username }) },
  };
  const result = await bootstrapSuperadmin({ db, username: 'Root', email: 'root@example.com', displayName: 'Root', password: 'correct-horse-battery-staple' });
  assert.equal(result.username, 'root');
  assert.equal(created.roles.create.roleId, 'role-1');
  assert.notEqual(created.passwordHash, 'correct-horse-battery-staple');
});

test('bootstrap rechaza si ya existe SUPERADMIN activo', async () => {
  const db = { userRole: { count: async () => 1 } };
  await assert.rejects(
    bootstrapSuperadmin({ db, username: 'x', email: 'x@example.com', displayName: 'x', password: 'correct-horse-battery-staple' }),
    { code: 'SUPERADMIN_ALREADY_EXISTS' }
  );
});
