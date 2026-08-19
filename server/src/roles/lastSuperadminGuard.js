export const SUPERADMIN_ROLE_KEY = 'SUPERADMIN';

export function assertCanRemoveActiveSuperadmin({
  targetIsActiveSuperadmin,
  activeSuperadminCount,
} = {}) {
  if (targetIsActiveSuperadmin && Number(activeSuperadminCount) <= 1) {
    const error = new Error('La operación dejaría al sistema sin un SUPERADMIN activo.');
    error.code = 'LAST_SUPERADMIN_REQUIRED';
    throw error;
  }
  return true;
}

// Los endpoints futuros deben contar y mutar dentro de una misma transacción
// serializable para impedir carreras entre dos operaciones administrativas.
