import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth/passwordService.js';

test('hash y verificación de contraseña', async () => {
  const hash = await hashPassword('correct-horse-battery-staple', 4);
  assert.notEqual(hash, 'correct-horse-battery-staple');
  assert.equal(await verifyPassword(hash, 'correct-horse-battery-staple'), true);
  assert.equal(await verifyPassword(hash, 'incorrecta'), false);
});
