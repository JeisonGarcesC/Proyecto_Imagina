import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMilaScreenBomBreakdown } from '../src/mepal/mila/config/milaTunables.js';
import { createMilaAccessoryInstance } from '../src/mepal/mila/factories/createMilaAccessoryInstance.js';

test('resolveMilaScreenBomBreakdown usa los códigos reales del accesorio y descompone 4 como dos paneles de 2', () => {
  assert.deepEqual(resolveMilaScreenBomBreakdown(1), [
    { code: '22000127941', qty: 1 },
  ]);

  assert.deepEqual(resolveMilaScreenBomBreakdown(2), [
    { code: '22000129109', qty: 1 },
  ]);

  assert.deepEqual(resolveMilaScreenBomBreakdown(3), [
    { code: '22000129112', qty: 1 },
  ]);

  assert.deepEqual(resolveMilaScreenBomBreakdown(4), [
    { code: '22000129109', qty: 2 },
  ]);
});

test('createMilaAccessoryInstance preserva cantidad y código correcto para pantalla en la ruta del botón', async () => {
  const seen = [];
  const api = {
    addExternalGlbPart: async (part) => {
      seen.push(part);
      return part;
    },
  };

  await createMilaAccessoryInstance({ api, config: { accessoryType: 'screen-3p' } });

  assert.equal(seen.length, 1);
  assert.equal(seen[0].code, '22000129112');
  assert.equal(seen[0].meta.quantity, 3);
  assert.equal(seen[0].extraUserData.quantity, 3);
});

test('createMilaScreenPart crea un solo GLB W2P integrado por cantidad (sin duplicar paneles laterales)', async () => {
  const { createMilaScreenPart } = await import('../src/mepal/mila/builders/MilaBuilder.js');
  const parts = createMilaScreenPart({
    groupId: 'g1',
    groupName: 'Mila',
    variant: { line: 'MILA', category: 'mila', label: 'Mila', codePrefix: 'MILA' },
    quantity: 1,
    moduleSpacingMm: 600,
  });

  assert.equal(parts.length, 1);
  assert.equal(parts[0].meta.role, 'screen');
  assert.equal(parts[0].code, '22000127941');
});

test('createMilaScreenPart ancla la pantalla al puesto y no la empuja al fondo del eje Z', async () => {
  const { createMilaScreenPart } = await import('../src/mepal/mila/builders/MilaBuilder.js');
  const parts = createMilaScreenPart({
    groupId: 'g1',
    groupName: 'Mila',
    variant: { line: 'MILA', category: 'mila', label: 'Mila', codePrefix: 'MILA' },
    quantity: 2,
    moduleSpacingMm: 600,
  });

  assert.equal(parts.length, 1);
  assert.equal(parts[0].position.x, 300);
  assert.equal(parts[0].position.y, 0);
  assert.equal(parts[0].position.z, -720);
  assert.equal(parts[0].code, '22000129109');
});
