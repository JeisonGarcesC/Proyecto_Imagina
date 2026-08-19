import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';

console.log('=== TEST 1: PUESTO INICIAL (2 PIES / 4 PARALES) ===');
const inicial = buildKuoAVDoble({ tipoPuesto: 'INICIAL', anchoMm: 1200 });
const pPieIzq = inicial.parts.filter(p => p.role === 'SUPPORT_LEFT' && p.partId.includes('FOOT'));
const pPieDer = inicial.parts.filter(p => p.role === 'SUPPORT_RIGHT' && p.partId.includes('FOOT'));
const pParalIzq = inicial.parts.filter(p => p.role === 'SUPPORT_LEFT' && p.partId.includes('PARAL'));
const pParalDer = inicial.parts.filter(p => p.role === 'SUPPORT_RIGHT' && p.partId.includes('PARAL'));
console.log(`Inicial: Pies Izq=${pPieIzq.length}, Pies Der=${pPieDer.length}, Parales Izq=${pParalIzq.length}, Parales Der=${pParalDer.length}`);
if (pPieIzq.length !== 1 || pPieDer.length !== 1 || pParalIzq.length !== 2 || pParalDer.length !== 2) {
  throw new Error('Test 1 Failed!');
}

console.log('\n=== TEST 2: PUESTO EXTENSIÓN DERECHA (CET BENCH) ===');
const extDer = buildKuoAVDoble({ tipoPuesto: 'EXTENSION_DER', anchoMm: 1200 });
const ePieIzq = extDer.parts.filter(p => p.role === 'SUPPORT_LEFT' && p.partId.includes('FOOT'));
const ePieDer = extDer.parts.filter(p => p.role === 'SUPPORT_RIGHT' && p.partId.includes('FOOT'));
const eParalIzq = extDer.parts.filter(p => p.role === 'SUPPORT_LEFT' && p.partId.includes('PARAL'));
const eParalDer = extDer.parts.filter(p => p.role === 'SUPPORT_RIGHT' && p.partId.includes('PARAL'));
console.log(`Extensión Der: Pies Izq=${ePieIzq.length} (0 esperado), Pies Der=${ePieDer.length} (1 esperado), Parales Izq=${eParalIzq.length} (0 esperado), Parales Der=${eParalDer.length} (2 esperado)`);
if (ePieIzq.length !== 0 || ePieDer.length !== 1 || eParalIzq.length !== 0 || eParalDer.length !== 2) {
  throw new Error('Test 2 Failed!');
}

console.log('\n=== TEST 3: ACABADOS INDEPENDIENTES ===');
const customMat = buildKuoAVDoble({
  acabadoSuperficieF: '#c2b280',
  acabadoSuperficieP: '#2a2a2a',
  acabadoParales: 'Negro',
  acabadoEstructura: 'Gris'
});
const surfF = customMat.parts.find(p => p.codigo === 'LKSU010010_F');
const surfP = customMat.parts.find(p => p.codigo === 'LKSU010010_P');
const paralF = customMat.parts.find(p => p.partId.includes('PARAL_IZQ_F'));
const footR = customMat.parts.find(p => p.partId.includes('FOOT_RIGHT'));
console.log(`Acabados: SurfF=${surfF.color}, SurfP=${surfP.color}, ParalF=${paralF.colorVariante}, FootR=${footR.colorVariante}`);
if (surfF.color !== '#c2b280' || surfP.color !== '#2a2a2a' || paralF.colorVariante !== 'Negro' || footR.colorVariante !== 'Gris') {
  throw new Error('Test 3 Failed!');
}

console.log('\n=== ALL BENCH EXTENSION & MATERIAL TESTS PASSED! ===');
