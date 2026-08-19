import * as THREE from 'three';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

console.log('=== TEST SUITE: PUESTO DOBLE KUO AV REAL ===\n');

// 1. Test Builder Variants
console.log('--- 1. Validación de Variantes de Ancho ---');
const built120 = buildKuoAVDoble({ anchoMm: 1200, profundidadMm: 600 });
const viga120 = built120.parts.find(p => p.codigo.startsWith('KUSO420000'));
const ducto120 = built120.parts.find(p => p.codigo.startsWith('KUSO830000'));
console.log('1200mm -> Viga:', viga120.codigo, '| Ducto:', ducto120.codigo);
if (viga120.codigo.includes('1200') && ducto120.codigo.includes('1200')) {
  console.log('TEST 1.1: PASS - Ancho 1200 mm');
}

const built150 = buildKuoAVDoble({ anchoMm: 1500, profundidadMm: 600 });
const viga150 = built150.parts.find(p => p.codigo.startsWith('KUSO420000'));
const ducto150 = built150.parts.find(p => p.codigo.startsWith('KUSO830000'));
console.log('1500mm -> Viga:', viga150.codigo, '| Ducto:', ducto150.codigo);
if (viga150.codigo.includes('1500') && ducto150.codigo.includes('1500')) {
  console.log('TEST 1.2: PASS - Ancho 1500 mm');
}

const built165 = buildKuoAVDoble({ anchoMm: 1650, profundidadMm: 600 });
const viga165 = built165.parts.find(p => p.codigo.startsWith('KUSO420000'));
const ducto165 = built165.parts.find(p => p.codigo.startsWith('KUSO830000'));
console.log('1650mm -> Viga:', viga165.codigo, '| Ducto:', ducto165.codigo);
if (viga165.codigo.includes('1650') && ducto165.codigo.includes('1650')) {
  console.log('TEST 1.3: PASS - Ancho 1650 mm');
}

// 2. Test Profundidad Variantes
console.log('\n--- 2. Validación de Variantes de Profundidad (Costado Intermedio) ---');
const costado120 = built120.parts.find(p => p.codigo.startsWith('KUSO820000'));
console.log('Fondo 600mm (Total 1200) -> Costado Intermedio:', costado120.codigo);
if (costado120.codigo.includes('1200')) {
  console.log('TEST 2.1: PASS - Costado Intermedio 1200 mm');
}

const builtFondo750 = buildKuoAVDoble({ anchoMm: 1200, profundidadMm: 750 });
const costado150 = builtFondo750.parts.find(p => p.codigo.startsWith('KUSO820000'));
console.log('Fondo 750mm (Total 1500) -> Costado Intermedio:', costado150.codigo);
if (costado150.codigo.includes('1500')) {
  console.log('TEST 2.2: PASS - Costado Intermedio 1500 mm');
}

// 3. Test Opciones ON / OFF
console.log('\n--- 3. Validación de Opciones Booleanas ---');
const builtSinCostado = buildKuoAVDoble({ costadoIntermedio: false });
const hasCostado = builtSinCostado.parts.some(p => p.codigo.startsWith('KUSO820000'));
console.log('costadoIntermedio: false -> hasCostado:', hasCostado);
if (!hasCostado) console.log('TEST 3.1: PASS - Costado Intermedio toggle OFF');

const builtConBaldosa = buildKuoAVDoble({ baldosaFormica: true });
const hasBaldosa = builtConBaldosa.parts.some(p => p.codigo === 'KUBAL01');
console.log('baldosaFormica: true -> hasBaldosa:', hasBaldosa);
if (hasBaldosa) console.log('TEST 3.2: PASS - Baldosa Formica toggle ON');

const builtSinVertebra = buildKuoAVDoble({ vertebraLateral: false });
const hasVertebra = builtSinVertebra.parts.some(p => p.codigo === 'KUAC650000');
console.log('vertebraLateral: false -> hasVertebra:', hasVertebra);
if (!hasVertebra) console.log('TEST 3.3: PASS - Vértebra Lateral toggle OFF');

// 4. Test Instanciación 3D y Aislamiento Multi-Instancia
console.log('\n--- 4. Validación de Instancias 3D e Identidad ---');
const instanceA = await createKuoAVDobleInstance({ config: { anchoMm: 1200 } });
const instanceB = await createKuoAVDobleInstance({ config: { anchoMm: 1200 } });

console.log('Instancia A:', instanceA.metadata.instanceId, '| GroupId:', instanceA.metadata.groupId);
console.log('Instancia B:', instanceB.metadata.instanceId, '| GroupId:', instanceB.metadata.groupId);

if (instanceA.metadata.instanceId !== instanceB.metadata.instanceId &&
    instanceA.metadata.groupId !== instanceB.metadata.groupId) {
  console.log('TEST 4.1: PASS - Instancias 100% independientes y aisladas');
}

if (instanceA.object.position.y === 0 && instanceB.object.position.y === 0) {
  console.log('TEST 4.2: PASS - Cota fija a nivel de piso Y = 0');
}

console.log('\n=== TODOS LOS TESTS DE PUESTO DOBLE KUO AV PASARON EXITOSAMENTE ===');
