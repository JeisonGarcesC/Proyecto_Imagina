import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTexture } from './textureStorage.js';

const ROOT = fileURLToPath(new URL('../../assets/special-finishes/predefined/', import.meta.url));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^(walls|floors)\/[a-z0-9_-]+\.(jpg|jpeg|png)$/;
const CATEGORIES = new Set(['WALL', 'FLOOR']);
const SCOPES = new Set(['WALL', 'COLUMN', 'FLOOR']);

function checkedImage(root, relativePath) {
  if (!FILE.test(relativePath)) throw new Error(`Imagen predeterminada inválida: ${relativePath}`);
  const filename = path.join(root, relativePath);
  const mimeType = /\.png$/i.test(relativePath) ? 'image/png' : 'image/jpeg';
  const bytes = readFileSync(filename);
  const metadata = validateTexture(bytes, mimeType, path.basename(relativePath));
  return { filename, ...metadata };
}

export function createPredefinedCatalog(manifest, root = ROOT) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.items)) {
    throw new Error('Manifiesto de Acabados Especiales inválido.');
  }
  const finishes = [];
  const assets = new Map();
  const ids = new Set();
  for (const item of manifest.items) {
    if (!UUID.test(item?.id) || ids.has(item.id) || !String(item.name || '').trim() ||
      !CATEGORIES.has(item.category) || !Array.isArray(item.compatibleScopes) ||
      !item.compatibleScopes.length || item.compatibleScopes.some((scope) => !SCOPES.has(scope)) ||
      !Number.isFinite(item.suggestedTileWidth) || item.suggestedTileWidth < 0.01 ||
      item.suggestedTileWidth > 10 || !Array.isArray(item.revisions) || !item.revisions.length) {
      throw new Error(`Definición predeterminada inválida: ${item?.id || '(sin ID)'}`);
    }
    ids.add(item.id);
    const revisions = new Set();
    let current = null;
    for (const version of item.revisions) {
      if (!Number.isInteger(version?.revision) || version.revision < 1 ||
        revisions.has(version.revision) || !UUID.test(version.assetId) || assets.has(version.assetId) ||
        !Number.isInteger(version.assetVersion) || version.assetVersion < 1) {
        throw new Error(`Revisión predeterminada inválida: ${item.id}`);
      }
      revisions.add(version.revision);
      const image = checkedImage(root, version.image);
      const preview = checkedImage(root, version.preview);
      if (preview.byteSize > 128 * 1024) throw new Error(`Preview demasiado grande: ${item.id}`);
      const asset = { id: version.assetId, version: version.assetVersion,
        mimeType: image.mimeType, byteSize: image.byteSize, width: image.width, height: image.height,
        filename: image.filename, previewFilename: preview.filename, previewMimeType: preview.mimeType,
        source: 'PREDEFINED' };
      assets.set(asset.id, asset);
      if (!current || version.revision > current.revision) current = { revision: version.revision, asset };
    }
    finishes.push(Object.freeze({ id: item.id, name: item.name, type: 'TEXTURE', source: 'PREDEFINED',
      revision: current.revision, category: item.category,
      compatibleScopes: Object.freeze([...new Set(item.compatibleScopes)]),
      suggestedTileWidth: item.suggestedTileWidth,
      asset: Object.freeze({ id: current.asset.id, version: current.asset.version,
        mimeType: current.asset.mimeType, byteSize: current.asset.byteSize,
        width: current.asset.width, height: current.asset.height,
        url: `/special-finishes/textures/${current.asset.id}` }) }));
  }
  const byId = new Map(finishes.map((finish) => [finish.id, finish]));
  return Object.freeze({
    list(search = '') {
      const query = String(search).trim().toLocaleLowerCase('es');
      if (query.length > 160) throw Object.assign(new Error('Búsqueda demasiado larga.'),
        { status: 400, code: 'INVALID_SEARCH' });
      const items = finishes.filter((finish) => !query || finish.name.toLocaleLowerCase('es').includes(query));
      return { items, total: items.length };
    },
    getFinish(id) { return byId.get(id) || null; },
    getAsset(id) { return assets.get(id) || null; },
  });
}

export const predefinedCatalog = createPredefinedCatalog(
  JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')), ROOT);
