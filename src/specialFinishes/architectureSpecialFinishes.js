import * as THREE from 'three';
import { normalizeSpecialFinishRecord } from './specialFinishPersistence.js';
import { subtractWallPolygons } from '../core/architecture/walls/wallResolvedFootprint.js';
import { getWallFinishSurfaces } from '../core/architecture/walls/wallFinishSurfaces3D.js';
import { finishFromSnapshot } from './specialFinishPersistence.js';
import { prepareSpecialFinishVisual } from './specialFinishVisual.js';
import { DEFAULT_TEXTURE_TILE_WIDTH, normalizeArchitectureTextureScale,
  getArchitectureTextureTileSize, applyWallTextureUvs, applyColumnTextureUvs } from './architectureTextureUv.js';

export const ARCHITECTURE_FINISH_HISTORY_TYPE = 'APPLY_ARCHITECTURE_SPECIAL_FINISH';
export const WALL_BASE_COLOR = 0xdddddd;
export const COLUMN_BASE_COLOR = 0xb7b7b7;

export function normalizeArchitectureFinish(entry) {
  if (!['WALL', 'COLUMN'].includes(entry?.entityType) ||
    typeof entry.entityId !== 'string' || !entry.entityId.trim()) return null;
  const normalized = normalizeSpecialFinishRecord({ ...entry, scope: 'PART' });
  if (!normalized) return null;
  const textureScale = normalized.snapshot.type === 'TEXTURE'
    ? normalizeArchitectureTextureScale(entry.textureScale || { tileWidth: DEFAULT_TEXTURE_TILE_WIDTH })
    : null;
  if (normalized.snapshot.type === 'TEXTURE' && !textureScale) return null;
  return { ...normalized, entityType: entry.entityType, entityId: entry.entityId, scope: 'ENTITY',
    ...(textureScale ? { textureScale } : {}) };
}

export function restoreArchitectureFinishes(project, walls = [], columns = []) {
  const validIds = {
    WALL: new Set(walls.map((wall) => wall.id)),
    COLUMN: new Set(columns.map((column) => column.id)),
  };
  const entries = [];
  for (const raw of Array.isArray(project?.specialFinishes) ? project.specialFinishes : []) {
    const entry = normalizeArchitectureFinish(raw);
    if (!entry || !validIds[entry.entityType].has(entry.entityId)) continue;
    const key = `${entry.entityType}:${entry.entityId}`;
    const index = entries.findIndex((item) => `${item.entityType}:${item.entityId}` === key);
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
  }
  return entries;
}

export function setArchitectureFinish(entries, entityType, entityId, entry) {
  const next = (entries || []).filter((item) =>
    item.entityType !== entityType || item.entityId !== entityId);
  if (!entry) return next;
  const normalized = normalizeArchitectureFinish({ ...entry, entityType, entityId });
  if (!normalized) throw new Error('El acabado arquitectónico no es válido.');
  return [...next, normalized];
}

export function findArchitectureFinish(entries, entityType, entityId) {
  return (entries || []).find((item) => item.entityType === entityType && item.entityId === entityId) || null;
}

export function architectureRgbCss(entry) {
  if (entry?.snapshot?.type !== 'RGB') return null;
  const { r, g, b } = entry.snapshot;
  return `rgb(${r}, ${g}, ${b})`;
}

export function architectureFinish2dCss(entry) {
  if (entry?.snapshot?.type === 'RGB') return architectureRgbCss(entry);
  if (entry?.snapshot?.type !== 'TEXTURE') return null;
  const identity = `${entry.specialFinishId}:${entry.revision}`;
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `hsla(${hash % 360}, 38%, 48%, 0.45)`;
}

function setMaterialColor(material, entry, baseColor) {
  if (!material?.color) return;
  material.map = null;
  material.transparent = false;
  material.opacity = 1;
  if (!entry) material.color.setHex(baseColor);
  else {
    const { r, g, b } = entry.snapshot;
    material.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  }
  material.needsUpdate = true;
}

function setMaterialTexture(material, texture) {
  if (!material?.color) return;
  material.color.setHex(0xffffff);
  material.map = texture;
  material.transparent = true;
  material.opacity = 1;
  material.needsUpdate = true;
}

export function paintArchitectureRgb(wallsGroup, columnsGroup, entries) {
  wallsGroup?.traverse((mesh) => {
    if (!mesh.isMesh || mesh.userData?.kind !== 'WALL') return;
    const classes = mesh.geometry?.userData?.wallFinishClasses || [];
    classes.forEach((_, index) => {
      setMaterialColor(Array.isArray(mesh.material) ? mesh.material[index] : mesh.material,
        null, WALL_BASE_COLOR);
    });
  });
  for (const entry of entries || []) {
    if (entry.entityType === 'WALL' && entry.snapshot.type === 'RGB') {
      paintArchitectureRgbTarget(wallsGroup, null, entries, 'WALL', entry.entityId);
    }
  }
  columnsGroup?.traverse((mesh) => {
    if (!mesh.isMesh || mesh.userData?.kind !== 'COLUMN') return;
    const entry = findArchitectureFinish(entries, 'COLUMN', mesh.userData.columnId);
    setMaterialColor(mesh.material, entry?.snapshot?.type === 'RGB' ? entry : null, COLUMN_BASE_COLOR);
  });
}

