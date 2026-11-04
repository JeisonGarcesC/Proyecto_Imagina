import * as THREE from 'three';

// Los GLB de Mesas Dancer (Configura) vienen en metros. Si llegara en milímetros se detecta por tamaño.
const MM_DETECTION_THRESHOLD = 20;

// Crecen la tapa y las vigas (barras delgadas y largas). El ducto cableado con sus cajas de tomas
// se queda en su sitio; los costados con sus patas y travesaños se desplazan hacia afuera.
const MIN_TOP_LENGTH_RATIO = 0.55;
const TOP_MAX_THICKNESS_RATIO = 0.25;
const MIN_BAR_LENGTH_RATIO = 0.15;
const MIN_BAR_SLENDERNESS = 4;
const BAR_CUT_START_RATIO = 0.35;

// Centro rígido: ducto cableado + cajas de tomas (piezas compactas cerca del centro).
const RAISED_TOLERANCE_M = 0.01;
const CORE_SEARCH_RATIO = 0.22;
const CORE_MIN_RATIO = 0.05;
const CORE_MAX_RATIO = 0.4;
const CORE_MARGIN_M = 0.03;

// Tapa de la mesa (para centrar la vertebra): pieza grande y plana. En la doble P y circular,
// la tapa es una sola pieza con dos niveles: el bajo es la rectangular y el alto la circular.
const TOP_FOOTPRINT_MIN_LENGTH_RATIO = 0.5;
const TOP_FOOTPRINT_LEVEL_BAND_M = 0.06;

// Altura extra con la que la vertebra entra en el ducto para quedar pegada al círculo.
const VERTEBRA_SOCKET_OVERLAP_M = 0.04;

// Zócalo de la vertebra: caja del ducto que cuelga bajo la tapa, con el círculo donde encaja.
const SOCKET_SEARCH_RADIUS_M = 0.3;
const SOCKET_MIN_AREA_M2 = 0.01;
const SOCKET_AREA_KEEP_RATIO = 0.6;
const SOCKET_MAX_LENGTH_RATIO = 0.7;
const SOCKET_MIN_HEIGHT_RATIO = 0.3;
const SOCKET_MAX_HEIGHT_RATIO = 0.35;
const SOCKET_FALLBACK_HEIGHT_RATIO = 0.62;

function boxOf(object) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object, true);
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse((node) => {
    if (node.isMesh && node.geometry?.attributes?.position) meshes.push(node);
  });
  return meshes;
}

function areaOfBounds(box) {
  return (box.max.x - box.min.x) * (box.max.z - box.min.z);
}

// Disposición de la mesa en el espacio del modelo: eje del largo, unidad y centro.
export function resolveDancerLayout(tableRoot) {
  const tableBox = boxOf(tableRoot);
  const size = tableBox.getSize(new THREE.Vector3());
  const axisIndex = size.x >= size.z ? 0 : 2;
  const unit = Math.max(size.x, size.z) > MM_DETECTION_THRESHOLD ? 0.001 : 1;
  const tableCenter = tableBox.getCenter(new THREE.Vector3());
  return {
    axisIndex,
    meter: 1 / unit,
    center: tableCenter.getComponent(axisIndex),
    tableCenter,
  };
}

// Mayor tramo sin vértices (a partir de lowBound) donde se "abre" una pieza para alargarla:
// lo que queda más allá del tramo se desplaza completo y el tramo absorbe el crecimiento.
function findLargestGap(sortedValues, lowBound) {
  let previous = 0;
  let best = null;
  for (const value of sortedValues) {
    if (value > lowBound) {
      const start = Math.max(previous, lowBound);
      if (!best || value - start > best.end - best.start) best = { start, end: value };
    }
    previous = value;
  }
  return best;
}

