import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEditableKoncisaPartObject,
  isKoncisaAssemblyRoot,
  isKoncisaPhysicalEditableRoot,
} from '../src/mepal/koncisaPlus/utils/koncisaSelection.js';

function node(userData = {}, parent = null) {
  return { userData, parent };
}

test('resuelve el ducto físico antes del assembly lógico', () => {
  const assembly = node({ kind: 'KONCISA_PLUS_ASSEMBLY', isPartRoot: true });
  const duct = node({ kind: 'ducto', isPartRoot: true }, assembly);
  const submesh = node({}, duct);

  assert.equal(getEditableKoncisaPartObject(submesh), duct);
  assert.equal(isKoncisaAssemblyRoot(assembly), true);
  assert.equal(isKoncisaPhysicalEditableRoot(assembly), false);
});

test('resuelve superficies, costados, pantallas y grommets desde submeshes', () => {
  const cases = [
    { kind: 'SURFACE', category: 'superficies' },
    { kind: 'costado', category: 'costados' },
    { kind: 'PRIVACY_PANEL', category: 'pantallas' },
    { kind: 'grommet', category: 'grommets' },
  ];

  cases.forEach(({ kind, category }) => {
    const assembly = node({ kind: 'KONCISA_PLUS_ASSEMBLY' });
    const part = node({ kind, meta: { category }, isPartRoot: true }, assembly);
    assert.equal(getEditableKoncisaPartObject(node({}, part)), part);
  });
});

test('funciona con componentes Leader sin crear una ruta especial', () => {
  const assembly = node({ kind: 'KONCISA_PLUS_ASSEMBLY', layoutType: 'LEADER' });
  const leaderPart = node(
    { kind: 'GLB_PART', isPartRoot: true, meta: { leaderRole: 'CREDENZA' } },
    assembly
  );

  assert.equal(getEditableKoncisaPartObject(node({}, leaderPart)), leaderPart);
});

test('no convierte el assembly en pieza editable cuando no hay hijo físico', () => {
  const assembly = node({ kind: 'KONCISA_PLUS_ASSEMBLY', isPartRoot: true });
  assert.equal(getEditableKoncisaPartObject(assembly), null);
});

test('una pieza no Koncisa conserva su raíz física independiente', () => {
  const catalogRoot = node({ kind: 'ARES', isPartRoot: true });
  assert.equal(getEditableKoncisaPartObject(node({}, catalogRoot)), catalogRoot);
});
