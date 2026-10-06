import { getMultipleConnectionPoints } from './MultipleConnectionResolver.js';
import { detectMultipleCollisions } from './MultipleCollisionEngine.js';

export function getMultipleLayoutDiagnostics(modules = [], connections = []) {
  const byId = new Map(modules.map((module) => [module.moduleId, module]));
  const diagnostics = detectMultipleCollisions(modules).map((item) => ({ code: item.type, level: item.severity, ...item }));
  for (const connection of connections) {
    const a = byId.get(connection.from?.moduleId || connection.moduleA);
    const b = byId.get(connection.to?.moduleId || connection.moduleB);
    if (!a || !b) continue;
    const context = { moduleA: a.moduleId, moduleB: b.moduleId, connectionId: connection.connectionId };
    if (Number(a.config?.heightCm) !== Number(b.config?.heightCm)) diagnostics.push({ code: 'MULTIPLE_HEIGHT_MISMATCH', level: 'WARNING', ...context });
    if (Number(a.config?.thicknessCm) !== Number(b.config?.thicknessCm)) diagnostics.push({ code: 'MULTIPLE_THICKNESS_MISMATCH', level: 'WARNING', ...context });
    if (connection.from?.point || connection.to?.point) {
      const pa = getMultipleConnectionPoints(a).find((point) => point.id === connection.from?.point);
      const pb = getMultipleConnectionPoints(b).find((point) => point.id === connection.to?.point);
      if (!pa || !pb || !pa.compatibleWith.includes(pb.type) || !pb.compatibleWith.includes(pa.type)) diagnostics.push({ code: 'MULTIPLE_INVALID_CONNECTION', level: 'WARNING', ...context });
    }
  }
  return diagnostics;
}
