import { normalizeWallDefinition } from './wallDefinition.js';

function resolveWallsInput(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.walls)) return data.walls;
  if (Array.isArray(data?.architecture?.walls)) return data.architecture.walls;
  return [];
}

export function serializeWalls(walls) {
  return resolveWallsInput(walls)
    .map((wall) => normalizeWallDefinition(wall))
    .filter(Boolean)
    .map((wall) => JSON.parse(JSON.stringify(wall)));
}

export function deserializeWalls(data) {
  return resolveWallsInput(data)
    .map((wall) => normalizeWallDefinition(wall))
    .filter(Boolean);
}
