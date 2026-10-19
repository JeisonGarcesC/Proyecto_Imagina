import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAresItems } from '../src/mepal/ares/catalog/aresLoader.js';
import { createAresInstance } from '../src/mepal/ares/factories/createAresInstance.js';

const codes = ['22000134845', '22000134846', '22000134847'];
const assetPath = (type, code, extension) =>
  fileURLToPath(new URL(`../public/assets/${type}/Ares/${code}.${extension}`, import.meta.url));

test('Ares variants have valid GLB and PNG asset headers', () => {
  for (const code of codes) {
    const glb = readFileSync(assetPath('models', code, 'glb'));
    const png = readFileSync(assetPath('imagen', code, 'png'));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF');
    assert.equal(glb.readUInt32LE(8), glb.length);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  assert.notDeepEqual(
    readFileSync(assetPath('imagen', codes[1], 'png')),
    readFileSync(assetPath('imagen', codes[2], 'png')),
  );
});

test('Ares lists all available sizes with prices isolated by price list', async () => {
  const originalFetch = globalThis.fetch;
  const originalDOMParser = globalThis.DOMParser;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return { ok: true, text: async () => url.includes('EUC') ? 'EUC' : 'CO' };
  };
  globalThis.DOMParser = class {
    parseFromString(list) {
      const base = list === 'EUC' ? 100 : 1000;
      return {
        querySelectorAll: () => codes.map((code, index) => ({
          querySelector: (field) => ({
            textContent: {
              Codigo: code,
              Descripcion: `ARES ${index + 1}`,
              Precio: String(base + index),
              UDM: 'und',
            }[field],
          }),
        })),
      };
    }
  };
  try {
    const colombia = await loadAresItems('CO');
    const ecuador = await loadAresItems('EUC');
    assert.deepEqual(colombia.map((item) => item.codigo), codes);
    assert.deepEqual(ecuador.map((item) => item.codigo), codes);
    assert.deepEqual(colombia.map((item) => item.precio), [1000, 1001, 1002]);
    assert.deepEqual(ecuador.map((item) => item.precio), [100, 101, 102]);
    assert.equal((await loadAresItems('CO'))[2].precio, 1002);
    assert.equal(requested.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.DOMParser = originalDOMParser;
  }
});

test('Ares factory preserves product code and one BOM line per instance', async () => {
  for (const code of codes) {
    const object = { userData: {} };
    const result = await createAresInstance({
      codigoPT: code,
      country: 'CO',
      getProductDefinition: async () => ({
        codigoPT: code,
        modelSources: [`/assets/models/Ares/${code}.glb`],
        commercialData: { descripcion: `ARES ${code}`, precio: 10, prices: { CO: 10 } },
      }),
      loadGlb: async (sources) => {
        assert.deepEqual(sources, [`/assets/models/Ares/${code}.glb`]);
        return { scene: object };
      },
    });
    assert.equal(result.partRecord.code, code);
    assert.equal(object.userData.kind, 'ARES');
    assert.deepEqual(object.userData.aresParts.map(({ code, qty }) => [code, qty]), [[code, 1]]);
  }
});
