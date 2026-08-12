import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCanRemoveActiveSuperadmin } from '../src/roles/lastSuperadminGuard.js';

test('impide retirar al último SUPERADMIN activo', () => {
  assert.throws(
    () => assertCanRemoveActiveSuperadmin({ targetIsActiveSuperadmin: true, activeSuperadminCount: 1 }),
    { code: 'LAST_SUPERADMIN_REQUIRED' }
  );
});

test('permite operar si permanece otro SUPERADMIN activo', () => {
  assert.equal(assertCanRemoveActiveSuperadmin({ targetIsActiveSuperadmin: true, activeSuperadminCount: 2 }), true);
});
