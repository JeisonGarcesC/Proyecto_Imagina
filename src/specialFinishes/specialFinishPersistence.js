import { parseRgbValue } from '../materials/colorUtils.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function snapshotSpecialFinish(finish) {
  if (!UUID.test(String(finish?.id || '')) || !Number.isInteger(Number(finish?.revision))
    || Number(finish.revision) < 1) throw new Error('Identidad de acabado inválida.');
  const base = { specialFinishId: finish.id, revision: Number(finish.revision),
    name: String(finish.name || ''), type: finish.type };
  if (finish.type === 'RGB') {
    if (finish.rgb && typeof finish.rgb === 'object'
      && ['r', 'g', 'b'].every((channel) => Number.isInteger(finish.rgb[channel])
        && finish.rgb[channel] >= 0 && finish.rgb[channel] <= 255)) {
      return { ...base, r: finish.rgb.r, g: finish.rgb.g, b: finish.rgb.b };
    }
    const color = parseRgbValue(finish.rgb);
    if (!color) throw new Error('Color de acabado inválido.');
    const value = color.getHexString();
    return { ...base, r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
  }
  if (finish.type === 'TEXTURE' && UUID.test(String(finish.asset?.id || ''))) {
    return { ...base, assetId: finish.asset.id, assetVersion: Number(finish.asset.version) || 1 };
  }
  throw new Error('Recurso de acabado inválido.');
}

export function normalizeSpecialFinishRecord(record) {
  const snapshot = record?.snapshot;
  if (record?.source !== 'SPECIAL_FINISH' || !snapshot
    || !UUID.test(String(record.specialFinishId || ''))
    || record.specialFinishId !== snapshot.specialFinishId
    || !Number.isInteger(record.revision) || record.revision < 1
    || record.revision !== snapshot.revision) return null;
  if (snapshot.type === 'RGB') {
    if (![snapshot.r, snapshot.g, snapshot.b].every((value) =>
      Number.isInteger(value) && value >= 0 && value <= 255)) return null;
    return { source: 'SPECIAL_FINISH', specialFinishId: record.specialFinishId,
      revision: record.revision, scope: record.scope === 'ALL' ? 'ALL' : 'PART',
      snapshot: { specialFinishId: snapshot.specialFinishId, revision: snapshot.revision,
        name: String(snapshot.name || ''), type: 'RGB',
        r: snapshot.r, g: snapshot.g, b: snapshot.b } };
  }
  if (snapshot.type === 'TEXTURE' && UUID.test(String(snapshot.assetId || ''))) {
    return { source: 'SPECIAL_FINISH', specialFinishId: record.specialFinishId,
      revision: record.revision, scope: record.scope === 'ALL' ? 'ALL' : 'PART',
      snapshot: { specialFinishId: snapshot.specialFinishId, revision: snapshot.revision,
        name: String(snapshot.name || ''), type: 'TEXTURE', assetId: snapshot.assetId,
        assetVersion: Number(snapshot.assetVersion) || 1 } };
  }
  return null;
}

export function finishFromSnapshot(snapshot) {
  const record = normalizeSpecialFinishRecord({ source: 'SPECIAL_FINISH',
    specialFinishId: snapshot?.specialFinishId, revision: snapshot?.revision, snapshot });
  if (!record) throw new Error('Snapshot de acabado inválido.');
  const value = record.snapshot;
  return { id: value.specialFinishId, revision: value.revision, name: value.name,
    type: value.type, rgb: value.type === 'RGB'
      ? { r: value.r, g: value.g, b: value.b } : null,
    asset: value.type === 'TEXTURE' ? { id: value.assetId, version: value.assetVersion } : null };
}
