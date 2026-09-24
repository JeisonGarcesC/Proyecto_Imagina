import { lockerAccessoryCatalog } from '../catalog/lockerCatalog.js';
const error = (code, message) => ({ supported: false, code: null, diagnostics: [{ code, message, severity: 'ERROR' }] });
const none = () => ({ supported: true, code: null, diagnostics: [] });
function accessory(code, calibre) {
  const entry = lockerAccessoryCatalog.find(r => r.code === code && r.calibre === calibre);
  return entry ? { supported: true, code, entry, diagnostics: [] } : error('LOCKER_CODE_NOT_DOCUMENTED', 'Accesorio sin código documentado.');
}
export function resolveLockerHandle(c) {
  if (c.handleType === 'SIN_MANIJA') return none();
  if (c.securityType === 'CLAVE_4_DIGITOS') return error('LOCKER_INVALID_HANDLE', 'La cerradura de clave requiere SIN MANIJA (referencia CM).');
  const wood = ['FORMICA', 'MELAMINA'].includes(c.material);
  const codes = { EMBEBIDA: wood ? '22000128773' : '22000128634', BOTON: wood ? '22000128769' : '22000128635',
    SCHWINN: wood ? '22000128770' : '22000128636', INCRUSTAR: '22000128637' };
  return codes[c.handleType] ? accessory(codes[c.handleType], c.calibre) : error('LOCKER_INVALID_HANDLE', 'Manija no documentada.');
}
export function resolveLockerSecurity(c) {
  if (['ARMSTRONG', 'TIMBERLINE'].includes(c.securityType)) return error('LOCKER_CODE_NOT_DOCUMENTED', `${c.securityType}: referencia técnica sin código específico en el Excel; no se sustituye.`);
  if (c.material === 'METALICA_EMBEBIDA') return c.securityType === 'NO_APLICA' ? none() : error('LOCKER_INVALID_SECURITY', 'La matriz indica NO APLICA para nave embebida.');
  if (c.securityType === 'PORTACANDADO' && ['FORMICA', 'MELAMINA'].includes(c.material)) return error('LOCKER_INVALID_SECURITY', 'Formica y Melamina no admiten portacandado (Locker!D14).');
  const codes = { CERRADURA: '22000128772', PORTACANDADO: '22000128771', CLAVE_4_DIGITOS: '22000129820' };
  return codes[c.securityType] ? accessory(codes[c.securityType], c.calibre) : error('LOCKER_INVALID_SECURITY', 'Seguridad no documentada para esta nave.');
}
export function resolveLockerPunching(c) {
  const metal = ['METALICA', 'METALICA_EMBEBIDA'].includes(c.material);
  const valid = metal
    ? (c.punchingType === 'LISO' && c.punchingPosition === 'NO_APLICA') ||
      (['TIPO_1', 'TIPO_2', 'TIPO_3', 'TIPO_4'].includes(c.punchingType) && ['ARRIBA', 'ABAJO', 'ARRIBA_Y_ABAJO'].includes(c.punchingPosition))
    : c.punchingType === 'NO_APLICA' && c.punchingPosition === 'NO_APLICA';
  return valid ? { ...none(), type: c.punchingType, position: c.punchingPosition } : error('LOCKER_INVALID_PUNCHING', 'Troquelado o posición incompatibles con el material.');
}
export function resolveLockerAccessories(c) {
  const result = { handle: resolveLockerHandle(c), security: resolveLockerSecurity(c), punching: resolveLockerPunching(c) };
  if (c.extraShelves) result.shelf = accessory(c.calibre === 22 ? '22000128630' : '22000129672', c.calibre);
  // Locker!E8 explicitly uses the triple plinth for a double body wider than 80 cm.
  if (c.plinth) result.plinth = accessory(c.lockerType === 'INDIVIDUAL' ? '22000128631' : c.widthMm <= 800 ? '22000128632' : '22000128633', c.calibre);
  if (c.viewer) result.viewer = accessory('22000111072', c.calibre);
  if (c.anchor) result.anchor = error('LOCKER_CODE_NOT_DOCUMENTED', 'Kit anclaje: documentado en ficha técnica, sin código comercial en el Excel.');
  return result;
}
