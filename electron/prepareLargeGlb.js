import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const PREPARE_GLB_ABOVE = 1536 * 1024 * 1024;
export const PREPARED_BIN_LIMIT = 256 * 1024 * 1024;
const COPY_CHUNK = 1024 * 1024;
const sha = () => createHash('sha256');

async function readExact(handle, length, position) {
  const buffer = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const { bytesRead } = await handle.read(buffer, offset, length - offset, position + offset);
    if (!bytesRead) throw new Error('El GLB terminó antes de lo indicado por su cabecera.');
    offset += bytesRead;
  }
  return buffer;
}

async function writeExact(handle, data, position) {
  let offset = 0;
  while (offset < data.length) {
    const { bytesWritten } = await handle.write(data, offset, data.length - offset, position + offset);
    if (!bytesWritten) throw new Error('No se pudo escribir el buffer derivado.');
    offset += bytesWritten;
  }
}

function validateReferences(json) {
  const views = json.bufferViews || [];
  for (const [index, accessor] of (json.accessors || []).entries()) {
    for (const view of [accessor.bufferView, accessor.sparse?.indices?.bufferView, accessor.sparse?.values?.bufferView]) {
      if (view != null && (!Number.isInteger(view) || !views[view])) throw new Error(`Accessor ${index}: bufferView inválido.`);
    }
  }
  for (const [index, image] of (json.images || []).entries()) {
    if (image.bufferView != null && !views[image.bufferView]) throw new Error(`Imagen ${index}: bufferView inválido.`);
  }
}

