import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevSession, DEV_USER_OPTIONS } from '../src/auth/devAuth.js';

const expected = [
  ['admin', 'Administrador', 'administrador'],
  ['diseno', 'Diseño', 'diseno'],
  ['comercial', 'Comercial', 'comercial'],
];

test('expone las tres opciones de desarrollo esperadas', () => {
  assert.deepEqual(
    DEV_USER_OPTIONS.map(({ username, label }) => [username, label]),
    expected.map(([username, label]) => [username, label])
  );
});

for (const [username, label, role] of expected) {
  test(`crea una sesión local compatible para ${username}`, () => {
    const session = createDevSession(username);
    assert.deepEqual(session.roles, [role]);
    assert.deepEqual(session.permissions, []);
    assert.equal(session.user.username, username);
    assert.equal(session.user.displayName, label);
    assert.equal(session.user.status, 'ACTIVE');
    assert.equal('password' in session.user, false);
  });
}

test('rechaza usuarios de desarrollo desconocidos', () => {
  assert.equal(createDevSession('unknown'), null);
});
