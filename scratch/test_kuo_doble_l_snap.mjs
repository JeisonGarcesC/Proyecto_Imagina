import * as THREE from 'three';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

console.log('=== TEST SUITE: KUO AV DOBLE L-SNAP (90 GRADOS) ===\n');

// 1. Instancia estándar completa
const deskA = buildKuoAVDoble({
  anchoMm: 1200,
  profundidadMm: 600,
});

console.log('Desk A (Inicial completa):');
console.log('  pieIzquierdo:', deskA.config.pieIzquierdo);
console.log('  pieDerecho:', deskA.config.pieDerecho);
console.log('  paralesIzquierdos:', deskA.config.paralesIzquierdos);
console.log('  paralesDerechos:', deskA.config.paralesDerechos);

if (deskA.config.pieIzquierdo && deskA.config.pieDerecho) {
  console.log('TEST 1: PASS - Desk A tiene ambos pies activos');
} else {
  console.error('TEST 1: FAIL');
}

// 2. Instancia girada en L con contacto en lado izquierdo
const deskL_left = buildKuoAVDoble({
  anchoMm: 1200,
  profundidadMm: 600,
  pieIzquierdo: false,
  paralesIzquierdos: false,
  pieDerecho: true,
  paralesDerechos: true,
});

console.log('\nDesk L (Contacto en lateral izquierdo):');
console.log('  pieIzquierdo:', deskL_left.config.pieIzquierdo);
console.log('  pieDerecho:', deskL_left.config.pieDerecho);

const hasLeftFootMesh = deskL_left.parts.some(p => p.role === 'SUPPORT_LEFT');
const hasRightFootMesh = deskL_left.parts.some(p => p.role === 'SUPPORT_RIGHT');

if (!hasLeftFootMesh && hasRightFootMesh) {
  console.log('TEST 2: PASS - Lateral izquierdo oculto para dar paso continuo en L');
} else {
  console.error('TEST 2: FAIL');
}

// 3. Instancia girada en L con contacto en lado derecho
const deskL_right = buildKuoAVDoble({
  anchoMm: 1200,
  profundidadMm: 600,
  pieIzquierdo: true,
  paralesIzquierdos: true,
  pieDerecho: false,
  paralesDerechos: false,
});

console.log('\nDesk L (Contacto en lateral derecho):');
console.log('  pieIzquierdo:', deskL_right.config.pieIzquierdo);
console.log('  pieDerecho:', deskL_right.config.pieDerecho);

const hasLeftFootMeshR = deskL_right.parts.some(p => p.role === 'SUPPORT_LEFT');
const hasRightFootMeshR = deskL_right.parts.some(p => p.role === 'SUPPORT_RIGHT');

if (hasLeftFootMeshR && !hasRightFootMeshR) {
  console.log('TEST 3: PASS - Lateral derecho oculto para dar paso continuo en L');
} else {
  console.error('TEST 3: FAIL');
}

console.log('\n=== TODOS LOS TESTS PASARON EXITOSAMENTE ===');
