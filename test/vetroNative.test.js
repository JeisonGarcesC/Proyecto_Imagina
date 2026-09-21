import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVetroInstance } from '../src/mepal/vetro/factories/createVetroInstance.js';
import { registerVetroInstance } from '../src/mepal/vetro/integration/vetroRegistration.js';

const create = (config, options = {}) => createVetroInstance({ config, ...options });
const names = (root) => {
  const result = [];
  root.traverse((node) => result.push(node.name));
  return result;
};
const box = (root) => new THREE.Box3().setFromObject(root);

test('panel vidrio usa ancho real, espesor tecnico y base Y cero', async () => {
  const result = await create({ productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 60, nominalHeightCm: 204 });
  const bounds = box(result.object);
  assert.equal(result.object.userData.renderStatus, 'NATIVE_AVAILABLE');
  assert.equal(result.object.userData.visualSource, 'NATIVE');
  assert.ok(Math.abs((bounds.max.x - bounds.min.x) - 0.597) < 1e-6);
  assert.ok(Math.abs((bounds.max.z - bounds.min.z) - 0.01) < 1e-6);
  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  const glass = result.object.getObjectByName('PANEL_BODY');
  assert.equal(glass.material.type, 'MeshPhysicalMaterial');
  assert.ok(glass.material.transmission > 0.7);
  assert.equal(glass.material.depthWrite, false);
  assert.ok(result.object.getObjectByName('GLASS_POLISHED_EDGES'));
  assert.equal(result.object.userData.codigoPT, '22000009775');
});

test('F100 conserva variante comercial y marca espesor visual aproximado', async () => {
  const a = await create({ productType: 'PANEL', material: 'COMPACT_FORMICA_F100', nominalWidthCm: 30, nominalHeightCm: 204 });
  const b = await create({ productType: 'PANEL', material: 'COMPACT_BOARD_FORMICA_F100', nominalWidthCm: 30, nominalHeightCm: 204 });
  assert.notEqual(a.object.userData.codigoPT, b.object.userData.codigoPT);
  assert.ok(a.object.userData.approximationFlags.includes('F100_VISUAL_THICKNESS_MM'));
  assert.ok(a.object.userData.diagnostics.some((item) => item.code === 'VETRO_NATIVE_DIMENSION_APPROXIMATED'));
});

test('puertas separan ancho comercial y dimensiones visuales', async () => {
  const single = await create({ productType: 'DOOR_LEAF', variant: 'SINGLE', nominalHeightCm: 204 });
  const double = await create({ productType: 'DOOR_LEAF', variant: 'DOUBLE', nominalHeightCm: 204 });
  const singleNative = single.object.children[0];
  const doubleNative = double.object.children[0];
  assert.equal(singleNative.userData.commercialDimensionsMm.widthMm, 900);
  assert.ok(singleNative.userData.visualLeafDimensionsMm.widthMm < 900);
  assert.equal(doubleNative.userData.commercialDimensionsMm.widthMm, 1800);
  assert.equal(names(double.object).filter((name) => name.startsWith('DOOR_LEAF_')).length, 2);
  assert.ok(doubleNative.userData.visualLeafDimensionsMm.gapMm > 0);
});

test('marco mantiene tres perfiles, agrega ducto condicional y nunca crea inferior', async () => {
  const plain = await create({ productType: 'DOOR_FRAME', variant: 'SINGLE_WITHOUT_DUCT', nominalHeightCm: 204, finish: 'ANODIZED' });
  const duct = await create({ productType: 'DOOR_FRAME', variant: 'DOUBLE_WITH_DUCT', nominalHeightCm: 204, finish: 'PAINTED' });
  assert.deepEqual(['FRAME_LEFT', 'FRAME_RIGHT', 'FRAME_TOP'].every((name) => names(plain.object).includes(name)), true);
  assert.equal(names(plain.object).includes('DUCT'), false);
  assert.equal(names(duct.object).includes('DUCT'), true);
  assert.equal(names(duct.object).includes('FRAME_BOTTOM'), false);
  const painted = duct.object.getObjectByName('FRAME_LEFT');
  assert.equal(painted.userData.materialRole, 'PAINTED_ALUMINUM');
});

test('kits, perfiles y accesorios generan proporciones documentadas', async () => {
  const kit = await create({ productType: 'JUNCTION_KIT', variant: 'JOIN_T' });
  const vertical = await create({ productType: 'PROFILE', subcategory: 'VERTICAL', variant: 'WALL_ARRIVAL_KIT', nominalLengthCm: 204, finish: 'ANODIZED' });
  const horizontal = await create({ productType: 'PROFILE', subcategory: 'HORIZONTAL', variant: 'TOP_KIT', nominalLengthCm: 300, finish: 'PAINTED' });
  const accessory = await create({ productType: 'ACCESSORY', variant: 'FLOATING_JOIN_90' });
  assert.ok(names(kit.object).includes('PROFILE_BRANCH_OPPOSITE'));
  assert.ok(Math.abs((box(vertical.object).max.y - box(vertical.object).min.y) - 2.04) < 1e-6);
  assert.ok(Math.abs((box(horizontal.object).max.x - box(horizontal.object).min.x) - 3) < 1e-6);
  assert.ok(names(accessory.object).includes('ACCESSORY_BODY'));
});

test('accesorio sin dimensiones documentadas declara aproximacion visual', async () => {
  const result = await create({ productType: 'ACCESSORY', variant: 'DOOR_LOCK_REPLACEMENT' });
  assert.ok(result.object.userData.approximationFlags.includes('DOOR_LOCK_VISUAL_SIZE_MM'));
  assert.ok(result.object.userData.diagnostics.some((item) => item.code === 'VETRO_NATIVE_DIMENSION_APPROXIMATED'));
});

test('GLB tiene prioridad sobre renderer nativo', async () => {
  const visual = new THREE.Group();
  visual.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  const result = await create(
    { productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 60, nominalHeightCm: 204 },
    { assetRegistry: [{ code: '22000009775', assetPath: '/assets/models/Vetro/test.glb' }], loadAsset: async () => visual }
  );
  assert.equal(result.object.userData.renderStatus, 'ASSET_AVAILABLE');
  assert.equal(result.object.userData.visualSource, 'GLB');
  assert.equal(names(result.object).includes('PANEL_BODY'), false);
});

test('registro seleccionable agrega solamente la raiz VETRO a pickables', async () => {
  const instance = await create({ productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: 60, nominalHeightCm: 204 });
  const parent = new THREE.Group();
  const parts = [];
  const pickables = [];
  registerVetroInstance({ instance, parent, partsRegistry: parts, pickables });
  assert.equal(pickables.length, 1);
  assert.equal(pickables[0], instance.object);
  assert.equal(pickables[0].userData.kind, 'VETRO_PRODUCT');
  assert.equal(instance.object.userData.shape2D.semanticType, 'VETRO_PANEL');
});
