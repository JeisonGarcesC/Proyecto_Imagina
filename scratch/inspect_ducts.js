import fs from 'fs';
import path from 'path';

function inspectGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    console.log(`${filePath} is not glTF`);
    return;
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log(`\n=== ${path.basename(filePath)} ===`);
  console.log('Nodes:');
  (gltf.nodes || []).forEach((n, i) => {
    console.log(`  node[${i}]: "${n.name}" (mesh: ${n.mesh !== undefined ? gltf.meshes?.[n.mesh]?.name || n.mesh : 'none'})`);
  });
  console.log('Meshes:');
  (gltf.meshes || []).forEach((m, i) => {
    console.log(`  mesh[${i}]: "${m.name}"`);
    m.primitives?.forEach((p, pi) => {
      const mat = gltf.materials?.[p.material];
      console.log(`    prim[${pi}]: material: "${mat?.name}" color: ${JSON.stringify(mat?.pbrMetallicRoughness?.baseColorFactor)}`);
    });
  });
  console.log('Materials:');
  (gltf.materials || []).forEach((mat, i) => {
    console.log(`  mat[${i}]: "${mat.name}", color: ${JSON.stringify(mat.pbrMetallicRoughness?.baseColorFactor)}`);
  });
}

const dir = 'c:/Users/juaavigu/OneDrive - Carvajal S.A/Escritorio/Proyecto_Imagina/public/assets/models/koncisaPlus';
const testFiles = [
  '2KSO333000.glb', // piso sencillo
  '2KSO325000.glb', // piso doble
  '2KSO334000.glb', // techo sencillo
  '2KSO327000.glb', // techo doble
  '2KSO346000.glb', // ducto sencillo individual
  '2KSO345000.glb', // ducto doble individual
  '2KSO348000_120_DER.glb', // ducto sencillo terminal 120
  '2KSO332000_120.glb', // ducto sencillo intermedio 120
  '2KSO349000_120_DER.glb', // ducto doble terminal 120
  '2KSO326000_120.glb', // ducto doble intermedio 120
];

for (const f of testFiles) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) inspectGlb(p);
  else console.log(`Not found: ${f}`);
}
