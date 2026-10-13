import test from 'node:test';
import assert from 'node:assert/strict';
import { getDuctosConfig } from '../src/mepal/koncisaPlus/rules/koncisaRules.js';
import { resolveKoncisaDucto, resolveKoncisaDuctSideModels } from '../src/mepal/koncisaPlus/rules/koncisaDuctoRules.js';

test('cada terminal estándar selecciona el GLB correspondiente a su lado', () => {
  for (const tipoPuesto of ['sencillo', 'doble']) {
    for (const [tipoPasoCable, prefix] of [
      ['grommet', tipoPuesto === 'sencillo' ? '2KSO348000' : '2KSO349000'],
      ['pasacable', tipoPuesto === 'sencillo' ? '2KSO368000' : '2KSO366000'],
    ]) {
      for (const widthMm of [1000, 1200, 1500]) {
        const config = getDuctosConfig({
          puestos: 2, tipoPuesto, largoRealMm: widthMm,
          anchoRealMm: tipoPuesto === 'doble' ? 1200 : 600,
          ductModes: ['TERMINAL', 'TERMINAL'], ductSides: ['LEFT', 'RIGHT'], tipoPasoCable,
        });
        assert.deepEqual(config.map((item) => item.side), ['LEFT', 'RIGHT']);
        const resolved = resolveKoncisaDucto({
          tipoPuesto, tipoModulo: 'terminal', nominalWidthMm: widthMm,
          accesoCableado: config[0].accesoCableado,
        });
        assert.match(resolved.modelSrcLeft, new RegExp(`${prefix}_${widthMm / 10}_IZQ\\.glb$`));
        assert.match(resolved.modelSrcRight, new RegExp(`${prefix}_${widthMm / 10}_DER\\.glb$`));
        const sideModels = resolveKoncisaDuctSideModels(resolved, tipoPuesto, 'terminal');
        if (tipoPuesto === 'doble') {
          assert.equal(sideModels.modelSrcLeft, resolved.modelSrcRight);
          assert.equal(sideModels.modelSrcRight, resolved.modelSrcLeft);
          assert.equal(config[0].x - config[0].baseX, config[1].x - config[1].baseX);
          assert.equal(config[0].rotY, config[1].rotY);
        } else {
          assert.equal(sideModels.modelSrcLeft, resolved.modelSrcLeft);
          assert.equal(sideModels.modelSrcRight, resolved.modelSrcRight);
          assert.notEqual(config[0].x - config[0].baseX, config[1].x - config[1].baseX);
        }
      }
    }
  }
});
