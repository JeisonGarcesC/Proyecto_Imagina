import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePickListCsv, parsePickListJson, parsePickListXml, validatePickListImport } from '../src/picklist/pickListParser.js';
import { generatePickListTemplate } from '../src/picklist/pickListTemplates.js';
import { selectProjectTypologyKeys } from '../src/picklist/pickListTypologies.js';
import { createPickListItem, updatePickListItem, pickListBomRows, restorePickList, PICKLIST_HISTORY_TYPE } from '../src/picklist/pickList.js';
import { appendPickListBomGroups } from '../src/picklist/pickListBomGroups.js';
import { shouldShowBomCategoryHeading } from '../src/components/bomCategoryHeading.js';
import { createHistoryManager } from '../src/history/historyManager.js';

const KONCISA_KEY = 'KONCISA_1793825704082_A5CE75';
const MILA_KEY = 'MILA_123456_ABCDEF';
const roots = [
  { userData: { kind: 'KONCISA_PLUS_ASSEMBLY', groupId: KONCISA_KEY } },
  { userData: { kind: 'MILA_ASSEMBLY', groupId: MILA_KEY } },
  { userData: { kind: 'VETRO_PRODUCT', groupId: 'VETRO_COMMERCIAL' } },
  { userData: { kind: 'PART', groupId: 'ACADEMIA' } },
];
const keys = selectProjectTypologyKeys(roots);

class RecordParser {
  parseFromString(xml) {
    const nodes = Array.from(xml.matchAll(/<Record>([\s\S]*?)<\/Record>/g), (record) => ({
      children: Array.from(record[1].matchAll(/<([A-Z_]+)>([\s\S]*?)<\/\1>/g), (field) => ({
        localName: field[1], textContent: field[2],
      })),
    }));
    return { querySelector: () => null, querySelectorAll: () => nodes };
  }
}

test('selector: sin raíces muestra solo Sin tipología; con raíces usa sus llaves y excluye catálogo', () => {
  assert.deepEqual(selectProjectTypologyKeys([]), []);
  assert.deepEqual(selectProjectTypologyKeys([roots[0]]), [KONCISA_KEY]);
  assert.deepEqual(keys, [KONCISA_KEY, MILA_KEY]);
  assert.ok(!keys.includes('ACADEMIA'));
  assert.ok(!keys.includes('VETRO_COMMERCIAL'));
  assert.ok(!keys.includes('ARES'));
});

test('CSV: importa solo llaves de proyecto, advierte desconocidas y admite comas, vacíos y decimales', () => {
  const csv = `codigo,descripcion,cantidad,precio,tipologia\r\nA,"Perfil, especial",2.5,125000.75,${KONCISA_KEY}\r\nB,Herraje,,,NO_EXISTE\r\nC,,1,,\r\n`;
  const report = validatePickListImport(parsePickListCsv(csv), [], keys);
  assert.equal(report.accepted.length, 2);
  assert.equal(report.accepted[0].tipologiaKey, KONCISA_KEY);
  assert.equal(report.accepted[0].descripcion, 'Perfil, especial');
  assert.equal(report.accepted[0].cantidad, 2.5);
  assert.equal(report.accepted[0].precio, 125000.75);
  assert.equal(report.accepted[1].tipologiaKey, null);
  assert.equal(report.accepted[1].cantidad, 1);
  assert.equal(report.accepted[1].precio, null);
  assert.match(report.warnings[0], /NO_EXISTE/);
  assert.match(report.rejected[0], /Fila 4.*descripción/);
});

test('plantillas CSV, JSON y XML se reimportan con llave de proyecto y sin ella', () => {
  for (const key of [KONCISA_KEY, null]) {
    const parse = {
      csv: (text) => parsePickListCsv(text),
      json: (text) => parsePickListJson(text),
      xml: (text) => parsePickListXml(text, RecordParser),
    };
    const reports = ['csv', 'json', 'xml'].map((format) =>
      validatePickListImport(parse[format](generatePickListTemplate(format, key)), [], keys));
    for (const report of reports) {
      assert.equal(report.accepted.length, 3);
      assert.equal(report.rejected.length, 0);
      assert.equal(report.warnings.length, 0);
      assert.equal(report.accepted[2].tipologiaKey, key);
    }
  }
});

