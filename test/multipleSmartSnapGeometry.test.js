import test from 'node:test';
import assert from 'node:assert/strict';
import { getMultipleConnectionPoints } from '../src/mepal/multiple/system/layout/MultipleConnectionResolver.js';
import { previewMultipleSnap } from '../src/mepal/multiple/system/layout/MultipleSnapEngine.js';
import { moveMultipleModule } from '../src/mepal/multiple/system/layout/MultipleSmartLayoutEngine.js';
import { MultipleSystem } from '../src/mepal/multiple/system/MultipleSystem.js';

const panel = (id, widthCm, x, rotation = 0) => ({ moduleId: id, instanceId: `${id}-instance`, config: { widthCm, heightCm: 242, thicknessCm: 8 }, position: { x, y: 0, z: 0 }, rotation: { y: rotation } });

for (const [firstWidth, secondWidth] of [[120, 120], [150, 120], [180, 150]]) {
  test(`extremos ${firstWidth} + ${secondWidth} se unen exactamente`, () => {
    const a = panel('a', firstWidth, 0);
    const b = panel('b', secondWidth, (firstWidth + secondWidth) / 200 + 0.2);
    const system = new MultipleSystem({ modules: [a, b] });
    const preview = previewMultipleSnap(b, [a]);
    assert.equal(preview.status, 'GREEN');
    assert.equal(preview.targetPoint, 'END');
    assert.equal(preview.sourcePoint, 'START');
    assert.equal(system.modules[1].position.x, b.position.x);
    moveMultipleModule(system, 'b', b.position);
    const end = getMultipleConnectionPoints(system.modules[0]).find((point) => point.id === 'END').position;
    const start = getMultipleConnectionPoints(system.modules[1]).find((point) => point.id === 'START').position;
    assert.ok(Math.abs(end[0] - start[0]) < 1e-12);
    assert.equal(end[1], start[1]);
    assert.equal(end[2], start[2]);
    assert.equal(system.modules[1].moduleId, 'b');
    assert.equal(system.modules[1].instanceId, 'b-instance');
    assert.equal(system.connections.length, 1);
  });
}

test('cada punto expone posición, dirección, normal y tipo', () => {
  const points = getMultipleConnectionPoints(panel('a', 120, 0));
  for (const point of points) {
    assert.equal(point.position.length, 3);
    assert.equal(point.direction.length, 3);
    assert.equal(point.normal.length, 3);
    assert.equal(point.connectionType, point.type);
  }
});

test('la posición final y la conexión sobreviven a la serialización', () => {
  const system = new MultipleSystem({ modules: [panel('a', 120, 0), panel('b', 120, 1.4)] });
  moveMultipleModule(system, 'b', system.modules[1].position);
  const restored = MultipleSystem.from(JSON.parse(JSON.stringify(system.toJSON())));
  assert.equal(restored.modules[1].position.x, 1.2);
  assert.equal(restored.connections.length, 1);
  assert.equal(restored.connections[0].from.point, 'END');
  assert.equal(restored.connections[0].to.point, 'START');
});
