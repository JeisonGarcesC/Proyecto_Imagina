export function nominalCeiling(value, values) {
  const nominal = values.find(n => n >= value);
  if (!nominal) throw new Error('Dimensión LINK fuera de catálogo.');
  return nominal;
}

