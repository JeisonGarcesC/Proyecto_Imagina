const TYPES = new Set(['LINEAR', 'CORNER_90', 'ENCOUNTER', 'CONTINUITY']);
const quarterTurn = Math.PI / 2;
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function validateMultipleConnection(connection, modules = []) {
  const diagnostics = []; const byId = new Map(modules.map((module) => [module.moduleId, module]));
  const from = byId.get(connection?.from?.moduleId); const to = byId.get(connection?.to?.moduleId);
  if (!from || !to || from === to) diagnostics.push({ code: 'MULTIPLE_SYSTEM_INVALID_CONNECTION_MODULE', level: 'ERROR' });
  if (!TYPES.has(connection?.type)) diagnostics.push({ code: 'MULTIPLE_SYSTEM_CONNECTION_TYPE_NOT_SUPPORTED', level: 'ERROR' });
  if (from && to) {
    if (Number(from.config?.heightCm) !== Number(to.config?.heightCm)) diagnostics.push({ code: 'MULTIPLE_SYSTEM_CONNECTION_HEIGHT_MISMATCH', level: 'ERROR' });
    if (Number(from.config?.thicknessCm) !== Number(to.config?.thicknessCm)) diagnostics.push({ code: 'MULTIPLE_SYSTEM_CONNECTION_THICKNESS_MISMATCH', level: 'ERROR' });
    const distance = angleDistance(Number(from.rotation?.y || 0), Number(to.rotation?.y || 0));
    if (connection.type === 'CORNER_90' && Math.abs(distance - quarterTurn) > 1e-4) diagnostics.push({ code: 'MULTIPLE_SYSTEM_CONNECTION_ORIENTATION_MISMATCH', level: 'ERROR' });
    if (['LINEAR', 'CONTINUITY'].includes(connection.type) && distance > 1e-4) diagnostics.push({ code: 'MULTIPLE_SYSTEM_CONNECTION_ORIENTATION_MISMATCH', level: 'ERROR' });
  }
  return { valid: !diagnostics.some((item) => item.level === 'ERROR'), diagnostics };
}
