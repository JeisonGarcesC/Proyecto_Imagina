import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group } from 'three';
import { completeVetroCatalog } from '../src/catalog/buildCatalogFromXml.js';
import { createVetroDoorAssemblyFromConfig, createVetroAssemblyFromEntity } from '../src/mepal/vetro/assembly/vetroAssembly.js';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { getVetroAssemblyCommercialMembers } from '../src/mepal/vetro/bom/vetroAssemblyBOM.js';
import { serializeVetroAssembly } from '../src/core/persistence/entitySerializers.js';

function catalogFor(codes) {
  const xml = fs.readFileSync(new URL('../public/data/xml/PriceList_CO_2.xml', import.meta.url), 'utf8');
  const found = new Map(codes.map((code) => {
    const start = xml.indexOf(`<Codigo>${code}</Codigo>`);
    assert.ok(start >= 0, `missing ${code}`);
    const article = xml.slice(start, xml.indexOf('</Articulo>', start));
    return [code, {
      description: article.match(/<Descripcion>([^<]+)<\/Descripcion>/)?.[1],
      price: Number(article.match(/<Precio>([^<]+)<\/Precio>/)?.[1]),
    }];
  }));
  const items = completeVetroCatalog([], { CO: new Map([...found].map(([code, item]) => [code, item.price])), EUC: new Map(), USD: new Map() },
    new Map([...found].map(([code, item]) => [code, item.description])));
  return new Map(items.map((item) => [item.codigoPT, item]));
}

test('documented wall arrival kit retains its own catalog description and price', async () => {
  const kit = await createVetroInstance({ config: { category: 'PROFILES', subcategory: 'VERTICAL', productType: 'PROFILE', variant: 'WALL_ARRIVAL_KIT', nominalLengthCm: 204, finish: 'ANODIZED' } });
  assert.equal(kit.success, true);
  const code = kit.object.userData.code;
  assert.equal(code, '22000017673');
  const item = catalogFor([code]).get(code);
  assert.ok(item.ui.title);
  assert.ok(item.prices.CO > 0);
  assert.equal(kit.object.userData.excludeFromBOM, false);
});

for (const [variant, expected] of [
  ['SINGLE', ['22000017677', '22000010922', '22013883']],
  ['DOUBLE', ['22000017681', '22000032909', '22013883']],
]) {
  test(`${variant} assembly contributes one frame, one leaf and one floor stop to the commercial BOM`, async () => {
    const scene = new Group();
    const created = await createVetroDoorAssemblyFromConfig({ category: 'DOORS', productType: 'DOOR_LEAF', variant, nominalHeightCm: 204 }, scene);
    assert.equal(created.success, true, created.reason);
    const root = created.object;
    const rows = getVetroAssemblyCommercialMembers(root);
    assert.deepEqual(rows.map((row) => row.code), expected);
    assert.deepEqual(rows.map((row) => row.quantity), [1, 1, 1]);
    assert.equal(getVetroAssemblyCommercialMembers(created.frameInstance.object).length, 0);
    assert.equal(root.userData.code, undefined);
    const catalog = catalogFor(expected);
    for (const row of rows) {
      const item = catalog.get(row.code);
      assert.ok(item?.ui?.title, row.code);
      assert.ok(item.prices.CO > 0, row.code);
    }
    const restored = await createVetroAssemblyFromEntity(serializeVetroAssembly(root));
    assert.equal(restored.success, true);
    assert.deepEqual(getVetroAssemblyCommercialMembers(restored.object).map((row) => row.code), expected);
  });
}
