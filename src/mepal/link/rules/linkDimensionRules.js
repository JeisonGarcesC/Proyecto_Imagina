export function nominalCeiling(value, values) {
  const nominal = values.find(n => n >= value);
  if (!nominal) throw new Error('Dimensión LINK fuera de catálogo.');
  return nominal;
}
// Puesto especial: por encima del mayor nominal del catálogo se factura con el mayor código disponible (la medida real se conserva en la geometría).
export function nominalCeilingClamped(value, values) {
  return values.find(n => n >= value) ?? values[values.length - 1];
}

