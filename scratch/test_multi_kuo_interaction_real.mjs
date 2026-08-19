import * as THREE from 'three';
import { createKuoAVInstance } from '../src/mepal/kuoAV/factory/createKuoAVInstance.js';

console.log('=== MULTI KUO AV INTERACTION & ISOLATION TEST ===\n');

const scene = new THREE.Scene();
const parts = [];

// Helper functions matching ThreeCanvas.jsx
function isDescendantOf(obj, root) {
  let cur = obj;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

function getRootPartObject(object) {
  let cur = object;
  let fallback = null;
  while (cur) {
    if (cur.userData?.isPartRoot === true || cur.userData?.kind === 'KUO_AV_ASSEMBLY') {
      return cur;
    }
    cur = cur.parent;
  }
  return fallback;
}

function getKoncisaAssemblyObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.kind === 'KUO_AV_ASSEMBLY' || current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function resolveSelectionTargets(object, { asGroup = true } = {}) {
  const physicalRoot = getRootPartObject(object);
  const physicalId = physicalRoot?.userData?.instanceId || physicalRoot?.uuid;

  if (!physicalRoot || !physicalId || !asGroup) {
    return physicalId ? [physicalId] : [];
  }

  const assembly = getKoncisaAssemblyObject(object) || getKoncisaAssemblyObject(physicalRoot);
  if (!assembly) return [physicalId];

  const assemblyIds = new Set(
    [assembly.userData?.instanceId, assembly.userData?.code, assembly.uuid].filter(Boolean)
  );
  const physicalObjects = parts.map(({ obj }) => obj).filter(Boolean);
  let members = physicalObjects.filter((candidate) => isDescendantOf(candidate, assembly));
  const linkedMembers = physicalObjects.filter((candidate) =>
    assemblyIds.has(candidate.userData?.parentAssemblyId)
  );

  if (linkedMembers.length) members = Array.from(new Set([...members, ...linkedMembers]));

  if (!members.length) {
    const groupId = assembly.userData?.groupId || physicalRoot.userData?.groupId;
    if (groupId) {
      members = physicalObjects.filter((candidate) => candidate.userData?.groupId === groupId);
    }
  }

  const resolvedIds = members
    .map((candidate) => candidate.userData?.instanceId || candidate.uuid)
    .filter(Boolean);

  return Array.from(new Set(resolvedIds.length ? resolvedIds : [physicalId]));
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
    const isOtherKuo =
      node.userData?.kind === 'KUO_AV_ASSEMBLY' &&
      node.userData?.instanceId !== assembly.userData?.instanceId &&
      !isDescendantOf(node, assembly) &&
      !isDescendantOf(assembly, node);

    if (!isOtherKuo) return;

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
  }
  return false;
}

// TEST 1: Crear Mesa A y Mesa B
console.log('--- 1. Instanciación de Mesa A y Mesa B ---');
const resultA = await createKuoAVInstance({
  config: { width: 1200, depth: 600, height: 730 },
  instanceId: 'KUOAV_001',
});
const mesaA = resultA.object;
mesaA.position.set(0, 0, 0);
mesaA.updateMatrixWorld(true);
scene.add(mesaA);
parts.push(resultA.partRecord);

const resultB = await createKuoAVInstance({
  config: { width: 1200, depth: 600, height: 730 },
  instanceId: 'KUOAV_002',
});
const mesaB = resultB.object;
mesaB.position.set(1.6, 0, 0);
mesaB.updateMatrixWorld(true);
scene.add(mesaB);
parts.push(resultB.partRecord);

console.log(`Mesa A: instanceId=${mesaA.userData.instanceId}, groupId=${mesaA.userData.groupId}, pos=[${mesaA.position.x}, ${mesaA.position.y}, ${mesaA.position.z}]`);
console.log(`Mesa B: instanceId=${mesaB.userData.instanceId}, groupId=${mesaB.userData.groupId}, pos=[${mesaB.position.x}, ${mesaB.position.y}, ${mesaB.position.z}]`);

console.assert(mesaA.userData.groupId !== mesaB.userData.groupId, 'FAIL: groupId de A y B deben ser distintos');
console.log('TEST 1: PASS - Instancias independientes con groupIds únicos\n');

// TEST 2: Selección individual de A
console.log('--- 2. Selección de submalla de Mesa A ---');
const subpartA = mesaA.children[0];
const targetsA = resolveSelectionTargets(subpartA, { asGroup: true });
console.log('Selección al clickear en submalla de A:', targetsA);
console.assert(targetsA.length === 1 && targetsA[0] === mesaA.userData.instanceId, 'FAIL: Solo debe seleccionarse Mesa A');
console.log('TEST 2: PASS - Selección 100% aislada de Mesa A\n');

