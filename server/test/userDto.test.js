import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicUser } from '../src/users/userDto.js';

test('el DTO público nunca serializa passwordHash', () => {
  const dto = toPublicUser({ id: '1', username: 'user', passwordHash: 'secret-hash' });
  assert.deepEqual(dto, { id: '1', username: 'user' });
  assert.equal(JSON.stringify(dto).includes('passwordHash'), false);
});
