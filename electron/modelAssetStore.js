import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { prepareLargeGlb, PREPARE_GLB_ABOVE } from './prepareLargeGlb.js';

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
      preparedRepresentation: entity.metadata.preparedRepresentation,
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

  async discardImported(assetRef) {
    if (!isModelAssetRef(assetRef) || this.allowed.get(assetRef)?.assetRef !== assetRef)
      fail('Referencia de importación no autorizada.');
    const stagedGlb = path.resolve(this.stagingDir, `${assetRef}.glb`);
    const stagedFolder = path.resolve(this.stagingDir, assetRef);
    if (path.dirname(stagedGlb) !== this.stagingDir || path.dirname(stagedFolder) !== this.stagingDir)
      fail('Ruta de importación no autorizada.');
    await rm(stagedGlb, { force: true });
    await rm(stagedFolder, { recursive: true, force: true });
    this.allowed.delete(assetRef);
    return true;
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
      if (size > PREPARE_GLB_ABOVE) {
        const preparedDir = path.join(this.stagingDir, assetRef);
        await mkdir(preparedDir, { recursive: true });
        await copyFile(target, path.join(preparedDir, 'original.glb'));
        try {
          metadata.preparedRepresentation = await prepareLargeGlb(target, preparedDir, assetRef);
          await rm(target, { force: true });
        } catch (error) {
          if (path.dirname(path.resolve(preparedDir)) === this.stagingDir) {
            await rm(preparedDir, { recursive: true, force: true });
          }
          throw error;
        }
      }
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
      for (const candidate of [path.join(directory, name), path.join(directory, assetRef, 'original.glb')]) try {
        const root = await realpath(path.dirname(candidate));
        const resolved = await realpath(candidate);
        if (path.dirname(resolved) !== root || !(await lstat(candidate)).isFile()) continue;
        return resolved;
      } catch { /* buscar en el otro almacén */ }
    }
    fail(`No está disponible el asset ${assetRef}.`);
  }

  async resolvePreparedPath(assetRef, fileName) {
    if (!isModelAssetRef(assetRef) || !this.allowed.has(assetRef)
      || !/^(model\.gltf|buffer-[0-9]{3}\.bin)$/.test(fileName)) fail('Recurso preparado no autorizado.');
    const asset = this.allowed.get(assetRef);
    if (!asset.preparedRepresentation?.files?.some((entry) => entry.name === fileName)) fail('Recurso preparado no declarado.');
    for (const base of [this.projectDir && path.join(this.projectDir, 'assets', 'modelos'), this.stagingDir]) {
      if (!base) continue;
      const directory = path.join(base, assetRef);
      const candidate = path.join(directory, fileName);
      try {
        const root = await realpath(directory);
        const resolved = await realpath(candidate);
        if (path.dirname(resolved) === root && (await lstat(candidate)).isFile()) return resolved;
      } catch { /* Buscar en el otro almacén. */ }
    }
    fail(`Falta ${fileName} del modelo ${assetRef}.`);
  }

  getLoadUrl(assetRef) {
    if (!isModelAssetRef(assetRef) || !this.allowed.has(assetRef)) fail('Referencia de modelo no autorizada.');
    const prepared = this.allowed.get(assetRef).preparedRepresentation?.kind === 'split-gltf-v1';
    return prepared
      ? `imagina-asset://model/${assetRef}/model.gltf`
      : `imagina-asset://model/${assetRef}.glb`;
  }

  isPrepared(assetRef) {
    return isModelAssetRef(assetRef) && this.allowed.get(assetRef)?.preparedRepresentation?.kind === 'split-gltf-v1';
  }

  async verifyPrepared(asset, baseDirectory) {
    const prepared = asset.preparedRepresentation;
    if (!prepared) return;
    if (prepared.kind !== 'split-gltf-v1' || !Array.isArray(prepared.files) || !prepared.files.length) fail('Metadatos de preparación inválidos.');
    const directory = path.join(baseDirectory, asset.ref);
    for (const entry of prepared.files) {
      if (!/^(model\.gltf|buffer-[0-9]{3}\.bin)$/.test(entry.name)
        || !Number.isSafeInteger(entry.size) || entry.size < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) fail('Recurso preparado inválido.');
      const filePath = path.join(directory, entry.name);
      const root = await realpath(directory).catch(() => fail(`Falta el derivado del modelo ${asset.name}.`));
      const resolved = await realpath(filePath).catch(() => fail(`Falta ${entry.name} del modelo ${asset.name}.`));
      if (path.dirname(resolved) !== root || !(await lstat(filePath)).isFile()
        || (await stat(filePath)).size !== entry.size || await hashFile(filePath) !== entry.sha256) {
        fail(`El recurso ${entry.name} del modelo ${asset.name} está corrupto.`);
      }
    }
    const original = path.join(directory, 'original.glb');
    await this.verifyAsset(asset, original);
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
      if (asset.preparedRepresentation) {
        const sourceDir = path.dirname(await this.resolvePreparedPath(asset.ref, 'model.gltf'));
        await this.verifyPrepared(asset, path.dirname(sourceDir));
        const targetDir = path.join(modelsDir, asset.ref);
        if (path.resolve(sourceDir) !== path.resolve(targetDir)) {
          const temporaryDir = `${targetDir}.${randomUUID()}.tmp`;
          try {
            await mkdir(temporaryDir, { recursive: true });
            for (const entry of ['original.glb', ...asset.preparedRepresentation.files.map(({ name }) => name)]) {
              await copyFile(path.join(sourceDir, entry), path.join(temporaryDir, entry));
            }
            await this.verifyAsset(asset, path.join(temporaryDir, 'original.glb'));
            if (await stat(targetDir).then(() => true, () => false)) fail(`Ya existe un derivado del modelo ${asset.name} en el destino.`);
            await rename(temporaryDir, targetDir);
          } finally {
            if (path.dirname(path.resolve(temporaryDir)) === path.resolve(modelsDir)
              && path.basename(temporaryDir).startsWith(`${asset.ref}.`)) {
              await rm(temporaryDir, { recursive: true, force: true });
            }
          }
        }
        await this.verifyPrepared(asset, modelsDir);
        continue;
      }
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
      const modelsDir = path.join(projectDir, 'assets', 'modelos');
      const filePath = asset.preparedRepresentation
        ? path.join(modelsDir, asset.ref, 'original.glb') : path.join(modelsDir, `${asset.ref}.glb`);
      const modelDir = await realpath(path.dirname(filePath));
      const resolved = await realpath(filePath);
      if (path.dirname(resolved) !== modelDir || !(await lstat(filePath)).isFile())
        fail(`Ruta de asset no autorizada: ${asset.ref}.`);
      await this.verifyAsset(asset, filePath);
      if (asset.preparedRepresentation) await this.verifyPrepared(asset, modelsDir);
    }
    this.projectDir = projectDir;
    this.allowed = new Map(assets.map((asset) => [asset.ref, asset]));
    return project;
  }
}
