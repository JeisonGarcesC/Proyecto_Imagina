import test from 'node:test';
import assert from 'node:assert/strict';
import { issueAccessToken, verifyAccessToken } from '../src/auth/tokenService.js';

const options = { secret: '0123456789abcdef0123456789abcdef', issuer: 'test', audience: 'test' };
const user = { id: 'user-1', username: 'user', tokenVersion: 3 };

test('access token válido contiene identidad mínima', () => {
  const payload = verifyAccessToken(issueAccessToken(user, { ...options, expiresIn: '1m' }), options);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.tokenVersion, 3);
  assert.equal(payload.permissions, undefined);
});

test('access token expirado es rechazado', () => {
  const token = issueAccessToken(user, { ...options, expiresIn: -1 });
  assert.throws(() => verifyAccessToken(token, options), { name: 'TokenExpiredError' });
});
