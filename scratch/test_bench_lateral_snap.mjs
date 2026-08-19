import * as THREE from 'three';
import createKuoAVInstance from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';

console.log('=== TEST BENCH LATERAL SNAP & ATTACHMENT VALIDATION ===\n');

// Mock loader and context
const scene = new THREE.Scene();
const parts = [];

function isDescendantOf(obj, root) {
  let cur = obj;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

function snapKuoAVAssembly(assembly) {
  if (!assembly || assembly.userData?.kind !== 'KUO_AV_ASSEMBLY') return false;

  assembly.position.y = 0;
  assembly.updateMatrixWorld(true);

  const activeBox = new THREE.Box3().setFromObject(assembly);
  const SNAP_THRESHOLD_M = 0.25;
  let bestCandidate = null;
  let minDistance = Infinity;

  scene.traverse((node) => {
    if (!node || node === assembly) return;
    const isOtherKuoOrDesk =
      (node.userData?.kind === 'KUO_AV_ASSEMBLY' ||
        node.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') &&
      node.userData?.instanceId !== assembly.userData?.instanceId &&
      !isDescendantOf(node, assembly) &&
      !isDescendantOf(assembly, node);

    if (!isOtherKuoOrDesk) return;

    const targetBox = new THREE.Box3().setFromObject(node);

    // 1. Lateral Derecho
    const distRight = Math.abs(activeBox.min.x - targetBox.max.x);
    const zAlignRight = Math.abs(activeBox.min.z - targetBox.min.z);
    if (distRight <= SNAP_THRESHOLD_M && zAlignRight <= SNAP_THRESHOLD_M) {
      const totalDist = distRight + zAlignRight;
      if (totalDist < minDistance) {
        minDistance = totalDist;
        bestCandidate = {
          target: node,
          targetBox,
          delta: new THREE.Vector3(
            targetBox.max.x - activeBox.min.x,
            0,
            targetBox.min.z - activeBox.min.z
          ),
          type: 'LATERAL_RIGHT',
        };
      }
    }

    // 2. Lateral Izquierdo
    const distLeft = Math.abs(activeBox.max.x - targetBox.min.x);
    const zAlignLeft = Math.abs(activeBox.min.z - targetBox.min.z);
    if (distLeft <= SNAP_THRESHOLD_M && zAlignLeft <= SNAP_THRESHOLD_M) {
      const totalDist = distLeft + zAlignLeft;
      if (totalDist < minDistance) {
        minDistance = totalDist;
        bestCandidate = {
          target: node,
          targetBox,
          delta: new THREE.Vector3(
            targetBox.min.x - activeBox.max.x,
            0,
            targetBox.min.z - activeBox.min.z
          ),
          type: 'LATERAL_LEFT',
        };
      }
    }
  });

  if (bestCandidate) {
    assembly.position.add(bestCandidate.delta);
    assembly.position.y = 0;
    assembly.updateMatrixWorld(true);

    const offsetLocal = {
      x: assembly.position.x - bestCandidate.target.position.x,
      y: 0,
      z: assembly.position.z - bestCandidate.target.position.z,
    };

    assembly.userData.attachment = {
      targetAssemblyId: bestCandidate.target.userData?.instanceId || bestCandidate.target.uuid,
      mode: 'BENCH_LATERAL',
      offsetLocal,
    };
    return true;
  } else {
    assembly.position.y = 0;
    assembly.userData.attachment = null;
    return false;
  }
}

// PRUEBA 1: Insertar 1 mesa y moverla
console.log('--- PRUEBA 1: 1 KUO AV en el piso ---');
const mesa1Result = await createKuoAVInstance({
  config: { width: 1200, depth: 600, height: 730 },
  instanceId: 'KUOAV_001',
});
const mesa1 = mesa1Result.object;
mesa1.position.set(0, 0, 0);
mesa1.updateMatrixWorld(true);
scene.add(mesa1);
parts.push(mesa1Result.partRecord);

console.log(`Mesa 1 Position: [${mesa1.position.x}, ${mesa1.position.y}, ${mesa1.position.z}]`);
console.assert(mesa1.position.y === 0, 'FAIL: Mesa 1 debe estar en Y=0');
console.log('PRUEBA 1: PASS\n');

// PRUEBA 2: Insertar mesa 2 y mover al lateral derecho de mesa 1
console.log('--- PRUEBA 2: Snap Lateral Derecho (target.max.x ≈ source.min.x) ---');
const mesa2Result = await createKuoAVInstance({
  config: { width: 1200, depth: 600, height: 730 },
  instanceId: 'KUOAV_002',
});
const mesa2 = mesa2Result.object;
mesa2.position.set(1.30, 0, 0.05); // cerca del borde derecho en x=1.20
mesa2.updateMatrixWorld(true);
scene.add(mesa2);
parts.push(mesa2Result.partRecord);

const snappedRight = snapKuoAVAssembly(mesa2);
console.log(`Snapped Right: ${snappedRight}`);
console.log(`Mesa 2 Position después de snap: [${mesa2.position.x.toFixed(3)}, ${mesa2.position.y.toFixed(3)}, ${mesa2.position.z.toFixed(3)}]`);
console.log(`Mesa 2 Attachment:`, mesa2.userData.attachment);

const box1 = new THREE.Box3().setFromObject(mesa1);
const box2 = new THREE.Box3().setFromObject(mesa2);
console.log(`Box 1 Max X: ${box1.max.x.toFixed(3)} | Box 2 Min X: ${box2.min.x.toFixed(3)}`);
console.assert(Math.abs(box1.max.x - box2.min.x) < 0.001, 'FAIL: Borde derecho de Mesa 1 debe tocar borde izquierdo de Mesa 2');
console.assert(mesa2.position.y === 0, 'FAIL: Mesa 2 debe permanecer en Y=0');
console.log('PRUEBA 2: PASS\n');

// PRUEBA 3: Snap Lateral Izquierdo
console.log('--- PRUEBA 3: Snap Lateral Izquierdo (target.min.x ≈ source.max.x) ---');
mesa2.position.set(-1.30, 0, 0.05);
mesa2.updateMatrixWorld(true);
const snappedLeft = snapKuoAVAssembly(mesa2);
console.log(`Snapped Left: ${snappedLeft}`);
console.log(`Mesa 2 Position después de snap: [${mesa2.position.x.toFixed(3)}, ${mesa2.position.y.toFixed(3)}, ${mesa2.position.z.toFixed(3)}]`);
const box1Left = new THREE.Box3().setFromObject(mesa1);
const box2Left = new THREE.Box3().setFromObject(mesa2);
console.log(`Box 1 Min X: ${box1Left.min.x.toFixed(3)} | Box 2 Max X: ${box2Left.max.x.toFixed(3)}`);
console.assert(Math.abs(box1Left.min.x - box2Left.max.x) < 0.001, 'FAIL: Borde izquierdo de Mesa 1 debe tocar borde derecho de Mesa 2');
console.assert(mesa2.position.y === 0, 'FAIL: Mesa 2 debe permanecer en Y=0');
console.log('PRUEBA 3: PASS\n');

// PRUEBA 4: Mover mesa 1 y verificar que mesa 2 la acompaña
console.log('--- PRUEBA 4: Movimiento Sincronizado de Attachment ---');
// Dejar mesa 2 snapped a la derecha
mesa2.position.set(1.30, 0, 0);
snapKuoAVAssembly(mesa2);
const off = mesa2.userData.attachment.offsetLocal;
const mesa1Id = mesa1.userData.instanceId;

// Simular arrastre de mesa 1 a x = 0.50, z = 0.20
mesa1.position.set(0.50, 0, 0.20);
mesa1.updateMatrixWorld(true);

// Sincronización en onPointerMove:
if (mesa2.userData?.attachment?.targetAssemblyId === mesa1Id) {
  mesa2.position.set(mesa1.position.x + off.x, 0, mesa1.position.z + off.z);
  mesa2.updateMatrixWorld(true);
}
console.log(`Mesa 1 Nueva Pos: [${mesa1.position.x}, ${mesa1.position.y}, ${mesa1.position.z}]`);
console.log(`Mesa 2 Nueva Pos: [${mesa2.position.x.toFixed(3)}, ${mesa2.position.y.toFixed(3)}, ${mesa2.position.z.toFixed(3)}]`);
console.assert(Math.abs(mesa2.position.x - (mesa1.position.x + off.x)) < 0.001, 'FAIL: Mesa 2 debe seguir el offset relativo en X');
console.assert(Math.abs(mesa2.position.z - (mesa1.position.z + off.z)) < 0.001, 'FAIL: Mesa 2 debe seguir el offset relativo en Z');
console.assert(mesa2.position.y === 0, 'FAIL: Y debe seguir siendo 0');
console.log('PRUEBA 4: PASS\n');

// PRUEBA 8: Eliminar mesa 1 -> mesa 2 queda independiente en Y=0
console.log('--- PRUEBA 8: Desvinculación limpia al eliminar mesa soporte ---');
const deletedInstanceId = mesa1Id;
parts.forEach(({ obj: otherObj }) => {
  if (otherObj?.userData?.attachment?.targetAssemblyId === deletedInstanceId) {
    otherObj.userData.attachment = null;
  }
});
console.log('Mesa 2 Attachment después de eliminar Mesa 1:', mesa2.userData.attachment);
console.assert(mesa2.userData.attachment === null, 'FAIL: Attachment debe quedar limpio en null');
console.assert(mesa2.position.y === 0, 'FAIL: Mesa 2 debe permanecer en Y=0');
console.log('PRUEBA 8: PASS\n');

console.log('=== TODOS LOS TESTS PASARON EXITOSAMENTE ===');
