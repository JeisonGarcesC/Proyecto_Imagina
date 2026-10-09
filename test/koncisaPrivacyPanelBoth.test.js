import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('KONCISA PLUS crea pantallas laterales y frontales juntas con sus acabados y ubicaciones propios', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { createKoncisaPlusInstance } = await server.ssrLoadModule('/src/mepal/koncisaPlus/factories/createKoncisaPlusInstance.js');
    const panels = [];
    const group = { userData: {}, updateMatrixWorld() {} };
    const api = {
      createKoncisaPlusAssemblyGroup: () => group,
      addKoncisaPrivacyPanel: async (panel) => { panels.push(panel); },
      selectObject() {},
    };
    const config = {
      puestos: 1, tipoPuesto: 'sencillo', largoRealMm: 1200, anchoRealMm: 600,
      largoCobroMm: 1200, anchoCobroMm: 600, thickMm: 30,
      privacyPanel: { enabled: true, tipo: 'lateral' },
      privacyPanels: [
        { enabled: true, tipo: 'lateral', material: 'formica', finishCode: '22008689',
          privacyPanelFinishId: 'PANEL_LATERAL_FORMICA_22008689', heightMm: 300,
          lateralPlacementMode: 'ALL_BOUNDARIES' },
        { enabled: true, tipo: 'frontal', material: 'melamina', finishCode: '22008556',
          privacyPanelFinishId: 'PANEL_FRONTAL_MELAMINA_22008556', heightMm: 300 },
      ],
    };
    await createKoncisaPlusInstance({ api, config, providedParts: [], providedGroupId: 'TEST' });
    assert.ok(panels.some((panel) => panel.tipo === 'lateral'));
    assert.ok(panels.some((panel) => panel.tipo === 'frontal'));
    assert.ok(panels.filter((panel) => panel.tipo === 'lateral').every((panel) => panel.finishCode === '22008689'));
    assert.ok(panels.filter((panel) => panel.tipo === 'frontal').every((panel) => panel.finishCode === '22008556'));
    assert.ok(panels.every((panel) => panel.parentGroup === group));
    assert.notDeepEqual(
      panels.filter((panel) => panel.tipo === 'lateral').map((panel) => [panel.x, panel.z]),
      panels.filter((panel) => panel.tipo === 'frontal').map((panel) => [panel.x, panel.z])
    );
    panels.length = 0;
    await createKoncisaPlusInstance({ api, config: { ...config, privacyPanels: undefined },
      providedParts: [], providedGroupId: 'TEST_LEGACY' });
    assert.ok(panels.length > 0 && panels.every((panel) => panel.tipo === 'lateral'));
  } finally {
    await server.close();
  }
});
