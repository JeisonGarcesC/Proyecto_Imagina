import fs from 'fs';
import path from 'path';

function parseGlbJson(buffer) {
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error('Not a valid GLB file');
  }
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) {
    throw new Error('First chunk is not JSON');
  }
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  return JSON.parse(jsonString);
}

function analyzeGlb(filePath) {
  const buffer = fs.readFileSync(filePath);
  const gltf = parseGlbJson(buffer);
  const fileName = path.basename(filePath);

  const meshes = gltf.meshes || [];
  const accessors = gltf.accessors || [];
  const nodes = gltf.nodes || [];
  const materials = (gltf.materials || []).map((m) => m.name || 'unnamed');

  // Compute global BBox by combining min/max of all position accessors
  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  meshes.forEach((mesh) => {
    (mesh.primitives || []).forEach((prim) => {
      if (prim.attributes && prim.attributes.POSITION !== undefined) {
        const acc = accessors[prim.attributes.POSITION];
        if (acc && acc.min && acc.max) {
          for (let i = 0; i < 3; i++) {
            if (acc.min[i] < globalMin[i]) globalMin[i] = acc.min[i];
            if (acc.max[i] > globalMax[i]) globalMax[i] = acc.max[i];
          }
        }
      }
    });
  });

  if (globalMin[0] === Infinity) {
    globalMin = [0, 0, 0];
    globalMax = [0, 0, 0];
  }

  // Multiply by 1000 to convert meters to mm
  const sizeMm = {
    x: +((globalMax[0] - globalMin[0]) * 1000).toFixed(2),
    y: +((globalMax[1] - globalMin[1]) * 1000).toFixed(2),
    z: +((globalMax[2] - globalMin[2]) * 1000).toFixed(2),
  };

  const bboxMinMm = {
    x: +(globalMin[0] * 1000).toFixed(2),
    y: +(globalMin[1] * 1000).toFixed(2),
    z: +(globalMin[2] * 1000).toFixed(2),
  };

  const bboxMaxMm = {
    x: +(globalMax[0] * 1000).toFixed(2),
    y: +(globalMax[1] * 1000).toFixed(2),
    z: +(globalMax[2] * 1000).toFixed(2),
  };

  const centerMm = {
    x: +(((globalMin[0] + globalMax[0]) / 2) * 1000).toFixed(2),
    y: +(((globalMin[1] + globalMax[1]) / 2) * 1000).toFixed(2),
    z: +(((globalMin[2] + globalMax[2]) / 2) * 1000).toFixed(2),
  };

  return {
    fileName,
    sizeBytes: buffer.length,
    sizeMm,
    bboxMinMm,
    bboxMaxMm,
    centerMm,
    meshCount: meshes.length,
    nodeCount: nodes.length,
    nodeNames: nodes.map((n) => n.name).filter(Boolean),
    materials,
    gltfOverview: {
      generator: gltf.asset?.generator,
      version: gltf.asset?.version,
      buffers: gltf.buffers?.length,
    },
  };
}

async function main() {
  console.log('=== AUDITORÍA COMPLETA DE GLB PUESTO DOBLE KUO AV ===\n');

  const puestoDobleDir = 'public/assets/models/Kuo AV/Puesto Doble';
  const kuoAvDir = 'public/assets/models/Kuo AV';

  const filesPuestoDoble = fs.readdirSync(puestoDobleDir).filter((f) => f.endsWith('.glb'));
  const filesKuoAv = fs.readdirSync(kuoAvDir).filter((f) => f.endsWith('.glb'));

  console.log(`--- GLBs en "Puesto Doble" (${filesPuestoDoble.length} archivos) ---`);
  const resultsPuestoDoble = [];
  for (const f of filesPuestoDoble) {
    const fullPath = path.join(puestoDobleDir, f);
    const report = analyzeGlb(fullPath);
    resultsPuestoDoble.push(report);
    console.log(
      `${f.padEnd(25)} -> Size: ${String(report.sizeMm.x).padStart(7)} x ${String(report.sizeMm.y).padStart(7)} x ${String(report.sizeMm.z).padStart(7)} mm | BBox Min: [${report.bboxMinMm.x}, ${report.bboxMinMm.y}, ${report.bboxMinMm.z}] Max: [${report.bboxMaxMm.x}, ${report.bboxMaxMm.y}, ${report.bboxMaxMm.z}]`
    );
  }

  console.log(`\n--- GLBs en "Kuo AV" base (${filesKuoAv.length} archivos) ---`);
  const resultsKuoAv = [];
  for (const f of filesKuoAv) {
    const fullPath = path.join(kuoAvDir, f);
    const report = analyzeGlb(fullPath);
    resultsKuoAv.push(report);
    console.log(
      `${f.padEnd(25)} -> Size: ${String(report.sizeMm.x).padStart(7)} x ${String(report.sizeMm.y).padStart(7)} x ${String(report.sizeMm.z).padStart(7)} mm | BBox Min: [${report.bboxMinMm.x}, ${report.bboxMinMm.y}, ${report.bboxMinMm.z}] Max: [${report.bboxMaxMm.x}, ${report.bboxMaxMm.y}, ${report.bboxMaxMm.z}]`
    );
  }

  fs.writeFileSync(
    'scratch/puesto_doble_glbs_audit.json',
    JSON.stringify({ puestoDoble: resultsPuestoDoble, kuoAvBase: resultsKuoAv }, null, 2)
  );
  console.log('\nReporte guardado exitosamente en scratch/puesto_doble_glbs_audit.json');
}

main().catch(console.error);
