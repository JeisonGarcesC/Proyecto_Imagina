import fs from 'fs';
import path from 'path';

function parseGlbJson(buffer) {
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('Not GLB');
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) throw new Error('Not JSON chunk');
  return JSON.parse(buffer.toString('utf8', 20, 20 + chunkLength));
}

const dir = 'public/assets/models/Kuo AV/Puesto Doble';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort();

console.log(`=== AUDITORÍA PROFUNDA DE LOS 14 GLBS DE PUESTO DOBLE ===\n`);

const reports = [];

for (const f of files) {
  const fullPath = path.join(dir, f);
  const buffer = fs.readFileSync(fullPath);
  const gltf = parseGlbJson(buffer);

  const meshes = gltf.meshes || [];
  const accessors = gltf.accessors || [];
  const nodes = gltf.nodes || [];
  const materials = (gltf.materials || []).map(m => ({
    name: m.name || 'unnamed',
    baseColorFactor: m.pbrMetallicRoughness?.baseColorFactor,
    metallicFactor: m.pbrMetallicRoughness?.metallicFactor,
    roughnessFactor: m.pbrMetallicRoughness?.roughnessFactor
  }));

  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  meshes.forEach(m => {
    (m.primitives || []).forEach(p => {
      if (p.attributes && p.attributes.POSITION !== undefined) {
        const acc = accessors[p.attributes.POSITION];
        if (acc && acc.min && acc.max) {
          for (let i = 0; i < 3; i++) {
            if (acc.min[i] < min[i]) min[i] = acc.min[i];
            if (acc.max[i] > max[i]) max[i] = acc.max[i];
          }
        }
      }
    });
  });

  if (min[0] === Infinity) { min = [0,0,0]; max = [0,0,0]; }

  const size = {
    x: +((max[0] - min[0]) * 1000).toFixed(2),
    y: +((max[1] - min[1]) * 1000).toFixed(2),
    z: +((max[2] - min[2]) * 1000).toFixed(2)
  };
  const bboxMin = {
    x: +(min[0] * 1000).toFixed(2),
    y: +(min[1] * 1000).toFixed(2),
    z: +(min[2] * 1000).toFixed(2)
  };
  const bboxMax = {
    x: +(max[0] * 1000).toFixed(2),
    y: +(max[1] * 1000).toFixed(2),
    z: +(max[2] * 1000).toFixed(2)
  };
  const center = {
    x: +(((min[0] + max[0]) / 2) * 1000).toFixed(2),
    y: +(((min[1] + max[1]) / 2) * 1000).toFixed(2),
    z: +(((min[2] + max[2]) / 2) * 1000).toFixed(2)
  };

  reports.push({
    file: f,
    sizeBytes: buffer.length,
    sizeMm: size,
    bboxMinMm: bboxMin,
    bboxMaxMm: bboxMax,
    centerMm: center,
    nodeCount: nodes.length,
    nodes: nodes.map(n => ({
      name: n.name,
      translation: n.translation,
      rotation: n.rotation,
      scale: n.scale,
      mesh: n.mesh
    })),
    meshCount: meshes.length,
    materials: materials.map(m => m.name)
  });

  console.log(`[${f}]`);
  console.log(`  Size: ${size.x} x ${size.y} x ${size.z} mm`);
  console.log(`  BBox Min: [${bboxMin.x}, ${bboxMin.y}, ${bboxMin.z}] | Max: [${bboxMax.x}, ${bboxMax.y}, ${bboxMax.z}] | Center: [${center.x}, ${center.y}, ${center.z}]`);
  console.log(`  Nodes: ${nodes.length} | Meshes: ${meshes.length} | Materials: ${materials.map(m => m.name).join(', ')}`);
  console.log('');
}

fs.writeFileSync('scratch/deep_14_glbs_audit.json', JSON.stringify(reports, null, 2));
