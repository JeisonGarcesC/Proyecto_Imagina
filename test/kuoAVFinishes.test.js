import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { usesKuoAVPropertyFinishes, getKuoAVSurfaceTargets } from '../src/mepal/kuoAV/materials/kuoAVFinish.js';

test('Kuo property finishes recognize assemblies, component records and mesh ancestors only', () => {
  for (const kind of ['KUO_AV_ASSEMBLY', 'KUO_AV_DOBLE_ASSEMBLY']) {
    const root = new THREE.Group();
    root.userData.kind = kind;
    const mesh = new THREE.Mesh();
    root.add(mesh);
    assert.equal(usesKuoAVPropertyFinishes(mesh), true);
    assert.equal(usesKuoAVPropertyFinishes({ kind }), true);
  }
  assert.equal(usesKuoAVPropertyFinishes({ parentAssemblyId: 'KUOAV_123' }), true);
  assert.equal(usesKuoAVPropertyFinishes({ instanceId: 'KUOAVD_123__FOOT_LEFT' }), true);
  assert.equal(usesKuoAVPropertyFinishes({ kind: 'KONCISA_PLUS_ASSEMBLY' }), false);
  assert.equal(usesKuoAVPropertyFinishes(null), false);
});

test('Kit Fuente colors only motor columns and preserves fixed supports and source materials', async () => {
  const source = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x123456 });
  source.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material));
  for (const factory of [createKuoAVInstance, createKuoAVDobleInstance]) {
    const variants = [];
    for (const [color, hex] of [['Blanco', 0xffffff], ['Negro', 0x1e1e1e], ['Gris', 0x707070]]) {
      const { object } = await factory({
        config: { kitFuente: true, kitFuenteColor: color, acabadoParales: 'Negro' },
        loadGlb: async () => source,
      });

      const columns = object.children.filter((child) =>
        child.userData.partType === 'kit_fuente' || child.userData.name?.startsWith('Paral Elevable'));
      assert.ok(columns.length >= 2);
      for (const column of columns) {
        assert.equal(column.children[0].material.color.getHex(), hex);
      }
      const fixed = object.children.filter((child) => !columns.includes(child));
      variants.push(fixed.map((part) => {
        const colors = [];
        part.traverse((mesh) => {
          if (mesh.isMesh) {
            for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              if (mat?.color) colors.push(mat.color.getHex());
            }
          }
        });
        return colors;
      }));
      assert.equal(material.color.getHex(), 0x123456);
      assert.ok(columns.every((part) => part.children[0].material !== material));
    }
    assert.deepEqual(variants[1], variants[0]);
    assert.deepEqual(variants[2], variants[0]);
  }
});

test('catalog finishes target only tops and survive serialized reconstruction', async (t) => {
  t.mock.method(THREE.TextureLoader.prototype, 'load', () => new THREE.Texture());
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  const colors = (part) => {
    const result = [];
    part.traverse((mesh) => {
      if (mesh.isMesh) result.push(mesh.material.color.getHex());
    });
    return result;
  };
  for (const factory of [createKuoAVInstance, createKuoAVDobleInstance]) {
    const { object } = await factory({
      config: { kitFuente: true }, loadGlb: async () => source,
    });
    const tops = getKuoAVSurfaceTargets(object);
    assert.ok(tops.length > 0);
    assert.deepEqual(getKuoAVSurfaceTargets(object, tops[0]), [tops[0]]);
    assert.deepEqual(getKuoAVSurfaceTargets(tops[0]), [tops[0]]);
    assert.deepEqual(getKuoAVSurfaceTargets(tops[0], null, 'ALL'), tops);
    const fixed = object.children.find((child) => !tops.includes(child));
    assert.deepEqual(getKuoAVSurfaceTargets(fixed), []);
    const role = tops[0].userData.role;
    const config = JSON.parse(JSON.stringify({
      ...object.userData.config,
      surfaceFinishes: {
        [role]: { materialCode: 'KUO_TEST_RED', materialDef: { code: 'KUO_TEST_RED', rgbValue: '255_0_0' } },
      },
    }));
    const { object: rebuilt } = await factory({
      config: { ...config, kitFuenteColor: 'Gris', anchoMm: 1500 }, loadGlb: async () => source,
    });
    const rebuiltTops = getKuoAVSurfaceTargets(rebuilt);
    const changed = rebuiltTops.find((top) => top.userData.role === role);
    assert.equal(changed.userData.materialCode, 'KUO_TEST_RED');
    assert.ok(colors(changed).every((color) => color === 0xff0000));
    for (const other of rebuiltTops.filter((top) => top !== changed)) {
      assert.ok(colors(other).every((color) => color !== 0xff0000));
    }
    assert.deepEqual(rebuilt.userData.config.surfaceFinishes, config.surfaceFinishes);
  }
});