// Hace crecer la mesa a lo largo de su eje mayor sin escalar:
// - la tapa y las vigas se alargan (se abren en un tramo libre de vértices);
// - el ducto cableado con las cajas de tomas se queda en su sitio y no cambia;
// - costados, patas y travesaños se desplazan completos hacia afuera.
// Modifica copias de la geometría de cada mesh (nunca geometrías compartidas).
export function applyDancerLength(tableRoot, { targetLengthCm, nominalLengthCm, layout }) {
  // En su largo original (el del GLB) la mesa no se modifica.
  if (Math.abs(targetLengthCm - nominalLengthCm) < 0.05) return { applied: false };

  const { axisIndex, meter, center } = layout;
  const delta = ((targetLengthCm - nominalLengthCm) / 100) * meter;
  const modelLength = (nominalLengthCm / 100) * meter;
  const deltaForSide = () => delta / 2;

  tableRoot.updateMatrixWorld(true);
  const rootInverse = tableRoot.matrixWorld.clone().invert();
  const vertex = new THREE.Vector3();

  const entries = [];
  for (const mesh of collectMeshes(tableRoot)) {
    const toRoot = rootInverse.clone().multiply(mesh.matrixWorld);
    if (Math.abs(toRoot.determinant()) < 1e-12) continue;
    const position = mesh.geometry.attributes.position;
    const bounds = new THREE.Box3();
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(toRoot);
      bounds.expandByPoint(vertex);
    }
    if (bounds.isEmpty()) continue;
    entries.push({ mesh, toRoot, bounds, growKind: null, shift: 0 });
  }
  if (!entries.length) return { applied: false };

  const centerOffsetOf = (entry) =>
    entry.bounds.getCenter(new THREE.Vector3()).getComponent(axisIndex) - center;

  // Clasificación: crecen la tapa (pieza plana larga) y las vigas (barras delgadas y largas).
  for (const entry of entries) {
    const size = entry.bounds.getSize(new THREE.Vector3());
    const extent = size.getComponent(axisIndex);
    const horizontalShort = Math.min(size.x, size.z);
    const crossSection = Math.max(size.y, axisIndex === 0 ? size.z : size.x);
    if (
      extent >= modelLength * MIN_TOP_LENGTH_RATIO &&
      size.y <= horizontalShort * TOP_MAX_THICKNESS_RATIO
    ) {
      entry.growKind = 'top';
    } else if (
      extent >= modelLength * MIN_BAR_LENGTH_RATIO &&
      extent >= crossSection * MIN_BAR_SLENDERNESS
    ) {
      entry.growKind = 'bar';
    }
  }

  // Piezas que sobresalen por encima de la tapa principal (superficie auxiliar con tomas, tapa
  // del ducto) conservan su tamaño: nunca crecen ni se abren.
  const mainTop = entries
    .filter((entry) => entry.growKind === 'top')
    .sort((a, b) => areaOfBounds(b.bounds) - areaOfBounds(a.bounds))[0];
  const raisedFromY = mainTop ? mainTop.bounds.max.y - RAISED_TOLERANCE_M * meter : Infinity;
  for (const entry of entries) {
    if (entry.bounds.min.y >= raisedFromY) {
      entry.growKind = null;
      entry.raised = true;
    } else if (
      entry.growKind === 'bar' &&
      mainTop &&
      entry.bounds.max.y > mainTop.bounds.min.y + RAISED_TOLERANCE_M * meter
    ) {
      // Las vigas van por debajo de la tapa. Una pieza larga que atraviesa la tapa (marco o
      // bandeja del ducto con las tomas) no es viga: conserva su tama\u00f1o.
      entry.growKind = null;
    }
  }

  // Centro rígido: ducto, cajas de tomas y demás piezas compactas centrales que no crecen.
  let coreHalf = 0;
  let hasCore = false;
  for (const entry of entries) {
    if (entry.growKind || entry.raised) continue;
    if (Math.abs(centerOffsetOf(entry)) > modelLength * CORE_SEARCH_RATIO) continue;
    hasCore = true;
    coreHalf = Math.max(
      coreHalf,
      Math.abs(entry.bounds.min.getComponent(axisIndex) - center),
      Math.abs(entry.bounds.max.getComponent(axisIndex) - center)
    );
  }
  const rigidHalf = hasCore
    ? THREE.MathUtils.clamp(
        coreHalf + CORE_MARGIN_M * meter,
        modelLength * CORE_MIN_RATIO,
        modelLength * CORE_MAX_RATIO
      )
    : modelLength * 0.1;

  // Piezas que no crecen: se desplazan completas si quedan fuera del centro rígido.
  for (const entry of entries) {
    if (entry.growKind) continue;
    const offset = centerOffsetOf(entry);
    if (Math.abs(offset) > rigidHalf) {
      const side = Math.sign(offset);
      entry.shift = side * deltaForSide(side);
    }
  }

  for (const entry of entries) {
    const { mesh, toRoot, growKind } = entry;
    const fromRoot = toRoot.clone().invert();
    const geometry = mesh.geometry.clone();
    const position = geometry.attributes.position;
    const offsets = new Float32Array(position.count);
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(toRoot);
      offsets[i] = vertex.getComponent(axisIndex) - center;
    }

    // Piezas que crecen: se abren en el mayor tramo libre de vértices de cada lado.
    const openings = {};
    if (growKind) {
      for (const side of [-1, 1]) {
        const total = deltaForSide(side);
        if (!total) continue;
        const values = [];
        for (let i = 0; i < offsets.length; i += 1) {
          if (offsets[i] * side > 0) values.push(offsets[i] * side);
        }
        if (!values.length) continue;
        values.sort((a, b) => a - b);
        const lowBound =
          growKind === 'bar' ? values[values.length - 1] * BAR_CUT_START_RATIO : rigidHalf;
        const gap = findLargestGap(values, lowBound);
        if (gap) openings[side] = { ...gap, total };
      }
    }

    const shiftOf = (offset) => {
      if (!growKind) return entry.shift;
      const side = Math.sign(offset);
      const opening = openings[side];
      if (!opening) return 0;
      const distance = Math.abs(offset);
      if (distance <= opening.start) return 0;
      if (distance >= opening.end) return side * opening.total;
      return (
        side * opening.total * ((distance - opening.start) / (opening.end - opening.start))
      );
    };

    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(toRoot);
      vertex.setComponent(axisIndex, center + offsets[i] + shiftOf(offsets[i]));
      vertex.applyMatrix4(fromRoot);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
  }

  tableRoot.updateMatrixWorld(true);
  return { applied: true };
}

