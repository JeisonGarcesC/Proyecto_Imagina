export const DEFAULT_DETAIL_LEVEL_2D = 4;

const LOCKER_SECONDARY_MESHES = new Set([
  'LEFT_SIDE', 'RIGHT_SIDE', 'TOP', 'BOTTOM', 'BACK',
  'SHELF_PANEL', 'SHELF_FRONT_LIP', 'PLINTH_FACE', 'PLINTH_SIDE',
  'HANDLE_BAR', 'HANDLE_MOUNT', 'HANDLE_FRAME', 'HANDLE_RECESS',
  'LOCK_HOUSING', 'PADLOCK_OPENING', 'KEY_SLOT', 'HINGE',
  'VISUAL_SLOT', 'ACRYLIC_VIEWER', 'ANCHOR_PLATE', 'BOTTOM_RETURN',
]);

const KUO_SECONDARY_ROLES = new Set([
  'LEFT_COLUMN', 'RIGHT_COLUMN', 'SUPPORT_LEFT', 'SUPPORT_RIGHT',
  'SUPPORT_INTERMEDIATE', 'CROSSBAR', 'BEAM_FRONT', 'BEAM_BACK',
  'DUCT', 'DOUBLE_DUCT', 'SOCKET_SUPPORT', 'POWER_OUTLET_LEFT',
  'POWER_OUTLET_RIGHT', 'POWER_KIT', 'POWER_KIT_LEFT', 'POWER_KIT_RIGHT',
  'VERTEBRA', 'VERTEBRA_LEFT', 'VERTEBRA_RIGHT', 'GROMMET',
  'GROMMET_LEFT', 'GROMMET_RIGHT', 'CONTROL_PAD', 'BUTTONS', 'BALDOSA',
]);

export function normalizeDetailLevel2D(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 4
    ? level
    : DEFAULT_DETAIL_LEVEL_2D;
}

function getFamily(part) {
  const kind = String(part?.kind || part?.type || '').toUpperCase();
  const line = String(part?.line || '').toUpperCase();
  if (kind === 'LOCKER_PRODUCT') return 'LOCKERS';
  if (kind.startsWith('KUO_AV_') || line === 'KUO.AV') return 'KUO';
  return null;
}

export function shouldRenderDetailed2DShape({ detailLevel, family, role, sourceMesh } = {}) {
  const level = normalizeDetailLevel2D(detailLevel);
  if (level === 1) return false;
  if (level >= 3) return true;

  // Only exact, documented mesh names/roles are classified. Unknown forms stay visible.
  if (family === 'LOCKERS') {
    const name = String(sourceMesh || role || '');
    if (/^DIVIDER_\d+$/.test(name) || name === 'DOOR_PANEL') return true;
    if (LOCKER_SECONDARY_MESHES.has(name) || /^DIAL_\d+$/.test(name) || /^FRONT_RETURN_\d+$/.test(name)) return false;
    return true;
  }
  if (family === 'KUO') {
    const partRole = String(role || '');
    if (['SURFACE', 'SURFACE_FRONT', 'SURFACE_BACK', 'PANTALLA'].includes(partRole)) return true;
    if (KUO_SECONDARY_ROLES.has(partRole)) return false;
    return true;
  }
  return true;
}

export function getVisibleDetailed2DShapes(part, detailLevel) {
  const shapes = part?.detailedFootprint?.detailedShapes;
  const level = normalizeDetailLevel2D(detailLevel);
  if (!Array.isArray(shapes) || level === 1) return [];
  if (level >= 3) return shapes;
  const family = getFamily(part);
  return shapes.filter((shape) => shouldRenderDetailed2DShape({
    detailLevel, family, role: shape.role, sourceMesh: shape.sourceMesh,
  }));
}
