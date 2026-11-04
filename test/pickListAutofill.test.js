import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPickListEditorState, changePickListEditorField } from '../src/picklist/pickListAutofill.js';
import { addPickListItem, pickListBomRows, restorePickList } from '../src/picklist/pickList.js';
import { resolveCatalogCommercialFields } from '../src/catalog/resolveCatalogCommercialFields.js';

const catalog = new Map([
  ['22000132392', { ui: { title: 'COSTADO TERMINAL SENCILLO 60CM RECTANGULAR PINTADO KONCISA PLUS 2KSO330000' }, prices: { CO: 259350, USD: 0 } }],
]);
const change = (state, field, value, country = 'CO') => changePickListEditorField(state, field, value, catalog, country);

test('código comercial completa descripción y precio desde el catálogo del BOM', () => {
  const state = change(initialPickListEditorState(), 'codigo', '22000132392');
  assert.equal(state.form.descripcion, resolveCatalogCommercialFields('22000132392', catalog).description);
  assert.equal(state.form.precio, '259350');
  assert.deepEqual(state.origin, { descripcion: 'catalog', precio: 'catalog' });
});

test('precio no disponible queda vacío y se guarda como null', () => {
  const state = change(initialPickListEditorState(), 'codigo', '22000132392', 'USD');
  assert.ok(state.form.descripcion.startsWith('COSTADO TERMINAL'));
  assert.equal(state.form.precio, '');
  assert.equal(addPickListItem([], state.form)[0].precio, null);
});

test('código desconocido deja descripción y precio vacíos sin bloquear el ingreso manual', () => {
  const state = change(initialPickListEditorState(), 'codigo', 'ABC-PRUEBA-001');
  assert.equal(state.form.descripcion, '');
  assert.equal(state.form.precio, '');
  assert.equal(resolveCatalogCommercialFields('ABC-PRUEBA-001', catalog).price, null);
});

test('al cambiar de comercial a desconocido se limpian solo los datos autocompletados', () => {
  let state = change(initialPickListEditorState(), 'codigo', '22000132392');
  state = change(state, 'codigo', 'ABC-001');
  assert.equal(state.form.descripcion, '');
  assert.equal(state.form.precio, '');
});

test('al cambiar de desconocido a comercial se completan ambos datos', () => {
  let state = change(initialPickListEditorState(), 'codigo', 'ABC-001');
  state = change(state, 'codigo', '22000132392');
  assert.ok(state.form.descripcion.startsWith('COSTADO TERMINAL'));
  assert.equal(state.form.precio, '259350');
});

test('ediciones manuales de descripción y precio sobreviven a cambios irrelevantes', () => {
  let state = change(initialPickListEditorState(), 'codigo', '22000132392');
  state = change(state, 'descripcion', 'Texto del usuario');
  state = change(state, 'precio', '123');
  state = change(state, 'cantidad', '2');
  state = change(state, 'tipologia', 'KONCISA_1');
  assert.equal(state.form.descripcion, 'Texto del usuario');
  assert.equal(state.form.precio, '123');
  assert.deepEqual(state.origin, { descripcion: 'manual', precio: 'manual' });
});

test('edición de PickList existente aplica autocompletado al cambiar el código', () => {
  const existing = { codigo: 'ABC001', descripcion: 'Anterior', cantidad: 2, precio: null, tipologiaKey: 'KONCISA_1' };
  let state = initialPickListEditorState(existing);
  state = change(state, 'codigo', '22000132392');
  assert.equal(state.form.precio, '259350');
  assert.ok(state.form.descripcion.startsWith('COSTADO TERMINAL'));
  assert.equal(state.form.tipologia, 'KONCISA_1');
});

test('PickList autocompletado conserva origen, tipología, persistencia y valores del BOM', () => {
  let state = change(initialPickListEditorState(), 'codigo', '22000132392');
  state = change(state, 'tipologia', 'KONCISA_1');
  const item = addPickListItem([], state.form)[0];
  const restored = restorePickList(JSON.parse(JSON.stringify([item])))[0];
  const row = pickListBomRows([restored])[0];
  assert.equal(row.source, 'PICKLIST');
  assert.equal(row.tipologiaKey, 'KONCISA_1');
  assert.equal(row.description, state.form.descripcion);
  assert.equal(row.unitPrice, 259350);
});
