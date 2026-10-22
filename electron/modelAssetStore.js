import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const REF_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GLB_MIME = 'model/gltf-binary';

export function isModelAssetRef(value) {
  return REF_PATTERN.test(String(value || ''));
}

function fail(message) { throw new Error(message); }

async function verifyGlb(filePath, expectedSize) {
  const file = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await file.read(header, 0, 12, 0);
    if (bytesRead !== 12 || header.toString('ascii', 0, 4) !== 'glTF'
      || header.readUInt32LE(4) !== 2 || header.readUInt32LE(8) !== expectedSize) {
      fail('El GLB está corrupto o su cabecera no coincide con el tamaño del archivo.');
    }
  } finally { await file.close(); }
}

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function refsInProject(project) {
  if (!project || !Array.isArray(project.entities)) fail('Proyecto sin entidades válidas.');
  return project.entities.filter((entity) => entity?.kind === 'IMPORTED_MODEL'
    && entity.metadata?.assetRef).map((entity) => ({
      ref: entity.metadata.assetRef,
      name: entity.metadata.fileName || 'Modelo importado',
      size: entity.metadata.assetSize,
      hash: entity.metadata.assetSha256,
    }));
}

export class ModelAssetStore {
  constructor(stagingDir) {
    this.stagingDir = path.resolve(stagingDir);
    this.projectDir = null;
    this.allowed = new Map();
  }

  clearProject() {
    this.projectDir = null;
    this.allowed.clear();
  }

  async importGlb(sourcePath, fileName) {
    if (!path.isAbsolute(sourcePath) || !/\.glb$/i.test(String(fileName || '')))
      fail('Selecciona un archivo GLB válido.');
    const source = await realpath(sourcePath);
    const sourceInfo = await stat(source);
    if (!sourceInfo.isFile() || sourceInfo.size <= 0 || sourceInfo.size > 0xffffffff)
      fail('El GLB no tiene un tamaño válido para su cabecera.');
    await verifyGlb(source, sourceInfo.size);
    await mkdir(this.stagingDir, { recursive: true });
    const assetRef = randomUUID();
    const target = path.join(this.stagingDir, `${assetRef}.glb`);
    const hash = createHash('sha256');
    try {
      await pipeline(
        createReadStream(source),
        new Transform({ transform(chunk, _encoding, callback) {
          hash.update(chunk); callback(null, chunk);
        } }),
        createWriteStream(target, { flags: 'wx', mode: 0o600 })
      );
      const size = (await stat(target)).size;
      if (size !== sourceInfo.size) fail('La copia del GLB quedó incompleta.');
      const metadata = {
        assetRef, fileName: String(fileName).slice(0, 255), format: 'glb',
        assetMimeType: GLB_MIME, assetSize: size, assetSha256: hash.digest('hex'),
      };
      this.allowed.set(assetRef, metadata);
      return metadata;
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
  }

  async resolvePath(assetRef) {
    if (!isModelAssetRef(assetRef) || !this.allowed.has(assetRef)) fail('Referencia de modelo no autorizada.');
    const name = `${assetRef}.glb`;
    for (const directory of [this.projectDir && path.join(this.projectDir, 'assets', 'modelos'), this.stagingDir]) {
      if (!directory) continue;
      const candidate = path.join(directory, name);
      try {
        const root = await realpath(directory);
        const resolved = await realpath(candidate);
        if (path.dirname(resolved) !== root || !(await lstat(candidate)).isFile()) continue;
        return resolved;
      } catch { /* buscar en el otro almacén */ }
    }
    fail(`No está disponible el asset ${assetRef}.`);
  }

  async verifyAsset(asset, filePath) {
    if (!isModelAssetRef(asset.ref)) fail(`Referencia inválida: ${asset.ref}.`);
    if (!Number.isSafeInteger(asset.size) || asset.size < 12 || asset.size > 0xffffffff
      || !/^[a-f0-9]{64}$/.test(String(asset.hash || ''))) fail('Metadatos de asset inválidos.');
    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile() || info.size !== asset.size) {
      fail(`Falta el modelo ${asset.name} (${asset.ref}) o su tamaño no coincide.`);
    }
    await verifyGlb(filePath, info.size);
    if (await hashFile(filePath) !== asset.hash)
      fail(`El modelo ${asset.name} (${asset.ref}) está corrupto.`);
  }

  async saveComplete(project, manifestPath) {
    if (!path.isAbsolute(manifestPath) || path.basename(manifestPath).toLowerCase() !== 'proyecto.json')
      fail('El manifiesto debe llamarse proyecto.json.');
    const projectDir = path.dirname(manifestPath);
    const modelsDir = path.join(projectDir, 'assets', 'modelos');
    const assets = refsInProject(project);
    await mkdir(modelsDir, { recursive: true });
    for (const asset of assets) {
      const source = await this.resolvePath(asset.ref);
      await this.verifyAsset(asset, source);
      const target = path.join(modelsDir, `${asset.ref}.glb`);
      if (path.resolve(source) !== path.resolve(target)) {
        const temporaryAsset = `${target}.${randomUUID()}.tmp`;
        try {
          await copyFile(source, temporaryAsset);
          await this.verifyAsset(asset, temporaryAsset);
          await rename(temporaryAsset, target);
        } finally { await rm(temporaryAsset, { force: true }); }
      }
      await this.verifyAsset(asset, target);
    }
    const temporary = `${manifestPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(project, null, 2), { flag: 'wx' });
      await rename(temporary, manifestPath);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    this.projectDir = projectDir;
    return { manifestPath, assetCount: assets.length };
  }

  async openComplete(manifestPath) {
    if (!path.isAbsolute(manifestPath) || path.basename(manifestPath).toLowerCase() !== 'proyecto.json')
      fail('Selecciona un proyecto.json válido.');
    if ((await stat(manifestPath)).size > 20 * 1024 * 1024) fail('El manifiesto excede 20 MiB.');
    const project = JSON.parse(await readFile(manifestPath, 'utf8'));
    const projectDir = path.dirname(manifestPath);
    const assets = refsInProject(project);
    for (const asset of assets) {
      const filePath = path.join(projectDir, 'assets', 'modelos', `${asset.ref}.glb`);
      const modelDir = await realpath(path.dirname(filePath));
      const resolved = await realpath(filePath);
      if (path.dirname(resolved) !== modelDir || !(await lstat(filePath)).isFile())
        fail(`Ruta de asset no autorizada: ${asset.ref}.`);
      await this.verifyAsset(asset, filePath);
    }
    this.projectDir = projectDir;
    this.allowed = new Map(assets.map((asset) => [asset.ref, asset]));
    return project;
  }
}
