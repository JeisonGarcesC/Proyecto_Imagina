import test from 'node:test';
import assert from 'node:assert/strict';
import { assertUniquePermissionKeys, PERMISSION_CATALOG } from '../src/permissions/permissionCatalog.js';
import { hasPermission, resolveEffectivePermissions } from '../src/auth/permissionResolver.js';

test('las claves del catálogo son únicas', () => {
  assert.equal(assertUniquePermissionKeys(), true);
  assert.equal(new Set(PERMISSION_CATALOG.map(({ key }) => key)).size, PERMISSION_CATALOG.length);
});

test('los permisos de rol se conservan', () => {
  assert.equal(hasPermission({ rolePermissions: ['editor.object.move'] }, 'editor.object.move'), true);
});

test('ALLOW agrega una excepción de usuario', () => {
  const permissions = resolveEffectivePermissions({
    rolePermissions: [],
    overrides: [{ permissionKey: 'bom.view', effect: 'ALLOW' }],
  });
  assert.deepEqual(permissions, ['bom.view']);
});

test('DENY prevalece sobre ALLOW y permisos de rol', () => {
  const permissions = resolveEffectivePermissions({
    rolePermissions: ['bom.view'],
    overrides: [
      { permissionKey: 'bom.view', effect: 'ALLOW' },
      { permissionKey: 'bom.view', effect: 'DENY' },
    ],
  });
  assert.deepEqual(permissions, []);
});

test('un permiso ausente se deniega por defecto', () => {
  assert.equal(hasPermission({}, 'admin.users.write'), false);
});
