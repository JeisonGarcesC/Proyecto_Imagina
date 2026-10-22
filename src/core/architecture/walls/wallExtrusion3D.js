import * as THREE from 'three';
import { wallRingArea } from './wallResolvedFootprint.js';
import { attributeWallFinishGeometry } from './wallFinishSurfaces3D.js';

function contains(point, ring) {
  let inside = false;
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length];
    if ((a.z > point.z) !== (b.z > point.z) &&
        point.x < a.x + (point.z - a.z) * (b.x - a.x) / (b.z - a.z)) inside = !inside;
  });
  return inside;
}

function pathFromRing(ring, PathClass) {
  const path = new PathClass();
  ring.forEach((point, index) => {
    if (index === 0) path.moveTo(point.x, -point.z);
    else path.lineTo(point.x, -point.z);
  });
  path.closePath();
  return path;
}

export function createWallVolumeGeometry(volume) {
  const outers = (volume?.rings || []).filter((ring) => wallRingArea(ring) > 0);
  const holes = (volume?.rings || []).filter((ring) => wallRingArea(ring) < 0);
  const shapes = outers.map((ring) => ({ ring, shape: pathFromRing(ring, THREE.Shape) }));
  holes.forEach((hole) => {
    const owner = shapes.find(({ ring }) => contains(hole[0], ring));
    if (owner) owner.shape.holes.push(pathFromRing(hole, THREE.Path));
  });
  if (!shapes.length || !Number.isFinite(volume?.height) || volume.height <= 0) return null;
  const geometry = new THREE.ExtrudeGeometry(shapes.map(({ shape }) => shape), {
    depth: volume.height, bevelEnabled: false, steps: 1, curveSegments: 1,
  });
  // Coordenadas de Shape: (X, -Z); profundidad de extrusión: +Y del mundo.
  geometry.rotateX(-Math.PI / 2);
  return attributeWallFinishGeometry(geometry, volume.sources);
}