export function paintArchitectureRgbTarget(wallsGroup, columnsGroup, entries, entityType, entityId) {
  const entry = findArchitectureFinish(entries, entityType, entityId);
  if (entityType === 'WALL') {
    for (const surface of getWallFinishSurfaces(wallsGroup, entityId)) {
      const material = Array.isArray(surface.mesh.material)
        ? surface.mesh.material[surface.materialIndex] : surface.mesh.material;
      setMaterialColor(material, entry?.snapshot?.type === 'RGB' ? entry : null, WALL_BASE_COLOR);
    }
  } else if (entityType === 'COLUMN') {
    columnsGroup?.traverse((mesh) => {
      if (mesh.isMesh && mesh.userData?.kind === 'COLUMN' && mesh.userData.columnId === entityId) {
        setMaterialColor(mesh.material, entry?.snapshot?.type === 'RGB' ? entry : null, COLUMN_BASE_COLOR);
      }
    });
  }
}

export async function paintArchitectureFinishTarget(wallsGroup, columnsGroup, entries,
  entityType, entityId, walls = [], columns = [], {
    prepareVisual = prepareSpecialFinishVisual, isCurrent = () => true,
  } = {}) {
  const entry = findArchitectureFinish(entries, entityType, entityId);
  if (entry?.snapshot?.type !== 'TEXTURE') {
    paintArchitectureRgbTarget(wallsGroup, columnsGroup, entries, entityType, entityId);
    return true;
  }
  const prepared = await prepareVisual(finishFromSnapshot(entry.snapshot));
  if (!isCurrent(entry)) return false;
  const texture = prepared?.definition?.mapTexture;
  const tileSize = getArchitectureTextureTileSize(texture, entry.textureScale);
  if (entityType === 'WALL') {
    const wall = walls.find((item) => item.id === entityId);
    if (!wall) return false;
    const surfaces = getWallFinishSurfaces(wallsGroup, entityId);
    const byMesh = new Map();
    surfaces.forEach((surface) => {
      if (!byMesh.has(surface.mesh)) byMesh.set(surface.mesh, []);
      byMesh.get(surface.mesh).push(surface);
    });
    for (const [mesh, meshSurfaces] of byMesh) {
      applyWallTextureUvs(mesh, meshSurfaces, wall, tileSize);
      for (const index of new Set(meshSurfaces.map((surface) => surface.materialIndex))) {
        setMaterialTexture(Array.isArray(mesh.material) ? mesh.material[index] : mesh.material, texture);
      }
    }
  } else if (entityType === 'COLUMN') {
    const column = columns.find((item) => item.id === entityId);
    if (!column) return false;
    columnsGroup?.traverse((mesh) => {
      if (mesh.isMesh && mesh.userData?.kind === 'COLUMN' && mesh.userData.columnId === entityId) {
        applyColumnTextureUvs(mesh, column, tileSize);
        setMaterialTexture(mesh.material, texture);
      }
    });
  }
  return true;
}

export function paintArchitectureFinishes(wallsGroup, columnsGroup, entries, walls, columns, options) {
  paintArchitectureRgb(wallsGroup, columnsGroup, entries);
  return Promise.all((entries || []).filter((entry) => entry.snapshot.type === 'TEXTURE' &&
    (entry.entityType === 'WALL' ? wallsGroup : columnsGroup)).map((entry) =>
    paintArchitectureFinishTarget(wallsGroup, columnsGroup, entries,
      entry.entityType, entry.entityId, walls, columns, options)));
}

// A top-view finish fill is derived from the same source polygons. Shared patches,
// overlaps with other walls and column cuts stay in the base architectural fill.
export function buildExclusiveWallFinishFootprints(footprint, entries = []) {
  const sources = footprint?.sources || [];
  return entries.filter((entry) => entry.entityType === 'WALL').flatMap((entry) => {
    const own = sources.filter((source) => source.wallIds.length === 1 &&
      source.wallIds[0] === entry.entityId).map((source) => source.polygon);
    if (!own.length) return [];
    const other = sources.filter((source) => source.wallIds.length !== 1 ||
      source.wallIds[0] !== entry.entityId).map((source) => source.polygon);
    const rings = subtractWallPolygons(own, other);
    return rings.length ? [{ wallId: entry.entityId, type: entry.snapshot.type,
      color: architectureFinish2dCss(entry), rings }] : [];
  });
}

export function buildExclusiveWallRgbFootprints(footprint, entries = []) {
  return buildExclusiveWallFinishFootprints(footprint, entries)
    .filter((patch) => patch.type === 'RGB');
}
