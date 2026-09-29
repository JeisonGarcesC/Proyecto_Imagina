const DOCUMENTED_WALL_TRAY = Object.freeze({ heightCm: 128, code: '22191300710', description: 'Kit llegada a pared con canaleta de 128 cm' });

export function buildMultipleCableTray(input = {}, panelHeightCm = 90) {
  if (!input?.enabled) return { cableTray: null, parts: [], diagnostics: [] };
  if (Number(panelHeightCm) !== DOCUMENTED_WALL_TRAY.heightCm) throw new Error('MULTIPLE_CABLE_TRAY_CONFIGURATION_NOT_DOCUMENTED');
  const cableTray = { componentKey: String(input.componentKey || 'cable-tray-0'), type: 'WALL_ARRIVAL', side: String(input.side || 'RIGHT').toUpperCase(), heightCm: 128 };
  return { cableTray, parts: [{ componentKey: cableTray.componentKey, componentRole: 'CABLE_TRAY',
    commercial: { code: DOCUMENTED_WALL_TRAY.code, description: DOCUMENTED_WALL_TRAY.description, includeInBOM: true },
    visual: { ...cableTray, materialRole: 'PAINTED_METAL' } }], diagnostics: [] };
}