// Busca, cerca de un punto de la mesa, la caja del ducto con el círculo donde encaja la vertebra:
// pieza compacta y de buen tamaño, colgada bajo la tapa (la más baja entre las grandes).
function findSocketBox(target, meshBoxes, { meter, floorY, tableHeight, tableLong }) {
  const radius = SOCKET_SEARCH_RADIUS_M * meter;
  const candidates = [];
  for (const box of meshBoxes) {
    if (box.min.y <= floorY + tableHeight * SOCKET_MIN_HEIGHT_RATIO) continue;
    if (box.max.y - box.min.y > tableHeight * SOCKET_MAX_HEIGHT_RATIO) continue;
    const size = box.getSize(new THREE.Vector3());
    if (Math.max(size.x, size.z) > tableLong * SOCKET_MAX_LENGTH_RATIO) continue;
    const area = size.x * size.z;
    if (area < SOCKET_MIN_AREA_M2 * meter * meter) continue;
    const center = box.getCenter(new THREE.Vector3());
    const distance = Math.hypot(center.x - target.x, center.z - target.z);
    if (distance > radius) continue;
    candidates.push({ box, area });
  }
  if (!candidates.length) return null;

  const largest = Math.max(...candidates.map((candidate) => candidate.area));
  return candidates
    .filter((candidate) => candidate.area >= largest * SOCKET_AREA_KEEP_RATIO)
    .sort((a, b) => a.box.min.y - b.box.min.y)[0].box;
}

