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

test('KUO AV siempre incluye la vértebra central aunque una configuración antigua la desactive', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraEnabled: false,
    vertebraLateral: false,
  });

  assert.equal(getVertebras(built).length, 1);
  assert.equal(getVertebras(built)[0].logicalCode, 'KUAC650000');
  assert.equal(buildKuoAVBOM(built).some((item) => item.lookupTag === 'KUAC650000'), true);
});

test('KUO AV selecciona la vértebra central con escala física 1:1', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraLateral: false,
  });
  const [vertebra] = getVertebras(built);

  assert.equal(vertebra.logicalCode, 'KUAC650000');
  assert.match(vertebra.model.src, /KUAC650000\.glb$/);
  assert.deepEqual(vertebra.position, { x: 35, y: 25, z: -250 });
  assert.deepEqual(vertebra.scale, { x: 1, y: 1, z: 1 });
});

test('factory orienta la vértebra central hacia el interior bajo la mesa', async () => {
  const source = new THREE.Group();
  source.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial()
    )
  );
  const result = await createKuoAVInstance({
    config: {
      instanceId: 'KUOAV_CENTRAL_TEST',
      anchoMm: 1200,
      profundidadMm: 600,
      vertebraLateral: false,
      acabadoGrommet: 'NONE',
    },
    loadGlb: async () => source,
  });
  const vertebra = result.object.children.find(
    (child) => child.userData.lookupTag === 'KUAC650000'
  );

  assert.ok(vertebra);
  assert.equal(vertebra.position.x, 0.035);
  assert.equal(vertebra.position.z, -0.25);
  assert.equal(vertebra.rotation.y, Math.PI);
});

test('KUO AV selecciona y factura la vértebra lateral calibrada', () => {
  const built = buildKuoAV({
    anchoMm: 1200,
    profundidadMm: 600,
    vertebraLateral: true,
  });
  const [vertebra] = getVertebras(built);
  const bomItem = buildKuoAVBOM(built).find(
    (item) => item.lookupTag === 'KUAC650000'
  );

  assert.match(vertebra.model.src, /KUAC650000_LAT 1\.glb$/);
  assert.deepEqual(vertebra.position, { x: -285, y: 430.9, z: -248 });
  assert.equal(vertebra.meta.isLateral, true);
  assert.equal(bomItem.code, '22000116690');
  assert.equal(bomItem.qty, 1);
});

test('vertebraLateral únicamente conmuta entre la variante central y lateral', () => {
  assert.equal(getVertebras(buildKuoAV({ vertebraLateral: true })).length, 1);
  assert.equal(getVertebras(buildKuoAV({ vertebraLateral: false })).length, 1);
  assert.equal(getVertebras(buildKuoAV({}))[0].logicalCode, 'KUAC650000');
  assert.equal(
    getVertebras(buildKuoAV({ vertebraLateral: true }))[0].logicalCode,
    'KUAC650000_ALT_LAT'
  );
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
      vertebraLateral: false,
      acabadoGrommet: 'BLACK',
    })
  );
  const codes = new Set(bom.map((item) => item.code));

  assert.ok(codes.has('22000134910'));
  assert.ok(codes.has('22000116336'));
  assert.ok(codes.has('KUO150060RECT2'));
  assert.ok(codes.has('22000126681'));
  assert.ok(codes.has('22000116523'));
  assert.equal(codes.has('22000116690'), true);
});

test('BOM KUO AV 120x60 Formica 30 blanco sin checks usa códigos y total base confirmados', () => {
  const bom = buildKuoAVBOM(
    buildKuoAV({
      anchoMm: 1200,
      profundidadMm: 600,
      thickMm: 30,
      espesorTipo: 'Formica 30',
      kitFuente: true,
      kitFuenteColor: 'Blanco',
      elevarKitFIzquierdo: false,
      vertebraLateral: false,
      acabadoGrommet: 'ALUMINIUM',
      especial: false,
    })
  );
  const byCode = new Map(bom.map((item) => [item.code, item]));
  const total = bom.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);

  assert.equal(total, 7878150);
  assert.equal(byCode.get('22000008989')?.category, 'SUPERFICIE');
  assert.equal(byCode.get('22000023626')?.category, 'GROMMET');
  assert.equal(byCode.get('22000134911')?.lookupTag, 'KUOCABLEDUCTTER120');
});

