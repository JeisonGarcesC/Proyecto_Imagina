import assert from 'node:assert/strict';
import test from 'node:test';
import { parseXmlBom, xmlBomRows } from '../src/importers/xmlBomImporter.js';

class FixtureParser {
  parseFromString(text) {
    if (text === 'malformed') return { querySelector: () => ({}), documentElement: null };
    const records = Array.from(text.matchAll(/<Record>([\s\S]*?)<\/Record>/g), ([, body]) => {
      const value = (tag) => body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1];
      return { tagName: 'Record', children: ['CODIGO_PT', 'CANTIDAD'].flatMap((tag) => {
        const content = value(tag);
        return content === undefined ? [] : [{ tagName: tag, textContent: content }];
      }) };
    });
    return { querySelector: () => null, documentElement: {
      tagName: text.startsWith('<DataRecords>') ? 'DataRecords' : 'Other', children: records,
    } };
  }
}

const xml = (records) => `<DataRecords>${records.map(([code, qty, extra = '']) =>
  `<Record><CODIGO_PT>${code}</CODIGO_PT><CANTIDAD>${qty}</CANTIDAD>${extra}</Record>`).join('')}</DataRecords>`;

test('XML BOM agrupa códigos repetidos, conserva texto y solo usa código/cantidad', () => {
  const parsed = parseXmlBom(xml([
    ['22000127935', '27', '<ATTRIBUTE8>999999</ATTRIBUTE8>'],
    ['22000127935', '4'], ['LP18550XS', '8'],
  ]), 'SIESA PISO', FixtureParser);
  assert.equal(parsed.recordCount, 3);
  assert.deepEqual(parsed.lines, [{ code: '22000127935', qty: 31 }, { code: 'LP18550XS', qty: 8 }]);
  const catalog = new Map([['22000127935', { raw: { descLarga: 'Producto conocido' }, prices: { CO: 120 } }]]);
  const rows = xmlBomRows([{ ...parsed, id: 'project-1' }], catalog);
  assert.equal(rows[0].total, 3720);
  assert.equal(rows[0].description, 'Producto conocido');
  assert.equal(rows[0].groupName, 'PROYECTO: SIESA PISO');
  assert.deepEqual([rows[1].code, rows[1].unitPrice, rows[1].total], ['LP18550XS', 0, 0]);
  assert.deepEqual(xmlBomRows(JSON.parse(JSON.stringify([{ ...parsed, id: 'project-1' }])), catalog), rows);
});

test('XML BOM valida nombre, estructura, registros y cantidades', () => {
  assert.throws(() => parseXmlBom(xml([['A', '1']]), '', FixtureParser), /nombre/);
  assert.throws(() => parseXmlBom('', 'Proyecto', FixtureParser), /vacío/);
  assert.throws(() => parseXmlBom('malformed', 'Proyecto', FixtureParser), /mal formado/);
  assert.throws(() => parseXmlBom('<DataRecords></DataRecords>', 'Proyecto', FixtureParser), /Record/);
  assert.throws(() => parseXmlBom(xml([['', '1']]), 'Proyecto', FixtureParser), /CODIGO_PT/);
  for (const qty of ['-2', 'abc', '0', 'Infinity']) {
    assert.throws(() => parseXmlBom(xml([['A', qty]]), 'Proyecto', FixtureParser), /CANTIDAD/);
  }
  assert.throws(() => parseXmlBom('<!DOCTYPE x><DataRecords/>', 'Proyecto', FixtureParser), /no permitidas/);
  assert.equal(parseXmlBom(xml([['A', '1,5']]), 'Proyecto', FixtureParser).lines[0].qty, 1.5);
});

test('filas XML y assetRef conviven sin alterar las entidades 3D', () => {
  const project = { entities: [{ kind: 'IMPORTED_MODEL', metadata: { assetRef: 'asset-1' } }],
    xmlBomProjects: [{ id: 'xml-1', name: 'Proyecto', lines: [{ code: 'A', qty: 2 }] }] };
  const entitiesBefore = JSON.stringify(project.entities);
  assert.equal(xmlBomRows(project.xmlBomProjects, new Map()).length, 1);
  assert.equal(JSON.stringify(project.entities), entitiesBefore);
});