export async function prepareLargeGlb(sourceGlb, destinationDirectory, assetRef, { binLimit = PREPARED_BIN_LIMIT } = {}) {
  if (!/^[0-9a-f-]{36}$/.test(assetRef) || !Number.isSafeInteger(binLimit) || binLimit < 4 || binLimit > PREPARED_BIN_LIMIT) {
    throw new Error('Parámetros de preparación inválidos.');
  }
  const source = await open(sourceGlb, 'r');
  const generated = [];
  try {
    const size = (await source.stat()).size;
    const header = await readExact(source, 20, 0);
    if (header.toString('ascii', 0, 4) !== 'glTF' || header.readUInt32LE(4) !== 2 || header.readUInt32LE(8) !== size || header.readUInt32LE(16) !== 0x4e4f534a) {
      throw new Error('Cabecera GLB o chunk JSON inválido.');
    }
    const jsonLength = header.readUInt32LE(12);
    if (jsonLength < 2 || jsonLength > 256 * 1024 * 1024 || jsonLength % 4 || 20 + jsonLength + 8 > size) throw new Error('Tamaño JSON GLB inválido.');
    const json = JSON.parse((await readExact(source, jsonLength, 20)).toString('utf8'));
    const binHeader = await readExact(source, 8, 20 + jsonLength);
    const binLength = binHeader.readUInt32LE(0);
    const binStart = 28 + jsonLength;
    if (binHeader.readUInt32LE(4) !== 0x004e4942 || binStart + binLength !== size || binLength % 4) throw new Error('Chunk BIN GLB inválido.');
    if (!Array.isArray(json.buffers) || json.buffers.length !== 1 || json.buffers[0].uri != null || !Array.isArray(json.bufferViews)) {
      throw new Error('El GLB requiere una disposición de buffers no compatible con la preparación estructural.');
    }
    if (json.extensionsRequired?.length || json.extensionsUsed?.some((name) => name === 'EXT_meshopt_compression' || name === 'KHR_draco_mesh_compression')) {
      throw new Error('El GLB usa extensiones de buffer que requieren otra estrategia de preparación.');
    }
    validateReferences(json);
    const originalViews = json.bufferViews;
    for (const [index, view] of originalViews.entries()) {
      const offset = view.byteOffset || 0;
      if (view.buffer !== 0 || !Number.isSafeInteger(offset) || !Number.isSafeInteger(view.byteLength)
        || offset < 0 || view.byteLength < 0 || offset + view.byteLength > json.buffers[0].byteLength
        || offset + view.byteLength > binLength || view.byteLength > binLimit) {
        throw new Error(`bufferView ${index} no cabe íntegro en un buffer de ${binLimit} bytes.`);
      }
    }
    await mkdir(destinationDirectory, { recursive: true });
    const buffer = Buffer.alloc(COPY_CHUNK);
    const sourceUseful = sha();
    const outputUseful = sha();
    const files = [];
    let destination = null;
    let current = null;
    async function closeCurrent() {
      if (!destination) return;
      await destination.close();
      const name = current.name;
      const filePath = path.join(destinationDirectory, name);
      if ((await stat(filePath)).size !== current.size) throw new Error(`Tamaño incorrecto en ${name}.`);
      const diskHash = sha();
      const check = await open(filePath, 'r');
      try {
        for (let pos = 0; pos < current.size; pos += buffer.length) {
          diskHash.update(await readExact(check, Math.min(buffer.length, current.size - pos), pos));
        }
      } finally { await check.close(); }
      const sha256 = current.hash.digest('hex');
      if (diskHash.digest('hex') !== sha256) throw new Error(`Hash incorrecto en ${name}.`);
      files.push({ name, size: current.size, sha256 });
      destination = null;
      current = null;
    }
    try {
      for (const [index, view] of originalViews.entries()) {
        let position = current ? (current.size + 3) & ~3 : 0;
        if (current && position + view.byteLength > binLimit) { await closeCurrent(); position = 0; }
        if (!destination) {
          const name = `buffer-${String(files.length + 1).padStart(3, '0')}.bin`;
          destination = await open(path.join(destinationDirectory, name), 'wx');
          generated.push(name);
          current = { name, size: 0, hash: sha() };
        }
        const padding = position - current.size;
        if (padding) {
          const pad = Buffer.alloc(padding);
          await writeExact(destination, pad, current.size);
          current.hash.update(pad);
        }
        const oldOffset = view.byteOffset || 0;
        let copied = 0;
        while (copied < view.byteLength) {
          const length = Math.min(buffer.length, view.byteLength - copied);
          const data = await readExact(source, length, binStart + oldOffset + copied);
          sourceUseful.update(data);
          await writeExact(destination, data, position + copied);
          current.hash.update(data);
          outputUseful.update(data);
          copied += length;
        }
        current.size = position + view.byteLength;
        view.buffer = files.length;
        view.byteOffset = position;
        if (view.byteOffset + view.byteLength > binLimit) throw new Error(`bufferView ${index} excede el límite.`);
      }
      await closeCurrent();
    } finally { if (destination) await destination.close(); }
    json.buffers = files.map(({ name, size: byteLength }) => ({ byteLength, uri: name }));
    for (const [index, view] of json.bufferViews.entries()) {
      if (!json.buffers[view.buffer] || view.byteOffset + view.byteLength > json.buffers[view.buffer].byteLength) throw new Error(`bufferView ${index} remapeado fuera de rango.`);
    }
    validateReferences(json);
    const usefulSha256 = sourceUseful.digest('hex');
    if (usefulSha256 !== outputUseful.digest('hex')) throw new Error('La secuencia de bytes útiles no coincide.');
    const modelName = 'model.gltf';
    const modelPath = path.join(destinationDirectory, modelName);
    const modelBytes = JSON.stringify(json);
    const model = await open(modelPath, 'wx');
    generated.push(modelName);
    try { await model.writeFile(modelBytes); } finally { await model.close(); }
    JSON.parse(await readFile(modelPath, 'utf8'));
    const binHash = sha();
    for (let pos = 0; pos < binLength; pos += buffer.length) binHash.update(await readExact(source, Math.min(buffer.length, binLength - pos), binStart + pos));
    const modelHash = sha().update(modelBytes).digest('hex');
    return { kind: 'split-gltf-v1', files: [{ name: modelName, size: (await stat(modelPath)).size, sha256: modelHash }, ...files], binSha256: binHash.digest('hex'), usefulSha256, binLength, jsonLength };
  } catch (error) {
    const { rm } = await import('node:fs/promises');
    for (const name of generated) await rm(path.join(destinationDirectory, name), { force: true });
    throw error;
  } finally { await source.close(); }
}
