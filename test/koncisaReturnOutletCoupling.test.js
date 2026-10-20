import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let vite;
let buildKoncisaLeader;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ buildKoncisaLeader } = await vite.ssrLoadModule('/src/mepal/koncisaPlus/leader/KoncisaLeaderBuilder.js'));
});
after(async () => { await vite?.close(); });

for (const leaderSide of ['LEFT', 'RIGHT']) {
  for (const grommetPosition of ['LEFT', 'CENTER', 'RIGHT']) {
    test(`acople del retorno centrado y unido a la caja ${leaderSide} ${grommetPosition}`, () => {
      const product = buildKoncisaLeader({
        layoutType: 'LEADER',
        leaderSide,
        surfaceOverrides: {
          RETURN_SURFACE: {
            cableAccessType: 'GROMMET',
            grommetPosition,
            outletCouplingEnabled: true,
          },
        },
      });
      const box = product.parts.find((part) => part.meta?.leaderRole === 'RETURN_GROMMET_OUTLET_BOX');
      const coupling = product.parts.find((part) => part.meta?.leaderRole === 'RETURN_OUTLET_WALL_COUPLING');
      assert.equal(box?.code, '22000135010');
      assert.equal(coupling?.code, '22000137143');
      assert.equal(coupling.groupId, box.groupId);
      assert.equal(coupling.meta.targetSurfaceKey, box.meta.targetSurfaceKey);
      assert.equal(coupling.rotation.y, Math.PI / 2);
      // Con el giro, el borde interior del GLB queda sobre el costado +X de la caja.
      assert.ok(Math.abs((coupling.position.x + 2.6) - box.position.x) < 0.1);
      assert.ok(Math.abs((coupling.position.y - 42.5) - (box.position.y + 80.5)) < 0.1);
      assert.ok(Math.abs((coupling.position.z - 139.25) - (box.position.z - 223.1)) < 0.1);
    });
  }
}

test('al mover la caja del retorno, el acople conserva exactamente su desplazamiento', () => {
  const placement = (grommetPosition) => {
    const product = buildKoncisaLeader({
      layoutType: 'LEADER',
      leaderReturnLengthMm: 1200,
      surfaceOverrides: { RETURN_SURFACE: {
        cableAccessType: 'GROMMET', grommetPosition, outletCouplingEnabled: true,
      } },
    });
    return {
      box: product.parts.find((part) => part.meta?.leaderRole === 'RETURN_GROMMET_OUTLET_BOX'),
      coupling: product.parts.find((part) => part.meta?.leaderRole === 'RETURN_OUTLET_WALL_COUPLING'),
    };
  };
  const left = placement('LEFT');
  const right = placement('RIGHT');
  assert.notEqual(left.box.position.z, right.box.position.z);
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs((right.coupling.position[axis] - left.coupling.position[axis]) -
      (right.box.position[axis] - left.box.position[axis])) < 0.001);
  }
});
