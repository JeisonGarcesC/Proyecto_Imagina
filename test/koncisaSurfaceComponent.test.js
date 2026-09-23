import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createKoncisaSurfaceConfigPatch,
  getKoncisaSurfaceComponentConfig,
  getKoncisaSurfaceKey,
} from '../src/mepal/koncisaPlus/rules/koncisaSurfaceComponentRules.js';

const baseConfig = {
  puestos: 2,
  tipoPuesto: 'sencillo',
  tipoCostado: 'RECT',
  largoRealMm: 1200,
  anchoRealMm: 600,
  largoCobroMm: 1200,
  anchoCobroMm: 600,
  tipoPasoCable: 'none',
  finishCode: '22008689',
  thickMm: 25,
  variant: '',
  hasDuct: false,
};

test('Koncisa genera claves estables para superficies estándar y líder', () => {
  assert.equal(getKoncisaSurfaceKey({ moduleIndex: 0 }), 'SURFACE_0');
  assert.equal(getKoncisaSurfaceKey({ moduleIndex: 1 }), 'SURFACE_1');
  assert.equal(getKoncisaSurfaceKey({ meta: { leaderRole: 'MAIN' } }), 'MAIN_SURFACE');
  assert.equal(getKoncisaSurfaceKey({ meta: { leaderRole: 'RETURN' } }), 'RETURN_SURFACE');
});

test('acabado, espesor y acceso de cables se guardan únicamente para la superficie elegida', () => {
  const config = createKoncisaSurfaceConfigPatch(baseConfig, 'SURFACE_1', {
    finishId: 'FORMICA_30',
    cableAccessType: 'PASACABLE',
    grommetFinish: 'PAINTED',
    pasacablePosition: 'RIGHT',
  });
  assert.equal(config.surfaceOverrides.SURFACE_0, undefined);
  assert.deepEqual(config.surfaceOverrides.SURFACE_1, {
    finishId: 'FORMICA_30',
    cableAccessType: 'PASACABLE',
    grommet: false,
    pasacable: true,
    grommetFinish: 'PAINTED',
    grommetPosition: 'CENTER',
    pasacablePosition: 'RIGHT',
  });
  assert.equal(config.thickMm, 25);
  assert.equal(config.tipoPasoCable, 'none');
});

test('normalización rechaza valores arbitrarios y produce estado serializable', () => {
  const config = getKoncisaSurfaceComponentConfig({ surfaceOverrides: {
    SURFACE_0: { finishId: 'NO_EXISTE', cableAccessType: 'GROMMET', pasacablePosition: 'INVALID' },
  } }, 'SURFACE_0', { finishCode: '22008689', thickMm: 25, variant: '' });
  assert.equal(config.finishId, 'FORMICA_25');
  assert.equal(config.grommetPosition, 'CENTER');
  assert.equal(config.pasacablePosition, 'CENTER');
  assert.equal(config.cableAccessType, 'GROMMET');
  assert.deepEqual(JSON.parse(JSON.stringify(config)), config);
});

test('el grommet siempre queda centrado y solo el pasacable admite posición lateral', () => {
  const grommet = getKoncisaSurfaceComponentConfig({ surfaceOverrides: {
    SURFACE_0: { cableAccessType: 'GROMMET', grommetPosition: 'RIGHT' },
  } }, 'SURFACE_0', baseConfig);
  const pasacable = getKoncisaSurfaceComponentConfig({ surfaceOverrides: {
    SURFACE_0: { cableAccessType: 'PASACABLE', pasacablePosition: 'LEFT' },
  } }, 'SURFACE_0', baseConfig);
  assert.equal(grommet.grommetPosition, 'CENTER');
  assert.equal(grommet.grommet, true);
  assert.equal(pasacable.pasacablePosition, 'LEFT');
  assert.equal(pasacable.pasacable, true);
});

test('la extensión contextual de Koncisa no importa módulos LINK', () => {
  for (const file of [
    '../src/mepal/koncisaPlus/rules/koncisaSurfaceComponentRules.js',
    '../src/components/properties/koncisaPlusCarpetaProperties/KoncisaSurfaceProperties.jsx',
  ]) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /mepal\/link|linkCarpetaProperties/i);
  }
});

test('builders de Koncisa consumen los overrides sin lógica LINK', () => {
  for (const file of [
    '../src/mepal/koncisaPlus/builders/KoncisaPlusBuilder.js',
    '../src/mepal/koncisaPlus/leader/KoncisaLeaderBuilder.js',
  ]) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /getKoncisaSurfaceComponentConfig/);
    assert.doesNotMatch(source, /mepal\/link|linkCarpetaProperties/i);
  }
});
