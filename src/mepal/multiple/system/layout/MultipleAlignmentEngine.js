export function alignMultipleModules(modules, moduleIds, axis = 'base') {
  const ids = new Set(moduleIds);
  const reference = modules.find((module) => ids.has(module.moduleId));
  if (!reference) return structuredClone(modules);
  const key = axis === 'base' || axis === 'height' ? 'y' : axis === 'x' || axis === 'z' ? axis : null;
  if (!key) throw new Error('MULTIPLE_INVALID_ALIGNMENT_AXIS');
  const top = Number(reference.position.y || 0) + Number(reference.config?.heightCm || 0) / 100;
  return modules.map((module) => ids.has(module.moduleId) ? { ...structuredClone(module), position: { ...module.position, [key]: axis === 'height' ? top - Number(module.config?.heightCm || 0) / 100 : reference.position[key] } } : structuredClone(module));
}