test('JSON y XML leen tipologia como llave; una llave ausente no crea tipología', () => {
  const json = parsePickListJson(JSON.stringify([{ codigo: 'J', descripcion: 'JSON', tipologia: KONCISA_KEY }]));
  assert.equal(validatePickListImport(json, [], keys).accepted[0].tipologiaKey, KONCISA_KEY);
  const xml = `<DataRecords><Record><CODIGO_PT>X</CODIGO_PT><DESCRIPCION_LARGA>XML</DESCRIPCION_LARGA><TIPOLOGIA>${KONCISA_KEY}</TIPOLOGIA></Record></DataRecords>`;
  assert.equal(validatePickListImport(parsePickListXml(xml, RecordParser), [], keys).accepted[0].tipologiaKey, KONCISA_KEY);
  assert.equal(validatePickListImport([{ codigo: 'N', descripcion: 'N', tipologia: 'ARES' }], [], keys).accepted[0].tipologiaKey, null);
});

test('BOM: sin llave queda PICKLIST; con llave muestra solo TIPOLOGÍA - llave y conserva origen', () => {
  const plain = createPickListItem({ codigo: 'A', descripcion: 'Sin grupo' }, 'a');
  const typed = createPickListItem({ codigo: 'B', descripcion: 'Con grupo', tipologiaKey: KONCISA_KEY }, 'b');
  const rows = pickListBomRows([plain, typed]);
  assert.ok(rows.every((row) => row.source === 'PICKLIST' && row.category === 'PICKLIST'));
  assert.equal(rows[1].tipologiaKey, KONCISA_KEY);
  const groups = appendPickListBomGroups([], rows, 'typology');
  assert.deepEqual(groups.map((group) => group.label), ['PICKLIST', `TIPOLOGÍA - ${KONCISA_KEY}`]);
  assert.ok(rows.every((row) => !shouldShowBomCategoryHeading({ groupMode: 'typology', row, index: 0 })));
  const commercial = { key: `T:${KONCISA_KEY}`, label: 'Koncisa Plus', items: [{ code: 'REAL', source: 'CATALOG' }] };
  const grouped = appendPickListBomGroups([commercial], [rows[1]], 'classification');
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped[0].items.map((row) => row.source), ['CATALOG']);
  assert.deepEqual(grouped[1].items.map((row) => row.source), ['PICKLIST']);
});

test('edición, persistencia antigua y Undo/Redo conservan la llave', async () => {
  const initial = restorePickList([{ id: 'a', codigo: 'A', descripcion: 'Antigua' }]);
  assert.equal(initial[0].tipologiaKey, null);
  let rows = initial;
  const history = createHistoryManager({ replayAction: (action, direction) => {
    assert.equal(action.type, PICKLIST_HISTORY_TYPE);
    rows = direction === 'undo' ? action.before : action.after;
  } });
  const commit = (next) => { history.pushAction({ type: PICKLIST_HISTORY_TYPE, before: rows, after: next }); rows = next; };
  commit(updatePickListItem(rows, 'a', { tipologiaKey: KONCISA_KEY }));
  assert.equal(rows[0].tipologiaKey, KONCISA_KEY);
  assert.deepEqual(restorePickList(JSON.parse(JSON.stringify(rows))), rows);
  await history.undo(); assert.equal(rows[0].tipologiaKey, null);
  await history.redo(); assert.equal(rows[0].tipologiaKey, KONCISA_KEY);
  commit(updatePickListItem(rows, 'a', { tipologiaKey: null }));
  assert.equal(pickListBomRows(rows)[0].groupName, 'PICKLIST');
  await history.undo(); assert.equal(rows[0].tipologiaKey, KONCISA_KEY);
});
