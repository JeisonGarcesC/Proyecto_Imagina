import { validateMultipleCoreRules } from '../rules/core/multipleCoreRules.js';
import { findMultipleSystemOverlaps } from './MultipleLayoutEngine.js';
import { validateMultipleConnection } from './connections/multipleConnectionRules.js';

export function validateMultipleSystem(system = {}) {
  const diagnostics = []; const modules = system.modules || [];
  if (!modules.length) diagnostics.push({ code: 'MULTIPLE_SYSTEM_REQUIRES_MODULES', level: 'ERROR' });
  const moduleIds = new Set(); const instanceIds = new Set();
  for (const module of modules) {
    if (moduleIds.has(module.moduleId) || instanceIds.has(module.instanceId)) diagnostics.push({ code: 'MULTIPLE_SYSTEM_DUPLICATE_MODULE_ID', level: 'ERROR', moduleId: module.moduleId });
    moduleIds.add(module.moduleId); instanceIds.add(module.instanceId);
    const validation = validateMultipleCoreRules(module.config);
    diagnostics.push(...validation.diagnostics.map((item) => ({ ...item, moduleId: module.moduleId })));
  }
  for (const connection of system.connections || []) diagnostics.push(...validateMultipleConnection(connection, modules).diagnostics.map((item) => ({ ...item, connectionId: connection.connectionId })));
  for (const moduleIdsPair of findMultipleSystemOverlaps(modules)) diagnostics.push({ code: 'MULTIPLE_SYSTEM_MODULE_OVERLAP', level: 'ERROR', moduleIds: moduleIdsPair });
  return { valid: !diagnostics.some((item) => item.level === 'ERROR'), diagnostics };
}
