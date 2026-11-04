import test from 'node:test';
import assert from 'node:assert/strict';
import { createPickListItem, addPickListItem, updatePickListItem, pickListBomRows, restorePickList, PICKLIST_HISTORY_TYPE } from '../src/picklist/pickList.js';
import { parsePickListJson, parsePickListXml, validatePickListImport } from '../src/picklist/pickListParser.js';
import { createHistoryManager } from '../src/history/historyManager.js';

test('modelo: campos obligatorios, valores por defecto y precio real cero', () => {
  const row = createPickListItem({ codigo: 'ABC123', descripcion: 'Perfil especial', cantidad: '', precio: '' }, 'one');
  assert.deepEqual(row, { id: 'one', codigo: 'ABC123', descripcion: 'Perfil especial', cantidad: 1, precio: null, tipologiaKey: null });
  assert.equal(createPickListItem({ codigo: 'A', descripcion: 'B', cantidad: 4, precio: 125000 }).precio, 125000);
  assert.equal(createPickListItem({ codigo: 'A', descripcion: 'B', precio: 0 }).precio, 0);
  assert.throws(() => createPickListItem({ codigo: 'A' }), /descripción/);
  assert.throws(() => createPickListItem({ descripcion: 'B' }), /código/);
  assert.throws(() => createPickListItem({ codigo: 'A', descripcion: 'B', cantidad: 0 }), /Cantidad/);
});

test('BOM: categoría propia, subtotal y ausencia de precio', () => {
  const priced = createPickListItem({ codigo: 'A', descripcion: 'A', cantidad: 2, precio: 100000 }, 'a');
  const unknown = createPickListItem({ codigo: 'B', descripcion: 'B' }, 'b');
  const [a, b] = pickListBomRows([priced, unknown]);
  assert.equal(a.category, 'PICKLIST');
  assert.equal(a.source, 'PICKLIST');
  assert.equal(a.groupId, b.groupId);
  assert.equal(a.total, 200000);
  assert.equal(b.unitPrice, null);
  assert.equal(b.total, null);
  assert.equal(b.priceAvailability.CO, false);
});

test('JSON: varios registros y nombres de propiedades sin distinguir mayúsculas', () => {
  const rows = parsePickListJson('[{"CODIGO":"A","Descripcion":"Uno"},{"codigo":"B","DESCRIPCION":"Dos","Cantidad":3,"PRECIO":20}]');
  const report = validatePickListImport(rows);
  assert.equal(report.found, 2);
  assert.equal(report.accepted[0].cantidad, 1);
  assert.equal(report.accepted[0].precio, null);
  assert.equal(report.accepted[1].cantidad, 3);
  assert.equal(report.accepted[1].precio, 20);
});

test('XML: estructura DataRecords/Record, campos existentes de XML comercial y errores por fila', () => {
  const nodes = [
    { children: [{ localName: 'CODIGO_PT', textContent: 'A' }, { localName: 'DESCRIPCION_LARGA', textContent: 'Uno' }] },
    { children: [{ localName: 'CODIGO_PT', textContent: 'B' }] },
    { children: [{ localName: 'Descripcion', textContent: 'Tres' }] },
  ];
  class Parser {
    parseFromString() { return { querySelector: () => null, querySelectorAll: () => nodes }; }
  }
  const rows = parsePickListXml('<DataRecords><Record/></DataRecords>', Parser);
  const report = validatePickListImport(rows);
  assert.equal(report.accepted.length, 1);
  assert.match(report.rejected[0], /Fila 2.*descripción/);
  assert.match(report.rejected[1], /Fila 3.*código/);
  assert.throws(() => parsePickListXml('<!DOCTYPE foo>', Parser), /no permitidas/);
});

test('duplicados se rechazan sin modificar la línea existente', () => {
  const original = createPickListItem({ codigo: 'ABC', descripcion: 'Original' }, 'a');
  assert.throws(() => addPickListItem([original], { codigo: 'abc', descripcion: 'Otra' }), /ya existe/);
  const report = validatePickListImport([{ codigo: 'ABC', descripcion: 'Otra' }, { codigo: 'NEW', descripcion: 'Nueva' }, { codigo: 'new', descripcion: 'Repetida' }], [original]);
  assert.equal(report.accepted.length, 1);
  assert.equal(report.rejected.length, 2);
  assert.equal(original.descripcion, 'Original');
});

test('edición, eliminación y restauración conservan datos e identidad', () => {
  const initial = addPickListItem([], { codigo: 'A', descripcion: 'Antes' });
  const edited = updatePickListItem(initial, initial[0].id, { descripcion: 'Después', cantidad: 4, precio: 50 });
  assert.equal(edited[0].id, initial[0].id);
  assert.equal(edited[0].descripcion, 'Después');
  assert.equal(edited[0].cantidad, 4);
  assert.equal(edited[0].precio, 50);
  assert.deepEqual(restorePickList(JSON.parse(JSON.stringify(edited))), edited);
  assert.deepEqual(edited.filter((item) => item.id !== edited[0].id), []);
});

test('historial global: undo y redo de agregar, editar y eliminar', async () => {
  let rows = [];
  const history = createHistoryManager({ replayAction: (action, direction) => {
    assert.equal(action.type, PICKLIST_HISTORY_TYPE);
    rows = direction === 'undo' ? action.before : action.after;
  } });
  const commit = (next) => { history.pushAction({ type: PICKLIST_HISTORY_TYPE, before: rows, after: next }); rows = next; };
  commit(addPickListItem(rows, { codigo: 'A', descripcion: 'Uno' }));
  await history.undo(); assert.equal(rows.length, 0);
  await history.redo(); assert.equal(rows.length, 1);
  commit(updatePickListItem(rows, rows[0].id, { cantidad: 3 }));
  await history.undo(); assert.equal(rows[0].cantidad, 1);
  await history.redo(); assert.equal(rows[0].cantidad, 3);
  commit([]);
  await history.undo(); assert.equal(rows.length, 1);
  await history.redo(); assert.equal(rows.length, 0);
});