// Huella (centro en planta) de la tapa de la mesa. Con dos vertebras (doble P y circular) la tapa
// es una sola pieza de dos niveles: el bajo es la mesa rectangular y el alto la circular.
function resolveTopFootprints(tableRoot, tableBox, meshBoxes, { meter, wantTwo }) {
  const tableSize = tableBox.getSize(new THREE.Vector3());
  const tableLong = Math.max(tableSize.x, tableSize.z);
  const topMeshes = collectMeshes(tableRoot).filter((mesh, index) => {
    const box = meshBoxes[index];
    if (!box) return false;
    const size = box.getSize(new THREE.Vector3());
    return (
      Math.max(size.x, size.z) >= tableLong * TOP_FOOTPRINT_MIN_LENGTH_RATIO &&
      size.y <= Math.min(size.x, size.z) * TOP_MAX_THICKNESS_RATIO
    );
  });

  const vertex = new THREE.Vector3();
  const forEachVertex = (callback) => {
    for (const mesh of topMeshes) {
      mesh.updateWorldMatrix(true, false);
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i += 1) {
        callback(vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
      }
    }
  };

  let lowY = Infinity;
  let highY = -Infinity;
  forEachVertex((v) => {
    lowY = Math.min(lowY, v.y);
    highY = Math.max(highY, v.y);
  });
  if (!topMeshes.length) {
    const center = tableBox.getCenter(new THREE.Vector3());
    return [{ x: center.x, z: center.z }];
  }

  const band = TOP_FOOTPRINT_LEVEL_BAND_M * meter;
  const centerOf = (accept) => {
    const box = new THREE.Box3();
    forEachVertex((v) => {
      if (accept(v)) box.expandByPoint(v);
    });
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    return { x: center.x, z: center.z };
  };

  if (wantTwo && highY - lowY > band * 2) {
    const rect = centerOf((v) => v.y <= lowY + band);
    const circle = centerOf((v) => v.y >= highY - band);
    if (rect && circle) return [rect, circle];
  }
  const whole = centerOf(() => true);
  return [whole];
}

// Devuelve los puntos donde encaja cada vertebra: centro de la tapa (de cada mesa) y altura de la
// cara inferior de la caja del ducto. Doble P y circular: una en la rectangular y otra en la circular.
export function resolveDancerVertebraAnchors(tableRoot, { layout, vertebraCount = 1 }) {
  const tableBox = boxOf(tableRoot);
  const floorY = tableBox.min.y;
  const tableHeight = tableBox.max.y - tableBox.min.y;
  const tableSize = tableBox.getSize(new THREE.Vector3());

  const meshBoxes = collectMeshes(tableRoot).map((mesh) => {
    const meshBox = boxOf(mesh);
    return meshBox.isEmpty() ? null : meshBox;
  });

  const { axisIndex, meter } = layout;
  const context = {
    axisIndex,
    meter,
    floorY,
    tableHeight,
    tableLong: Math.max(tableSize.x, tableSize.z),
  };

  const targets = resolveTopFootprints(tableRoot, tableBox, meshBoxes, {
    meter,
    wantTwo: vertebraCount >= 2,
  });

  return targets.map((target) => {
    const socket = findSocketBox(target, meshBoxes.filter(Boolean), context);
    return {
      x: target.x,
      z: target.z,
      undersideY: socket ? socket.min.y : floorY + tableHeight * SOCKET_FALLBACK_HEIGHT_RATIO,
      floorY,
      overlap: VERTEBRA_SOCKET_OVERLAP_M * meter,
    };
  });
}

// Coloca una vertebra con su centro bajo el punto de la mesa, apoyada en el piso
// y con la altura necesaria para llegar al ducto y entrar un poco en su círculo.
export function placeDancerVertebra(vertebraScene, anchor) {
  const holder = new THREE.Group();
  holder.add(vertebraScene);

  const naturalBox = boxOf(holder);
  const naturalHeight = naturalBox.max.y - naturalBox.min.y;
  const availableHeight = anchor.undersideY - anchor.floorY + (anchor.overlap || 0);
  const scaleY =
    naturalHeight > 1e-6 && availableHeight > 1e-6
      ? THREE.MathUtils.clamp(availableHeight / naturalHeight, 0.5, 2)
      : 1;

  holder.scale.set(1, scaleY, 1);
  const naturalCenter = naturalBox.getCenter(new THREE.Vector3());
  holder.position.set(
    anchor.x - naturalCenter.x,
    anchor.floorY - naturalBox.min.y * scaleY,
    anchor.z - naturalCenter.z
  );
  holder.updateMatrixWorld(true);
  return holder;
}
