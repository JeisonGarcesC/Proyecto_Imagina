import * as THREE from 'three';
import { mmToMeters } from './vetroNativeConstants.js';
import { createVetroNativeMaterial } from './vetroNativeMaterials.js';

export function createNativeRoot(name) {
  const root = new THREE.Group();
  root.name = name;
  root.userData.visualSource = 'NATIVE';
  return root;
}

export function addBox(root, { name, sizeMm, centerMm, materialRole, componentRole = name }) {
  const geometry = new THREE.BoxGeometry(...sizeMm.map(mmToMeters));
  const material = createVetroNativeMaterial(materialRole);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...centerMm.map(mmToMeters));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { componentRole, materialRole, visualSource: 'NATIVE' };
  root.add(mesh);
  return mesh;
}

export function addGlassEdges(root, mesh) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
  const materialRole = 'GLASS_EDGE';
  const lines = new THREE.LineSegments(edges, createVetroNativeMaterial(materialRole));
  lines.name = 'GLASS_POLISHED_EDGES';
  lines.position.copy(mesh.position);
  lines.rotation.copy(mesh.rotation);
  lines.scale.copy(mesh.scale);
  lines.userData = { componentRole: 'GLASS_EDGE', materialRole, visualSource: 'NATIVE' };
  root.add(lines);
  return lines;
}

export function rectangleShape(semanticType, widthMm, depthMm, orientation = 'X_Z') {
  return { semanticType, geometry: { type: 'RECTANGLE', widthMm, depthMm, orientation }, style: { source: 'VETRO_NATIVE' } };
}
