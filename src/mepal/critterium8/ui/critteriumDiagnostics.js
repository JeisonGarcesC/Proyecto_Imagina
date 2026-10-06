const descriptions = Object.freeze({
  INVALID_SEQUENCE_PAIR: 'Seleccione dos secuencias diferentes.',
  INCOMPATIBLE_DIMENSIONS: 'Los extremos tienen altura, espesor o modo incompatibles.',
  INCOMPATIBLE_ORIENTATION: 'La orientación de los extremos no permite esta conexión.',
  ORIENTATION_MISMATCH: 'La orientación no corresponde al tipo de conexión elegido.',
  CRITERIUM_SNAP_OUTSIDE_TOLERANCE: 'Acerque los extremos hasta que aparezca el marcador verde.',
  CRITERIUM_SPATIAL_POINT_MISSING: 'Falta un extremo físico de la conexión.',
  CRITERIUM_SPATIAL_POINTS_SEPARATED: 'Los extremos conectados se separaron.',
  CRITERIUM_SPATIAL_TYPE_MISMATCH: 'La orientación ya no coincide con la conexión guardada.',
  COLLISION_REAL: 'Dos módulos se atraviesan. Sepárelos para continuar.',
  NEAR_COLLISION: 'Dos módulos están muy cerca; revise el espacio disponible.',
  CRITTERIUM_MODULE_MISSING_FRAME: 'Un módulo no encuentra su frame físico.',
  CODE_WITHOUT_PRICE: 'Este código no tiene precio en la lista seleccionada; el total es parcial.',
  NO_COMMERCIAL_CODE: 'Falta un código comercial documentado para este componente.',
  FINISH_UNCONFIRMED: 'El acabado indicado no está validado en el catálogo comercial.',
  COMMERCIAL_CATALOG_CHANGED: 'Cambió un precio respecto de la cotización guardada.',
  COMMERCIAL_CODE_CHANGED: 'Cambió un código respecto de la cotización guardada.',
  COMMERCIAL_METADATA_CHANGED: 'Cambió una referencia, descripción, material o acabado comercial.',
  CURRENCY_UNCONFIRMED: 'La lista de precios no declara moneda.',
  CRITERIUM_FINISH_CATALOG_LIMITED: 'No hay un catálogo de acabados individuales validado para CRITERIUM 8.',
  CRITERIUM_DOOR_NOT_DOCUMENTED: 'No hay una puerta CRITERIUM 8 documentada en las fuentes actuales.',
  UNSUPPORTED_SPATIAL_TOPOLOGY: 'Esta unión necesita un anclaje físico que aún no está documentado.',
});

export function describeCritteriumDiagnostic(value) {
  const code = typeof value === 'string' ? value : value?.code || value?.reason;
  if (!code) return String(value ?? 'Diagnóstico desconocido');
  if (code.startsWith('NO_VALID_LAYOUT')) return 'No se encontró una disposición válida; se conservaron las posiciones anteriores.';
  return descriptions[code] || code;
}
