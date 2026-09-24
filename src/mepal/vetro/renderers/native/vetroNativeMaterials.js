import * as THREE from 'three';

export const VETRO_MATERIAL_ROLES = Object.freeze({
  GLASS: 'GLASS',
  GLASS_EDGE: 'GLASS_EDGE',
  ANODIZED_ALUMINUM: 'ANODIZED_ALUMINUM',
  PAINTED_ALUMINUM: 'PAINTED_ALUMINUM',
  F100_COMPACT: 'F100_COMPACT',
  HARDWARE: 'HARDWARE',
  POLYCARBONATE: 'POLYCARBONATE',
  LIGHT_GRAY_PLASTIC: 'LIGHT_GRAY_PLASTIC',
});

export function createVetroNativeMaterial(role) {
  switch (role) {
    case VETRO_MATERIAL_ROLES.GLASS:
      return new THREE.MeshPhysicalMaterial({ color: 0xeafcff, transparent: true, opacity: 0.24, roughness: 0.06, metalness: 0, transmission: 0.72, ior: 1.5, thickness: 0.01, depthWrite: false, side: THREE.DoubleSide });
    case VETRO_MATERIAL_ROLES.GLASS_EDGE:
      return new THREE.LineBasicMaterial({ color: 0x78aeb5, transparent: true, opacity: 0.72, depthWrite: false });
    case VETRO_MATERIAL_ROLES.ANODIZED_ALUMINUM:
      return new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.72, roughness: 0.3 });
    case VETRO_MATERIAL_ROLES.PAINTED_ALUMINUM:
      return new THREE.MeshStandardMaterial({ color: 0x45494d, metalness: 0.25, roughness: 0.45 });
    case VETRO_MATERIAL_ROLES.F100_COMPACT:
      return new THREE.MeshStandardMaterial({ color: 0xc9bea6, metalness: 0, roughness: 0.62 });
    case VETRO_MATERIAL_ROLES.POLYCARBONATE:
      return new THREE.MeshPhysicalMaterial({ color: 0xe4f2f2, transparent: true, opacity: 0.55, roughness: 0.18, depthWrite: true });
    case VETRO_MATERIAL_ROLES.LIGHT_GRAY_PLASTIC:
      return new THREE.MeshStandardMaterial({ color: 0xbfc2c3, metalness: 0, roughness: 0.65 });
    case VETRO_MATERIAL_ROLES.HARDWARE:
    default:
      return new THREE.MeshStandardMaterial({ color: 0x969b9f, metalness: 0.68, roughness: 0.28 });
  }
}

export function profileMaterialRole(finish) {
  return finish === 'PAINTED' ? VETRO_MATERIAL_ROLES.PAINTED_ALUMINUM : VETRO_MATERIAL_ROLES.ANODIZED_ALUMINUM;
}
