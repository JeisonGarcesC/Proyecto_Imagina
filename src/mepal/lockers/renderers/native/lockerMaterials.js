import { MeshStandardMaterial } from 'three';
export const LOCKER_MATERIAL_ROLES = Object.freeze({
  PAINTED_METAL: { color: '#9ca3af', metalness: 0.35, roughness: 0.5 },
  FORMICA: { color: '#d6c1a0', roughness: 0.55 }, MELAMINE: { color: '#eee9e0', roughness: 0.65 },
  MDP: { color: '#a8865f', roughness: 0.9 }, ACRYLIC: { color: '#dcecf5', transparent: true, opacity: 0.3, roughness: 0.1 },
  CHROME: { color: '#d8dee5', metalness: 0.95, roughness: 0.2 },
  BRUSHED_NICKEL: { color: '#aeb4bb', metalness: 0.8, roughness: 0.45 },
  ANODIZED: { color: '#b9bec4', metalness: 0.75, roughness: 0.4 },
  BLACK: { color: '#17191c', roughness: 0.7 }, HARDWARE: { color: '#777f88', metalness: 0.7, roughness: 0.4 },
});
export function createLockerMaterial(role, color) {
  return new MeshStandardMaterial({ ...LOCKER_MATERIAL_ROLES[role], ...(color ? { color } : {}) });
}
export function lockerDoorMaterialRole(material) {
  return material === 'FORMICA' ? 'FORMICA' : material === 'MELAMINA' ? 'MELAMINE' : 'PAINTED_METAL';
}
