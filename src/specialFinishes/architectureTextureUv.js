import { buildWallGeometry2D, isPointInPolygon2D } from '../core/architecture/walls/wallGeometry2D.js';

export const DEFAULT_TEXTURE_TILE_WIDTH = 0.25; // metros por repetición horizontal
export const MIN_TEXTURE_TILE_WIDTH = 0.01;
export const MAX_TEXTURE_TILE_WIDTH = 10;

export function normalizeArchitectureTextureScale(value) {
  const tileWidth = Number(value?.tileWidth);
  if (!Number.isFinite(tileWidth) || tileWidth < MIN_TEXTURE_TILE_WIDTH ||
    tileWidth > MAX_TEXTURE_TILE_WIDTH) return null;
  return { tileWidth };
}

export function getArchitectureTextureTileSize(texture, scale) {
  const normalized = normalizeArchitectureTextureScale(scale);
  const image = texture?.image || texture?.source?.data;
  const imageWidth = Number(image?.naturalWidth || image?.videoWidth || image?.width);
  const imageHeight = Number(image?.naturalHeight || image?.videoHeight || image?.height);
  if (!normalized || !Number.isFinite(imageWidth) || imageWidth <= 0 ||
    !Number.isFinite(imageHeight) || imageHeight <= 0) {
    throw new Error('No se pudo determinar la proporción física de la textura.');
  }
  return { width: normalized.tileWidth,
    height: normalized.tileWidth * imageHeight / imageWidth };
}

function chooseWallAxis(point, normal, surface, wallId, sources, segments) {
  const inside = Math.abs(normal.y) > 0.5 ? point
    : { x: point.x - normal.x * 1e-6, z: point.z - normal.z * 1e-6 };
  const source = sources.find((candidate) => candidate.wallIds?.length === 1 &&
    candidate.wallIds[0] === wallId && candidate.segmentId &&
    isPointInPolygon2D(inside, candidate.polygon));
  const segment = segments.get(source?.segmentId) ||
    (surface.segmentIds || []).map((id) => segments.get(id)).find(Boolean);
  return segment?.direction || { x: 1, z: 0 };
}

function sideTangent(normal, wallAxis) {
  const length = Math.hypot(normal.x, normal.z) || 1;
  let tangent = { x: normal.z / length, z: -normal.x / length };
  const alignment = tangent.x * wallAxis.x + tangent.z * wallAxis.z;
  if (Math.abs(alignment) > 0.95) {
    if (alignment < 0) tangent = { x: -tangent.x, z: -tangent.z };
  } else if (tangent.x < -1e-8 || (Math.abs(tangent.x) <= 1e-8 && tangent.z < 0)) {
    tangent = { x: -tangent.x, z: -tangent.z };
  }
  return tangent;
}

export function applyWallTextureUvs(mesh, surfaces, wall, tileSize) {
  const geometry = mesh?.geometry;
  const position = geometry?.getAttribute('position');
  const normal = geometry?.getAttribute('normal');
  const uv = geometry?.getAttribute('uv');
  if (!position || !normal || !uv || !wall) return false;
  const segments = new Map(buildWallGeometry2D(wall).segmentsGeometry.map((segment) =>
    [segment.segmentId, segment]));
  const sources = mesh.userData.wallTextureSources || [];
  for (const surface of surfaces) {
    if (surface.mesh !== mesh) continue;
    for (let start = surface.start; start < surface.start + surface.count; start += 3) {
      const faceNormal = { x: normal.getX(start), y: normal.getY(start), z: normal.getZ(start) };
      const center = { x: (position.getX(start) + position.getX(start + 1) + position.getX(start + 2)) / 3,
        z: (position.getZ(start) + position.getZ(start + 1) + position.getZ(start + 2)) / 3 };
      const axis = chooseWallAxis(center, faceNormal, surface, wall.id, sources, segments);
      const top = Math.abs(faceNormal.y) > 0.5;
      const tangent = top ? axis : sideTangent(faceNormal, axis);
      const crossAxis = { x: -axis.z, z: axis.x };
      for (let index = start; index < start + 3; index += 1) {
        const x = position.getX(index);
        const z = position.getZ(index);
        const u = (x * tangent.x + z * tangent.z) / tileSize.width;
        const v = top ? (x * crossAxis.x + z * crossAxis.z) / tileSize.height
          : (position.getY(index) + mesh.position.y) / tileSize.height;
        uv.setXY(index, u, v);
      }
    }
  }
  uv.needsUpdate = true;
  return true;
}

export function applyColumnTextureUvs(mesh, column, tileSize) {
  const geometry = mesh?.geometry;
  const position = geometry?.getAttribute('position');
  const normal = geometry?.getAttribute('normal');
  const uv = geometry?.getAttribute('uv');
  if (!position || !normal || !uv || !column) return false;
  const circular = geometry.type === 'CylinderGeometry';
  if (circular && !geometry.userData.architectureBaseUvs) {
    geometry.userData.architectureBaseUvs = new Float32Array(uv.array);
  }
  const circumference = Math.PI * Number(column.diameter);
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const top = Math.abs(normal.getY(index)) > 0.5;
    let u;
    if (top) u = x / tileSize.width;
    else if (circular) u = geometry.userData.architectureBaseUvs[index * 2] * circumference / tileSize.width;
    else {
      const tangent = sideTangent({ x: normal.getX(index), z: normal.getZ(index) }, { x: 1, z: 0 });
      u = (x * tangent.x + z * tangent.z) / tileSize.width;
    }
    const v = top ? z / tileSize.height : (position.getY(index) + mesh.position.y) / tileSize.height;
    uv.setXY(index, u, v);
  }
  uv.needsUpdate = true;
  return true;
}
