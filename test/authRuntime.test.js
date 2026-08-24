import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRestoreApiSession } from '../src/auth/authRuntime.js';

test('la inicialización DEV no restaura una sesión API', () => {
  assert.equal(shouldRestoreApiSession({ DEV: true, PROD: false }), false);
});

test('la inicialización de producción restaura la sesión API', () => {
  assert.equal(shouldRestoreApiSession({ DEV: false, PROD: true }), true);
});
