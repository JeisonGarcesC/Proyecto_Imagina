export function getVetroSystemBOM(system) {
  const rows = new Map();
  for (const component of system?.userData?.components || []) {
    if (component.included === true || !component.code) continue;
    const key = JSON.stringify([String(component.code), component.special || null, component.description || null]);
    const row = rows.get(key) || { code: String(component.code), quantity: 0, kind: component.kind, reference: component.reference, description: component.description || null, special: component.special || null };
    row.quantity += 1;
    rows.set(key, row);
  }
  return [...rows.values()];
}
