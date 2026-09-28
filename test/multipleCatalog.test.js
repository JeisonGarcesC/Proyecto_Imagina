import test from 'node:test';
import assert from 'node:assert/strict';
import { MULTIPLE_COMMERCIAL_CATALOG } from '../src/mepal/multiple/catalog/multipleCommercialCatalog.generated.js';

test('catálogo MULTIPLE conserva códigos exactos y clasificación comercial', () => {
  assert.equal(MULTIPLE_COMMERCIAL_CATALOG.length, 474);
  assert.ok(MULTIPLE_COMMERCIAL_CATALOG.every((entry) => /^\d+$/.test(entry.codigoPT)));
  assert.ok(MULTIPLE_COMMERCIAL_CATALOG.some((entry) => entry.type === 'FRAME' && entry.description.startsWith('MARCO PANEL')));
  assert.ok(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.type === 'TILE').every((entry) => entry.description.startsWith('BALDOSA')));
  assert.ok(MULTIPLE_COMMERCIAL_CATALOG.filter((entry) => entry.type === 'DOOR_FRAME').every((entry) => entry.description.startsWith('MARCO PUERTA')));
  assert.ok(MULTIPLE_COMMERCIAL_CATALOG.some((entry) => entry.codigoPT === '22191200878' && entry.type === 'TILE'
    && entry.material === 'TELA' && entry.variant === 'GAMA_1' && entry.width === 90 && entry.height === 38));
});
