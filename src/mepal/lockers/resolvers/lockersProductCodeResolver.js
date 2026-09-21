import { lockerBodyCatalog, lockerBayCatalog, LOCKER_COLUMNS } from '../catalog/lockerCatalog.js';

export function resolveLockerProductCode(config) {
  const body = lockerBodyCatalog.find(r => r.calibre === config.calibre && r.type === config.lockerType &&
    r.heightMm === config.heightMm && r.widthMm === config.widthMm && r.depthMm === config.depthMm);
  // A kit is sold per column. Locker!E4,H4,C11 explicitly assign the same kit to
  // individual/double/triple columns, with its requested width in the order notes.
  const bay = body && lockerBayCatalog.find(r => r.calibre === config.calibre &&
    r.material === config.material && r.bayCount === config.bayCount && r.heightMm === config.heightMm && r.active);
  return { supported: Boolean(body && bay), code: body && bay ? body.code : null, body, bay,
    columns: LOCKER_COLUMNS[config.lockerType] || 0,
    diagnostics: body && bay ? [] : [{ code: 'LOCKER_CODE_NOT_DOCUMENTED', severity: 'ERROR',
      message: !body ? 'No existe coraza activa con estas medidas nominales.' : 'No existe kit de naves activo para esta configuración.' }] };
}