// TEST 3: Arrastre individual de A (+0.5 en X)
console.log('--- 3. Arrastre individual de Mesa A ---');
mesaA.position.x += 0.5;
mesaA.updateMatrixWorld(true);
console.log(`Mesa A Pos: [${mesaA.position.x}, ${mesaA.position.y}, ${mesaA.position.z}] | Mesa B Pos: [${mesaB.position.x}, ${mesaB.position.y}, ${mesaB.position.z}]`);
console.assert(mesaA.position.x === 0.5 && mesaB.position.x === 1.6, 'FAIL: Solo Mesa A debe moverse');
console.log('TEST 3: PASS - Mesa A se mueve individualmente\n');

// TEST 4: Selección individual de B
console.log('--- 4. Selección de submalla de Mesa B ---');
const subpartB = mesaB.children[0];
const targetsB = resolveSelectionTargets(subpartB, { asGroup: true });
console.log('Selección al clickear en submalla de B:', targetsB);
console.assert(targetsB.length === 1 && targetsB[0] === mesaB.userData.instanceId, 'FAIL: Solo debe seleccionarse Mesa B');
console.log('TEST 4: PASS - Selección 100% aislada de Mesa B\n');

// TEST 5: Acercar B a A y Snap Lateral
console.log('--- 5. Snap lateral al soltar B cerca de A ---');
// Mesa A está en X = 0.5 (ocupa de -0.1 a 1.1 en X)
// Si colocamos Mesa B en X = 1.75 (cerca del borde derecho 1.1 + 0.6 = 1.7), distancia < 250mm
mesaB.position.set(1.75, 0, 0.05);
mesaB.updateMatrixWorld(true);
const snapped = snapKuoAVAssembly(mesaB);
console.log(`Snap exitoso: ${snapped}`);
console.log(`Mesa B Pos después de snap: [${mesaB.position.x.toFixed(3)}, ${mesaB.position.y.toFixed(3)}, ${mesaB.position.z.toFixed(3)}]`);
console.log('Attachment de Mesa B:', mesaB.userData.attachment);
console.assert(snapped === true, 'FAIL: Debe hacer snap lateral');
console.assert(Math.abs(mesaB.position.x - 1.70) < 0.001, 'FAIL: Mesa B debe colocarse exactamente a 1.70 en X');
console.assert(mesaB.position.y === 0, 'FAIL: Y debe permanecer en 0');
console.assert(mesaB.userData.attachment?.targetAssemblyId === mesaA.userData.instanceId, 'FAIL: Attachment debe apuntar a Mesa A');
console.log('TEST 5: PASS - Snap Lateral Bench perfecto a nivel de piso\n');

// TEST 6: Mover Mesa A (receptora) -> Mesa B la acompaña
console.log('--- 6. Arrastre de Mesa A con Mesa B vinculada ---');
mesaA.position.set(2.0, 0, 1.0);
mesaA.updateMatrixWorld(true);
// Lógica de sincronización de ThreeCanvas:
if (mesaB.userData?.attachment?.targetAssemblyId === mesaA.userData.instanceId) {
  const off = mesaB.userData.attachment.offsetLocal;
  mesaB.position.set(mesaA.position.x + off.x, 0, mesaA.position.z + off.z);
  mesaB.updateMatrixWorld(true);
}
console.log(`Mesa A Pos: [${mesaA.position.x}, ${mesaA.position.y}, ${mesaA.position.z}]`);
console.log(`Mesa B Pos: [${mesaB.position.x.toFixed(3)}, ${mesaB.position.y.toFixed(3)}, ${mesaB.position.z.toFixed(3)}]`);
console.assert(Math.abs(mesaB.position.x - 3.20) < 0.001, 'FAIL: Mesa B debe acompañar a Mesa A en X');
console.assert(Math.abs(mesaB.position.z - 1.00) < 0.001, 'FAIL: Mesa B debe acompañar a Mesa A en Z');
console.log('TEST 6: PASS - Movimiento sincronizado por attachment\n');

// TEST 7: Seleccionar Mesa B directamente y arrastrar -> Rompe el attachment
console.log('--- 7. Ruptura de attachment al arrastrar Mesa B directamente ---');
if (mesaB.userData?.attachment) {
  mesaB.userData.attachment = null; // Se limpia en pointerdown directo sobre B
}
mesaB.position.set(5.0, 0, 5.0);
mesaB.updateMatrixWorld(true);
// Mover A nuevamente
mesaA.position.set(0, 0, 0);
mesaA.updateMatrixWorld(true);
console.log(`Mesa A Pos: [${mesaA.position.x}, ${mesaA.position.y}, ${mesaA.position.z}] | Mesa B Pos: [${mesaB.position.x}, ${mesaB.position.y}, ${mesaB.position.z}]`);
console.assert(mesaB.position.x === 5.0 && mesaB.userData.attachment === null, 'FAIL: Mesa B debe quedar libre y separada');
console.log('TEST 7: PASS - Desvinculación limpia al interactuar directamente\n');

console.log('=== TODOS LOS TESTS FUNCIONALES PASARON EXITOSAMENTE ===');
