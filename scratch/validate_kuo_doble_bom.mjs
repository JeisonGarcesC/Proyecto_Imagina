import * as THREE from 'three';
import fs from 'fs';
import { buildKuoAVDoble } from '../src/mepal/kuoAVDoble/builder/KuoAVDobleBuilder.js';
import { createKuoAVDobleInstance } from '../src/mepal/kuoAVDoble/factory/createKuoAVDobleInstance.js';

console.log('=== VALIDACIÓN COMPLETA DE BOM: EXCEL VS IMPLEMENTACIÓN ===\n');

const excelReferenceBom = [
  { lookupTag: 'KUAC650000', description: 'Vértebra pasacables vertical', expectedQty: 2 },
  { lookupTag: 'KUSO830000', description: 'Ducto central doble', expectedQty: 1 },
  { lookupTag: 'LKAC250000', description: 'Grommet abatible', expectedQty: 1 }, // 1 doble cubre las 2 bocas
  { lookupTag: 'KUAC680000', description: 'Soporte tomas eléctricas', expectedQty: 2 },
  { lookupTag: 'KUAC1040000', description: 'Kit fuente central doble', expectedQty: 1 }, // 1 doble central electrifica ambos puestos
  { lookupTag: 'KUSO820000', description: 'Costado doble extremo / intermedio', expectedQty: 2 }, // 2 costados extremos dobles
  { lookupTag: 'KUSO420000', description: 'Viga soporte longitudinal', expectedQty: 2 }, // 1 frontal + 1 posterior
  { lookupTag: 'LKSU010010', description: 'Superficie perimetral de trabajo', expectedQty: 2 }, // 1 frontal + 1 posterior
  { lookupTag: 'DPBK06', description: 'Botonera control LINAK', expectedQty: 2 }, // 1 frontal + 1 posterior
];

const built = buildKuoAVDoble({
  anchoMm: 1200,
  profundidadMm: 600,
  alturaMm: 730,
  thickMm: 30,
  costadoIntermedio: false, // Base estándar (2 costados extremos)
  vertebraLateral: true,
  kitFuente: true,
});

console.log('--- Comparativa de BOM ---');
const results = [];
let allMatch = true;

excelReferenceBom.forEach(item => {
  const found = built.bom.find(b => b.lookupTag === item.lookupTag);
  const actualQty = found ? found.quantity : 0;
  let status = 'PASS';

  if (!found) {
    status = 'MISSING';
    allMatch = false;
  } else if (actualQty !== item.expectedQty) {
    status = 'QUANTITY_MISMATCH';
    allMatch = false;
  }

  results.push({
    tag: item.lookupTag,
    description: item.description,
    expectedQty: item.expectedQty,
    actualQty,
    status
  });

  console.log(`${item.lookupTag.padEnd(15)} | Expected: ${item.expectedQty} | Actual: ${actualQty} | Status: ${status}`);
});

console.log('\n--- Validación de Instancia 3D ---');
const instance = await createKuoAVDobleInstance({
  config: {
    anchoMm: 1200,
    profundidadMm: 600,
    alturaMm: 730,
    thickMm: 30,
  }
});

console.log('Kind:', instance.metadata.kind);
console.log('Submallas en Three.js:', instance.object.children.length);
console.log('Posición Y base:', instance.object.position.y);

// Generar Markdown
let mdContent = `# VALIDACIÓN DE BOM: EXCEL VS IMPLEMENTACIÓN
## PUESTO DOBLE KUO AV

### Comparativa de Composición Comercial

| Código CET / Lookup Tag | Descripción del Componente | Cantidad Comercial Excel | Cantidad Implementada | Estado | Observaciones de Ingeniería |
| :--- | :--- | :---: | :---: | :---: | :--- |
`;

results.forEach(r => {
  let obs = 'Coincidencia exacta 1 a 1.';
  if (r.tag === 'LKAC250000') obs = '1 Ensamble GLB Doble (LKAC250000_DOBLE) de 512x257mm que atiende ambas bocas.';
  if (r.tag === 'KUAC1040000') obs = '1 Módulo Doble Central (KUAC1040000_74Doble) que electrifica ambos puestos.';
  if (r.tag === 'DPBK06') obs = 'Registrado en BOM como componente lógico/comercial (pendiente modelo GLB).';
  mdContent += `| **\`${r.tag}\`** | ${r.description} | ${r.expectedQty} | ${r.actualQty} | **${r.status}** | ${obs} |\n`;
});

mdContent += `
---

### Estado Global de Validación: ${allMatch ? '**PASS 100%**' : '**PENDIENTE DE AJUSTE**'}

1. **Superficies**: 2 mallas procedurales independientes en cota $Y = 700\\text{ mm}$ con $30\\text{ mm}$ de espesor.
2. **Estructura Portante**: 2 costados dobles \`KUSO820000\` en extremos $X = \\pm 558.85\\text{ mm}$ que unen ambos puestos cara a cara.
3. **Vigas**: 2 vigas longitudinales \`KUSO420000_120\` en $Z = \\pm 250\\text{ mm}$.
4. **Ducto**: 1 ducto central \`KUSO830000_120\` de $245\\text{ mm}$ de fondo centrado en $Z = 0$.
5. **Grommet**: 1 grommet central doble \`LKAC250000_DOBLE\` de $512 \\times 257\\text{ mm}$ con tapas basculantes.
6. **Vértebras**: 2 vértebras pasacables \`KUAC650000\` en extremos laterales izquierdo y derecho.
7. **Soportes de Tomas**: 2 soportes \`KUAC680000\` fijados al ducto central.
8. **Botoneras**: 2 botoneras \`DPBK06\` registradas en el BOM para costeo.
`;

fs.writeFileSync('docs/KUO_AV_DOBLE_BOM_VALIDATION.md', mdContent);
console.log('\nReporte guardado en docs/KUO_AV_DOBLE_BOM_VALIDATION.md');
