import { writeAudit } from '../audit/auditService.js';
import { storeTexture, removeFailedUpload } from './textureStorage.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const include = { createdBy: { select: { id: true, displayName: true } }, asset: { select: {
  id: true, mimeType: true, byteSize: true, width: true, height: true, version: true, createdAt: true,
} } };

function fail(status, code, message) { throw Object.assign(new Error(message), { status, code }); }
function checkId(id) { if (!uuid.test(String(id))) fail(400, 'INVALID_ID', 'Identificador inválido.'); }

export function finishDto(row) {
  return { id: row.id, name: row.name, type: row.type, revision: row.revision,
    rgb: row.type === 'RGB' ? { r: row.rgbR, g: row.rgbG, b: row.rgbB } : null,
    asset: row.asset ? { ...row.asset, url: `/special-finishes/textures/${row.asset.id}` } : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt, deletedAt: row.deletedAt };
}

export async function listSpecialFinishes(db, query = {}) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    fail(400, 'INVALID_PAGINATION', 'Paginación inválida.');
  }
  const search = String(query.search || '').trim();
  if (search.length > 160) fail(400, 'INVALID_SEARCH', 'Búsqueda demasiado larga.');
  const where = { deletedAt: null, ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [total, rows] = await db.$transaction([
    db.specialFinish.count({ where }),
    db.specialFinish.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items: rows.map(finishDto), total, page, pageSize };
}

export async function getSpecialFinish(db, id) {
  checkId(id);
  const row = await db.specialFinish.findUnique({ where: { id }, include });
  if (!row) fail(404, 'SPECIAL_FINISH_NOT_FOUND', 'Acabado no encontrado.');
  return finishDto(row);
}

export async function createSpecialFinish(db, body, actor, context = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => !['name', 'type', 'rgb', 'assetId'].includes(key))) {
    fail(422, 'INVALID_FINISH', 'Datos de acabado inválidos.');
  }
  const name = String(body.name || '').trim();
  if (!name || name.length > 160) fail(422, 'INVALID_NAME', 'Nombre inválido.');
  if (!['RGB', 'TEXTURE'].includes(body.type)) fail(422, 'INVALID_TYPE', 'Tipo inválido.');
  const isRgb = body.type === 'RGB';
  if (isRgb) {
    if (body.assetId !== undefined || !body.rgb || typeof body.rgb !== 'object' || Array.isArray(body.rgb)
      || Object.keys(body.rgb).sort().join(',') !== 'b,g,r'
      || !['r', 'g', 'b'].every((key) => Number.isInteger(body.rgb[key]) && body.rgb[key] >= 0 && body.rgb[key] <= 255)) {
      fail(422, 'INVALID_RGB', 'RGB debe contener r, g y b entre 0 y 255.');
    }
  } else if (body.rgb !== undefined || !uuid.test(String(body.assetId || ''))) {
    fail(422, 'INVALID_ASSET', 'Se requiere assetId válido.');
  }
  return db.$transaction(async (tx) => {
    if (!isRgb) {
      const asset = await tx.specialFinishAsset.findUnique({ where: { id: body.assetId }, include: { finish: true } });
      if (!asset || asset.uploadedById !== actor.userId || asset.finish) fail(422, 'INVALID_ASSET', 'Recurso no disponible.');
    }
    const row = await tx.specialFinish.create({ data: { name, type: body.type,
      rgbR: isRgb ? body.rgb.r : null, rgbG: isRgb ? body.rgb.g : null, rgbB: isRgb ? body.rgb.b : null,
      assetId: isRgb ? null : body.assetId, createdById: actor.userId }, include });
    await writeAudit(tx, { actorUserId: actor.userId, action: 'SPECIAL_FINISH_CREATED', targetType: 'SPECIAL_FINISH',
      targetId: row.id, after: { name: row.name, type: row.type, revision: row.revision,
        rgb: isRgb ? body.rgb : undefined, assetId: row.assetId }, ...context });
    return finishDto(row);
  });
}

export async function archiveSpecialFinish(db, id, actor, context = {}) {
  checkId(id);
  return db.$transaction(async (tx) => {
    const row = await tx.specialFinish.findUnique({ where: { id }, include });
    if (!row) fail(404, 'SPECIAL_FINISH_NOT_FOUND', 'Acabado no encontrado.');
    if (row.deletedAt) fail(409, 'SPECIAL_FINISH_ARCHIVED', 'El acabado ya está archivado.');
    const deletedAt = new Date();
    const updated = await tx.specialFinish.updateMany({ where: { id, deletedAt: null }, data: { deletedAt } });
    if (updated.count !== 1) fail(409, 'SPECIAL_FINISH_ARCHIVED', 'El acabado ya está archivado.');
    await writeAudit(tx, { actorUserId: actor.userId, action: 'SPECIAL_FINISH_DELETED', targetType: 'SPECIAL_FINISH',
      targetId: id, before: { name: row.name, type: row.type, assetId: row.assetId, deletedAt: null },
      after: { deletedAt: deletedAt.toISOString() }, ...context });
    return { id, archived: true };
  });
}

export async function uploadSpecialFinishTexture(db, bytes, mimeType, filename, actor) {
  const stored = await storeTexture(bytes, mimeType, filename);
  try {
    const row = await db.specialFinishAsset.create({ data: { ...stored, uploadedById: actor.userId } });
    return { id: row.id, mimeType: row.mimeType, byteSize: row.byteSize, width: row.width,
      height: row.height, version: row.version, url: `/special-finishes/textures/${row.id}` };
  } catch (error) {
    await removeFailedUpload(stored.storageKey);
    throw error;
  }
}

export async function getSpecialFinishTexture(db, id) {
  checkId(id);
  const asset = await db.specialFinishAsset.findUnique({ where: { id } });
  if (!asset) fail(404, 'TEXTURE_NOT_FOUND', 'Textura no encontrada.');
  return asset;
}
