import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildKuoAV } from '../src/mepal/kuoAV/builder/KuoAVBuilder.js';
import { buildKuoAVBOM } from '../src/mepal/kuoAV/bom/kuoAVBOMCatalog.js';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

function getVertebras(built) {
  return built.parts.filter((part) => part.type === 'vertebra');
}

test('KUO AV permite desactivar la vértebra sin incluirla en el BOM', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraEnabled: false,
    vertebraLateral: true,
  });

  assert.equal(getVertebras(built).length, 0);
  assert.equal(buildKuoAVBOM(built).some((item) => item.lookupTag.includes('KUAC650000')), false);
});

test('KUO AV selecciona la vértebra central con escala física 1:1', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraEnabled: true,
    vertebraLateral: false,
  });
  const [vertebra] = getVertebras(built);

  assert.equal(vertebra.logicalCode, 'KUAC650000');
  assert.match(vertebra.model.src, /KUAC650000\.glb$/);
  assert.deepEqual(vertebra.position, { x: 35, y: 25, z: -250 });
  assert.deepEqual(vertebra.scale, { x: 1, y: 1, z: 1 });
});

test('KUO AV selecciona y factura la vértebra lateral calibrada', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraEnabled: true,
    vertebraLateral: true,
  });
  const [vertebra] = getVertebras(built);
  const bomItem = buildKuoAVBOM(built).find(
    (item) => item.lookupTag === 'KUAC650000_ALT_LAT'
  );

  assert.match(vertebra.model.src, /KUAC650000_LAT 1\.glb$/);
  assert.deepEqual(vertebra.position, { x: -285, y: 430.9, z: -248 });
  assert.equal(vertebra.meta.isLateral, true);
  assert.equal(bomItem.code, '22000116690');
  assert.equal(bomItem.qty, 1);
});

test('configuraciones legacy conservan la presencia anterior de la vértebra', () => {
  assert.equal(getVertebras(buildKuoAV({ vertebraLateral: true })).length, 1);
  assert.equal(getVertebras(buildKuoAV({ vertebraLateral: false })).length, 0);
});

test('KUO AV Doble controla ambas vértebras de forma independiente', () => {
  const leftOnly = buildKuoAVDoble({
    vertebraLeftEnabled: true,
    vertebraRightEnabled: false,
  });
  const vertebras = getVertebras(leftOnly);

  assert.equal(vertebras.length, 1);
  assert.equal(vertebras[0].role, 'VERTEBRA_LEFT');
  assert.equal(vertebras[0].codigo, '22000116690');
  assert.equal(leftOnly.config.vertebraLeftEnabled, true);
  assert.equal(leftOnly.config.vertebraRightEnabled, false);
});

test('factory clona recursos GLB y conserva metadatos de la vértebra lateral', async () => {
  const source = new THREE.Group();
  const sourceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  source.add(sourceMesh);

  const result = await createKuoAVInstance({
    config: {
      instanceId: 'KUOAV_TEST',
      anchoMm: 1200,
      profundidadMm: 600,
      vertebraEnabled: true,
      vertebraLateral: true,
      acabadoGrommet: 'NONE',
    },
    loadGlb: async () => source,
  });
  const vertebra = result.object.children.find(
    (child) => child.userData.lookupTag === 'KUAC650000_ALT_LAT'
  );
  const clonedMesh = vertebra.children[0];

  assert.ok(vertebra);
  assert.equal(vertebra.userData.instanceId, 'KUOAV_TEST');
  assert.equal(vertebra.userData.parentAssemblyId, 'KUOAV_TEST');
  assert.notEqual(clonedMesh.geometry, sourceMesh.geometry);
  assert.notEqual(clonedMesh.material, sourceMesh.material);
  assert.equal(clonedMesh.material.opacity, 1);
  assert.equal(vertebra.rotation.y, Math.PI);
});

test('BOM estándar resuelve códigos SAP facturables y una sola unidad del kit fuente', () => {
  const bom = buildKuoAVBOM(
    buildKuoAV({
      anchoMm: 1200,
      profundidadMm: 600,
      thickMm: 30,
      espesor: 'Formica 30',
      kitFuente: true,
      kitFuenteColor: 'Blanco',
      vertebraEnabled: true,
      vertebraLateral: true,
      acabadoGrommet: 'ALUMINIUM',
    })
  );
  const byCode = new Map(bom.map((item) => [item.code, item]));

  for (const code of [
    '22024327',
    '22000116690',
    '22000134911',
    '22000116338',
    '22000126680',
    '22000128083',
    '22000128084',
    '22000008989',
    '22000116693',
    '22000023626',
  ]) {
    assert.ok(byCode.has(code), `Falta código SAP ${code}`);
  }
  assert.equal(byCode.get('22000126680').qty, 1);
  assert.equal(byCode.get('22000128083').qty, 1);
  assert.equal(byCode.get('22000128084').qty, 1);
});

test('BOM selecciona códigos SAP por ancho, material, color y acabado', () => {
  const bom = buildKuoAVBOM(
    buildKuoAV({
      anchoMm: 1500,
      profundidadMm: 600,
      thickMm: 30,
      espesorTipo: 'Melamina 30',
      kitFuente: true,
      kitFuenteColor: 'Negro',
      vertebraEnabled: false,
      acabadoGrommet: 'BLACK',
    })
  );
  const codes = new Set(bom.map((item) => item.code));

  assert.ok(codes.has('22000134910'));
  assert.ok(codes.has('22000116336'));
  assert.ok(codes.has('22000114425'));
  assert.ok(codes.has('22000126681'));
  assert.ok(codes.has('22000116523'));
  assert.equal(codes.has('22000116690'), false);
});