test('BOM KUO AV 120x60 con grommet pintado sube a $7,923,300', () => {
  const bom = buildKuoAVBOM(
    buildKuoAV({
      anchoMm: 1200,
      profundidadMm: 600,
      thickMm: 30,
      espesorTipo: 'Formica 30',
      kitFuente: true,
      kitFuenteColor: 'Blanco',
      acabadoGrommet: 'PAINTED',
    })
  );
  const byCode = new Map(bom.map((item) => [item.code, item]));
  const total = bom.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);

  assert.equal(total, 7923300);
  assert.equal(byCode.get('22000116523')?.category, 'KIT TAPA TOMA');
  assert.equal(byCode.get('22000116523')?.lookupTag, 'KONGROMMET4TOMAS-PAINTED');
});

test('BOM KUO AV melamina 30 todo seleccionado usa KUO120060RECT2 sin precio de superficie', () => {
  const bom = buildKuoAVBOM(
    buildKuoAV({
      anchoMm: 1200,
      profundidadMm: 600,
      thickMm: 30,
      espesorTipo: 'Melamina 30',
      kitFuente: true,
      kitFuenteColor: 'Blanco',
      acabadoGrommet: 'PAINTED',
      especial: true,
      elevarKitFIzquierdo: true,
      vertebraLateral: true,
    })
  );
  const byCode = new Map(bom.map((item) => [item.code, item]));
  const total = bom.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);

  assert.equal(total, 7396200);
  assert.equal(byCode.has('22000008989'), false);
  assert.equal(byCode.get('KUO120060RECT2')?.lookupTag, 'KUO120060RECT2-22008689');
  assert.equal(byCode.get('KUO120060RECT2')?.category, '-');
});

test('BOM KUO AV respeta colores blanco, negro y gris del kit fuente', () => {
  const baseConfig = {
    anchoMm: 1200,
    profundidadMm: 600,
    thickMm: 30,
    espesorTipo: 'Formica 30',
    kitFuente: true,
    acabadoGrommet: 'PAINTED',
    especial: true,
    elevarKitFIzquierdo: true,
    vertebraLateral: true,
  };

  const blanco = buildKuoAVBOM(buildKuoAV({ ...baseConfig, kitFuenteColor: 'Blanco' }));
  const negro = buildKuoAVBOM(buildKuoAV({ ...baseConfig, kitFuenteColor: 'Negro' }));
  const gris = buildKuoAVBOM(buildKuoAV({ ...baseConfig, kitFuenteColor: 'Gris' }));
  const totalGris = gris.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.qty || 0), 0);

  assert.ok(new Set(blanco.map((item) => item.code)).has('22000126680'));
  assert.ok(new Set(negro.map((item) => item.code)).has('22000126681'));
  assert.ok(new Set(gris.map((item) => item.code)).has('22000128023'));
  assert.equal(totalGris, 10467450);
});

test('variantes seleccionables de superficie tienen código SAP confirmado', () => {
  for (const anchoMm of [1200, 1500, 1650]) {
    for (const profundidadMm of [600, 750]) {
      const [surface] = buildKuoAVBOM(
        buildKuoAV({
          anchoMm,
          profundidadMm,
          thickMm: 30,
          espesorTipo: 'Formica 30',
          acabadoGrommet: 'NONE',
        })
      ).filter((item) => item.type === 'superficie');

      assert.match(surface.code, /^\d{11}$/, `${anchoMm}x${profundidadMm}`);
    }
  }
});
