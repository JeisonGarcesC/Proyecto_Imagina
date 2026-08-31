import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFinishAppearance2D,
  resolveFinishStyle2D,
  resolveMaterialColor2D,
  rgbValueToHex,
} from '../src/plan2d/finishAppearance2D.js';

const materials = new Map([
  ['specific-yellow', { code: 'specific-yellow', groupCode: 'generic-formica', rgbValue: '245_244_3' }],
  ['specific-dark', { code: 'specific-dark', groupCode: 'generic-formica', rgbValue: '13_13_13' }],
  ['without-rgb', { code: 'without-rgb', groupCode: 'generic-formica', rgbValue: '' }],
]);

test('resuelve materialCode mediante la definición existente', () => {
  assert.deepEqual(resolveMaterialColor2D('specific-yellow', materials), {
    materialCode: 'specific-yellow',
    resolvedColor: '#F5F403',
    source: 'catalog',
  });
});

test('convierte los RGB del catálogo a hexadecimal serializable', () => {
  assert.equal(rgbValueToHex('245_244_3'), '#F5F403');
  assert.equal(rgbValueToHex('13_13_13'), '#0D0D0D');
});

test('el material del mesh tiene prioridad sobre root y finishes', () => {
  const result = resolveFinishAppearance2D(
    {
      meshMaterialCode: 'specific-dark',
      rootMaterialCode: 'specific-yellow',
      finishMaterialCode: 'specific-yellow',
    },
    materials
  );
  assert.equal(result.materialCode, 'specific-dark');
  assert.equal(result.resolvedColor, '#0D0D0D');
});

test('materialCode específico tiene prioridad y finishCode genérico no se resuelve', () => {
  const result = resolveFinishAppearance2D(
    { rootMaterialCode: 'specific-yellow', finishMaterialCode: 'generic-formica' },
    materials
  );
  assert.equal(result.materialCode, 'specific-yellow');
  assert.equal(result.resolvedColor, '#F5F403');
});

test('permite múltiples apariencias independientes y serializables', () => {
  const appearances = [
    resolveFinishAppearance2D({ componentKey: 'surface', meshMaterialCode: 'specific-yellow' }, materials),
    resolveFinishAppearance2D({ componentKey: 'side', meshMaterialCode: 'specific-dark' }, materials),
  ];
  assert.deepEqual(appearances.map((item) => item.componentKey), ['surface', 'side']);
  assert.doesNotThrow(() => JSON.stringify({ appearances }));
  assert.equal(JSON.stringify(appearances).includes('isMesh'), false);
});

test('no inventa color cuando el material no contiene RGB', () => {
  assert.equal(resolveMaterialColor2D('without-rgb', materials), null);
});

test('usa el color visible verificable como fallback de GLB o procedural', () => {
  const result = resolveFinishAppearance2D({ visibleColor: '#abcdef', opacity: 0.45 }, materials);
  assert.deepEqual(result, {
    componentKey: null,
    semanticType: null,
    materialCode: null,
    resolvedColor: '#ABCDEF',
    source: 'visible-material',
    opacity: 0.45,
  });
});

test('OFF conserva exactamente el estilo base', () => {
  const base = { fill: false, fillColor: '#111111', fillOpacity: 0.2, stroke: '#222222' };
  assert.deepEqual(
    resolveFinishStyle2D(base, { resolvedColor: '#F5F403', opacity: 0.7 }, false),
    base
  );
});

test('ON aplica color y opacidad sin alterar el estilo de origen', () => {
  const base = { fill: false, fillColor: '#111111', stroke: '#222222' };
  const result = resolveFinishStyle2D(base, { resolvedColor: '#F5F403', opacity: 0.7 }, true);
  assert.deepEqual(result, {
    fill: true,
    fillEnabled: true,
    fillColor: '#F5F403',
    fillOpacity: 0.7,
    stroke: '#222222',
  });
  assert.deepEqual(base, { fill: false, fillColor: '#111111', stroke: '#222222' });
});

test('una cimbra conserva su estilo aunque Acabados esté ON', () => {
  const base = { fill: true, fillColor: '#ff0000', stroke: '#ff0000' };
  assert.deepEqual(
    resolveFinishStyle2D(base, { resolvedColor: '#F5F403' }, true, 'cimbra'),
    base
  );
});

