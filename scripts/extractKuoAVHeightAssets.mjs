import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [sourcePath, outputDirectory] = process.argv.slice(2);
if (!sourcePath || !outputDirectory) {
  throw new Error('Usage: node scripts/extractKuoAVHeightAssets.mjs <CET elevated.glb> <output directory>');
}
const source = readFileSync(sourcePath);
if (source.toString('ascii', 0, 4) !== 'glTF' || source.readUInt32LE(4) !== 2) {
  throw new Error('Expected a GLB 2.0 export from CET.');
}
const jsonLength = source.readUInt32LE(12);
const original = JSON.parse(source.toString('utf8', 20, 20 + jsonLength).trim());
const binaryStart = 28 + jsonLength;

function extract(filename, nodeIndices, expectedCounts) {
  const accessors = [];
  const bufferViews = [];
  const materials = [];
  const accessorMap = new Map();
  const materialMap = new Map();
  const chunks = [];
  let byteLength = 0;
  function copyAccessor(index) {
    if (accessorMap.has(index)) return accessorMap.get(index);
    const accessor = original.accessors[index];
    if (accessor.sparse) throw new Error('Sparse accessors require a different extractor.');
    const view = original.bufferViews[accessor.bufferView];
    const bytes = source.subarray(binaryStart + view.byteOffset, binaryStart + view.byteOffset + view.byteLength);
    const padding = (4 - byteLength % 4) % 4;
    chunks.push(Buffer.alloc(padding), bytes);
    byteLength += padding;
    const viewIndex = bufferViews.length;
    bufferViews.push({ ...view, buffer: 0, byteOffset: byteLength });
    byteLength += bytes.length;
    const newIndex = accessors.length;
    accessors.push({ ...accessor, bufferView: viewIndex });
    accessorMap.set(index, newIndex);
    return newIndex;
  }
  function copyMaterial(index) {
    if (materialMap.has(index)) return materialMap.get(index);
    const material = original.materials[index];
    if (JSON.stringify(material).includes('Texture')) {
      throw new Error('This extractor only copies untextured mechanism components.');
    }
    const newIndex = materials.length;
    materials.push({ ...material, doubleSided: true });
    materialMap.set(index, newIndex);
    return newIndex;
  }
  const meshes = nodeIndices.map((index, i) => {
    const mesh = original.meshes[original.nodes[index]?.mesh];
    if (!mesh || original.accessors[mesh.primitives[0].attributes.POSITION].count !== expectedCounts[i]) {
      throw new Error(`Unexpected CET component at node ${index}; do not extract a different export blindly.`);
    }
    return {
      name: filename.replace('.glb', ''),
      primitives: mesh.primitives.map((primitive) => ({
        ...primitive,
        attributes: Object.fromEntries(Object.entries(primitive.attributes).map(([key, value]) => [key, copyAccessor(value)])),
        ...(primitive.indices !== undefined ? { indices: copyAccessor(primitive.indices) } : {}),
        material: copyMaterial(primitive.material),
      })),
    };
  });
  chunks.push(Buffer.alloc((4 - byteLength % 4) % 4));
  const binary = Buffer.concat(chunks);
  const json = {
    asset: { version: '2.0', generator: 'CET Kuo AV height reference extraction' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'CET_Z_UP', matrix: original.nodes[0].matrix, children: meshes.map((_, i) => i + 1) },
      ...meshes.map((_, i) => ({ name: filename.replace('.glb', '') + '_' + i, mesh: i })),
    ],
    meshes, materials, accessors, bufferViews,
    buffers: [{ byteLength: binary.length }],
  };
  const text = Buffer.from(JSON.stringify(json));
  const paddedJson = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + paddedJson.length + binary.length, 8);
  header.writeUInt32LE(paddedJson.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  writeFileSync(join(outputDirectory, filename), Buffer.concat([header, paddedJson, binaryHeader, binary]));
  console.log(`${filename}: ${meshes.length} meshes, ${binary.length} binary bytes`);
}

// Node signatures belong to the supplied "Perimetral con aumentar altura" CET export.
extract('KUAC650000_ALT.glb', [48], [24789]);
extract('DPBK06.glb', [26, 30], [3500, 1261]);
