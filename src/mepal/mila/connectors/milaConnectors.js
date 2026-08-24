// src/mepal/mila/connectors/milaConnectors.js
import * as THREE from 'three';
import { MILA_GIRO_CONNECTOR_TUNE, MILA_GIRO_TUNE } from '../config/milaGiroTunables.js';
import { MILA_ACCESSORY_OFFSETS_MM } from '../config/milaTunables.js';

export const MILA_CONNECTOR_CONFIG = {
  SNAP_RADIUS_M: 0.48, // Radio de detección para acople óptimo (48 cm)
  CONNECTOR_RADIUS_M: 0.048, // Radio del cilindro conector
  CONNECTOR_THICKNESS_M: 0.035, // Grosor lateral
  COLOR_NORMAL: 0xf59e0b, // Amarillo / ámbar sólido tipo accesorio CAD
  COLOR_SNAP_ACTIVE: 0x10b981, // Verde esmeralda cuando está en rango de acople
  CORE_COLOR_NORMAL: 0xd97706, // Color contraste del núcleo interior
  CORE_COLOR_ACTIVE: 0x059669,
};

const PANEL_DIVISOR_CONNECTOR_TUNE = {
  // Acercamiento a pared en X. Más negativo = más pegado a la pared.
  panelBackFaceXM: -0.02,
  // Separación real de la cara visible del conector respecto a la pared.
  // 0.02 = 2 cm.
  wallInsetM: 0.02,
  // Solape real de la silla contra la pared para tapar el hueco visual.
  // 0.02 = 2 cm.
  panelWallOverlapM: 0.08,
  moduleSpacingM: 0.6,
  // Posición base en Z por lado. Más alto en valor absoluto = silla más atrás.
  sideCenterZM: 0.75,
  // Empuje adicional hacia atrás para todos los puestos (1-4).
  seatBackShiftM: 0.06,
  // Empuje extra solamente cuando son 2-4 puestos.
  multiSeatBackExtraShiftM: 0,
};

function clampPanelSeats(value) {
  return Math.max(0, Math.min(4, Number(value) || 0));
}

function clampMilaQuantity(value) {
  return Math.max(1, Math.min(4, Number(value) || 1));
}

function resolveActiveMilaQuantity(activeAssembly) {
  return clampMilaQuantity(
    activeAssembly?.userData?.config?.quantity || activeAssembly?.userData?.quantity || 1
  );
}

function resolvePanelSidePorts(targetConnectors, side) {
  return Object.values(targetConnectors?.ports || {})
    .filter((port) => port?.portType === 'panel-wall' && port.side === side)
    .sort((a, b) => Number(a.seatIndex || 0) - Number(b.seatIndex || 0));
}

function resolvePanelDivisorTargetPort({ targetConnectors, targetPort }) {
  if (!targetConnectors?.isPanelDivisor || targetPort?.portType !== 'panel-wall') {
    return targetPort;
  }

  const sidePorts = resolvePanelSidePorts(targetConnectors, targetPort.side);
  if (!sidePorts.length) return targetPort;

  // El snap del panel divisor debe usar el mismo puerto visible en pared.
  return sidePorts.find((port) => Number(port.seatIndex || 0) === 0) || targetPort;
}

function resolvePanelDivisorPorts(targetObj) {
  const config = targetObj?.userData?.config || {};
  // Mostrar conectores en cualquier variante de panel divisor: mínimo 1 por lado.
  const seatsLeft = Math.max(1, clampPanelSeats(config.seatsLeft));
  const seatsRight = Math.max(1, clampPanelSeats(config.seatsRight));

  const ports = {};

  const addSidePorts = ({ side, seatCount, zSign }) => {
    if (seatCount <= 0) return;

    for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
      const localPos = new THREE.Vector3(
        PANEL_DIVISOR_CONNECTOR_TUNE.panelBackFaceXM -
          PANEL_DIVISOR_CONNECTOR_TUNE.wallInsetM -
          seatIndex * PANEL_DIVISOR_CONNECTOR_TUNE.moduleSpacingM,
        0.14,
        zSign * PANEL_DIVISOR_CONNECTOR_TUNE.sideCenterZM
      );

      const localNormal = new THREE.Vector3(-1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal
        .clone()
        .applyQuaternion(targetObj.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();

      const id = `${side}_${seatIndex + 1}`;
      ports[id] = {
        id,
        side,
        seatIndex,
        portType: 'panel-wall',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
    }
  };

  addSidePorts({ side: 'left', seatCount: seatsLeft, zSign: 1 });
  addSidePorts({ side: 'right', seatCount: seatsRight, zSign: -1 });

  return ports;
}

/**
 * Helper para obtener el ángulo de rotación Yaw (alrededor de Y) de un vector en Three.js
 */
export function getVectorYaw(v) {
  return Math.atan2(-v.z, v.x);
}

/**
 * Crea la figura 3D sólida de un conector circular lateral
 * Su orientación base tiene la cara circular apuntando hacia +X (Vector3(1, 0, 0))
 * Renderizado con depthTest: true y depthWrite: true para que respete la profundidad 3D real
 */
export function createMilaConnectorMesh({ side = 'left' } = {}) {
  const group = new THREE.Group();
  group.name = `MILA_CONNECTOR_${side.toUpperCase()}`;

  // 1. Cuerpo cilíndrico principal horizontal
  const cylinderGeom = new THREE.CylinderGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    MILA_CONNECTOR_CONFIG.CONNECTOR_THICKNESS_M,
    32
  );
  cylinderGeom.rotateZ(-Math.PI / 2);

  // 2. Bisel / aro exterior redondeado
  const ringGeom = new THREE.TorusGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M,
    0.006,
    16,
    32
  );
  ringGeom.rotateY(Math.PI / 2);

  // 3. Núcleo circular central (socket/pin de acople)
  const coreGeom = new THREE.CylinderGeometry(
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M * 0.55,
    MILA_CONNECTOR_CONFIG.CONNECTOR_RADIUS_M * 0.55,
    MILA_CONNECTOR_CONFIG.CONNECTOR_THICKNESS_M + 0.004,
    32
  );
  coreGeom.rotateZ(-Math.PI / 2);

  // Materiales sólidos opacos con prueba y escritura de profundidad
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
    roughness: 0.3,
    metalness: 0.2,
    depthTest: true,
    depthWrite: true,
  });

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL,
    roughness: 0.35,
    metalness: 0.25,
    depthTest: true,
    depthWrite: true,
  });

  const cylinderMesh = new THREE.Mesh(cylinderGeom, bodyMaterial);
  cylinderMesh.castShadow = true;
  cylinderMesh.receiveShadow = true;

  const ringMesh = new THREE.Mesh(ringGeom, bodyMaterial);
  ringMesh.castShadow = true;
  ringMesh.receiveShadow = true;

  const coreMesh = new THREE.Mesh(coreGeom, coreMaterial);
  coreMesh.userData = { isConnectorCore: true };
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;

  group.add(cylinderMesh, ringMesh, coreMesh);

  group.userData = {
    isMilaConnector: true,
    side,
    excludeFromBOM: true,
  };

  return group;
}

/**
 * Obtiene el nodo raíz del ensamble, accesorio o superficie de giro Mila.
 */
export function getMilaAssemblyRoot(object) {
  if (!object) return null;

  let curr = object;
  while (curr && curr.parent && curr.parent.type !== 'Scene' && curr !== curr.parent) {
    const r = String(curr.userData?.meta?.role || curr.userData?.role || '').toLowerCase();
    if (
      curr.userData?.kind === 'MILA_ASSEMBLY' ||
      curr.userData?.kind === 'MILA_GIRO_SURFACE' ||
      curr.userData?.type === 'mila' ||
      curr.userData?.type === 'MILA_GIRO_SURFACE' ||
      r === 'giro-surface' ||
      r === 'armrest-left' ||
      r === 'armrest-right' ||
      r === 'armrest-center' ||
      r === 'screen'
    ) {
      return curr;
    }
    curr = curr.parent;
  }

  const role = String(curr?.userData?.meta?.role || curr?.userData?.role || '').toLowerCase();
  const isPanelDivisor =
    curr?.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
    curr?.userData?.type === 'mila-panel-divisor' ||
    role === 'panel-divisor' ||
    role === 'booth-table';

  if (isPanelDivisor) {
    return curr;
  }

  if (
    curr?.userData?.kind === 'MILA_ASSEMBLY' ||
    curr?.userData?.kind === 'MILA_GIRO_SURFACE' ||
    curr?.userData?.type === 'mila' ||
    curr?.userData?.type === 'MILA_GIRO_SURFACE' ||
    role === 'giro-surface' ||
    role === 'armrest-left' ||
    role === 'armrest-right' ||
    role === 'armrest-center' ||
    role === 'screen' ||
    String(curr?.userData?.line || '').toUpperCase() === 'MILA'
  ) {
    return curr;
  }

  const parentAssemblyId =
    object.userData?.parentAssemblyId || object.userData?.meta?.parentAssemblyId;
  if (parentAssemblyId) {
    let root = object;
    while (root.parent) root = root.parent;
    let found = null;
    root.traverse((node) => {
      if (
        !found &&
        (node.userData?.instanceId === parentAssemblyId || node.uuid === parentAssemblyId)
      ) {
        found = node;
      }
    });
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Resuelve los conectores de un objeto Mila (Silla, Giro o Accesorio individual).
 */
export function resolveMilaAssemblyConnectors(object) {
  if (!object) return null;

  const targetObj = getMilaAssemblyRoot(object);
  if (!targetObj) return null;

  const isPanelDivisor =
    targetObj.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
    targetObj.userData?.type === 'mila-panel-divisor';

  if (isPanelDivisor) {
    targetObj.updateMatrixWorld(true);
    const ports = resolvePanelDivisorPorts(targetObj);
    if (!Object.keys(ports).length) return null;

    return {
      assembly: targetObj,
      isGiro: false,
      isAccessory: false,
      isPanelDivisor: true,
      connectorY: 0.14,
      ports,
    };
  }

  const role = String(targetObj.userData?.meta?.role || targetObj.userData?.role || '').toLowerCase();

  const isGiro =
    targetObj.userData?.kind === 'MILA_GIRO_SURFACE' ||
    targetObj.userData?.type === 'MILA_GIRO_SURFACE' ||
    role === 'giro-surface';

  const isAccessory =
    role === 'armrest-left' ||
    role === 'armrest-right' ||
    role === 'armrest-center' ||
    role === 'screen';

  const isMila =
    isGiro ||
    isAccessory ||
    targetObj.userData?.kind === 'MILA_ASSEMBLY' ||
    targetObj.userData?.type === 'mila' ||
    String(targetObj.userData?.line || '').toUpperCase() === 'MILA';

  if (!isMila) return null;

  targetObj.updateMatrixWorld(true);
  const worldQuaternion = targetObj.getWorldQuaternion(new THREE.Quaternion());
  const yaw = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;
  const chairConnectorY = 0.14;
  const chairConnectorZ = -0.36;

  // ─────────────────────────────────────────────────────────
  // CASO A: Superficie de Giro Mila
  // ─────────────────────────────────────────────────────────
  if (isGiro) {
    const angleDeg = Number(
      targetObj.userData?.angleDeg || targetObj.userData?.meta?.angleDeg || 60
    );
    const angleRad = (angleDeg * Math.PI) / 180;
    const tune = MILA_GIRO_CONNECTOR_TUNE[angleDeg] || MILA_GIRO_CONNECTOR_TUNE[60];

    const tuneA = tune.portA;
    const tuneB = tune.portB;

    const localLeft = new THREE.Vector3(Number(tuneA.x), Number(tuneA.y), Number(tuneA.z));
    const localRight = new THREE.Vector3(Number(tuneB.x), Number(tuneB.y), Number(tuneB.z));

    const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
    const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);

    const localNormalLeft = tuneA.normal
      ? new THREE.Vector3(tuneA.normal.x, tuneA.normal.y, tuneA.normal.z).normalize()
      : new THREE.Vector3(Math.cos(tuneA.rotY || 0), 0, -Math.sin(tuneA.rotY || 0)).normalize();

    const localNormalRight = tuneB.normal
      ? new THREE.Vector3(tuneB.normal.x, tuneB.normal.y, tuneB.normal.z).normalize()
      : new THREE.Vector3(Math.cos(tuneB.rotY || 0), 0, -Math.sin(tuneB.rotY || 0)).normalize();

    const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
    const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();

    return {
      assembly: targetObj,
      isGiro: true,
      isAccessory: false,
      angleDeg,
      angleRad,
      localLeft,
      localRight,
      worldLeft,
      worldRight,
      normalLeft,
      normalRight,
      connectorY: Number(tuneA.y),
      yaw,
      ports: {
        left: {
          id: 'left',
          portType: 'giro',
          localPos: localLeft,
          localNormal: localNormalLeft,
          worldPos: worldLeft,
          worldNormal: normalLeft,
        },
        right: {
          id: 'right',
          portType: 'giro',
          localPos: localRight,
          localNormal: localNormalRight,
          worldPos: worldRight,
          worldNormal: normalRight,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // CASO B: Accesorios individuales Mila (Apoyabrazos / Pantallas)
  // ─────────────────────────────────────────────────────────
  if (isAccessory) {
    const ports = {};

    if (role === 'armrest-left') {
      // Conector hacia la derecha (+X) para acoplarse al lateral izquierdo de la silla
      const localPos = new THREE.Vector3(0.120, chairConnectorY, chairConnectorZ);
      const localNormal = new THREE.Vector3(1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.right = {
        id: 'right',
        portType: 'armrest-left',
        targetPortType: 'left',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-left',
        worldRight: worldPos,
        normalRight: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'armrest-right') {
      // Conector hacia la izquierda (-X) para acoplarse al lateral derecho de la silla
      const localPos = new THREE.Vector3(0.0368, chairConnectorY, chairConnectorZ);
      const localNormal = new THREE.Vector3(-1, 0, 0);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.left = {
        id: 'left',
        portType: 'armrest-right',
        targetPortType: 'right',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-right',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'armrest-center') {
      // Conector hacia atrás (-Z) para acoplarse a la unión entre puestos de la silla
      const userOffsetZ = Number(MILA_ACCESSORY_OFFSETS_MM.armrestCenter.z || -80) / 1000;
      const localPos = new THREE.Vector3(0.060, chairConnectorY, chairConnectorZ - userOffsetZ);
      const localNormal = new THREE.Vector3(0, 0, -1);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.center = {
        id: 'center',
        portType: 'armrest-center',
        targetPortType: 'seam',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'armrest-center',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }

    if (role === 'screen') {
      // Conector hacia adelante (+Z) para acoplarse al espaldar de la silla
      const localPos = new THREE.Vector3(0, chairConnectorY, 0);
      const localNormal = new THREE.Vector3(0, 0, 1);
      const worldPos = localPos.clone().applyMatrix4(targetObj.matrixWorld);
      const worldNormal = localNormal.clone().applyQuaternion(worldQuaternion).normalize();
      ports.screen = {
        id: 'screen',
        portType: 'screen',
        targetPortType: 'screen',
        localPos,
        localNormal,
        worldPos,
        worldNormal,
      };
      return {
        assembly: targetObj,
        isGiro: false,
        isAccessory: true,
        accessoryRole: 'screen',
        worldLeft: worldPos,
        normalLeft: worldNormal,
        connectorY: chairConnectorY,
        yaw,
        ports,
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // CASO C: Ensamble Silla Mila (1 a 4 puestos)
  // ─────────────────────────────────────────────────────────
  let hasArmrestLeft = false;
  let hasArmrestRight = false;
  let hasArmrestCenter = false;
  let hasScreen = false;

  targetObj.traverse((node) => {
    if (node === targetObj) return;
    const r = String(node.userData?.meta?.role || node.userData?.role || '').toLowerCase();
    if (r === 'armrest-left') hasArmrestLeft = true;
    if (r === 'armrest-right') hasArmrestRight = true;
    if (r === 'armrest-center') hasArmrestCenter = true;
    if (r === 'screen') hasScreen = true;
  });

  const quantity = Math.max(1, Number(targetObj.userData?.config?.quantity || targetObj.userData?.quantity || 1));
  const moduleSpacingM = Number(targetObj.userData?.config?.moduleSpacingMm || 600) / 1000;
  const totalWidthM = quantity * moduleSpacingM;

  const localLeft = new THREE.Vector3(0, chairConnectorY, chairConnectorZ);
  const localRight = new THREE.Vector3(totalWidthM, chairConnectorY, chairConnectorZ);
  const localScreen = new THREE.Vector3(0.300, chairConnectorY, -0.720);

  const localNormalLeft = new THREE.Vector3(-1, 0, 0);
  const localNormalRight = new THREE.Vector3(1, 0, 0);
  const localNormalScreen = new THREE.Vector3(0, 0, -1);

  const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
  const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);
  const worldScreen = localScreen.clone().applyMatrix4(targetObj.matrixWorld);
  const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
  const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();
  const normalScreen = localNormalScreen.clone().applyQuaternion(worldQuaternion).normalize();

  const ports = {
    left: {
      id: 'left',
      portType: 'left',
      isOccupied: hasArmrestLeft,
      localPos: localLeft,
      localNormal: localNormalLeft,
      worldPos: worldLeft,
      worldNormal: normalLeft,
    },
    right: {
      id: 'right',
      portType: 'right',
      isOccupied: hasArmrestRight,
      localPos: localRight,
      localNormal: localNormalRight,
      worldPos: worldRight,
      worldNormal: normalRight,
    },
    screen: {
      id: 'screen',
      portType: 'screen',
      isOccupied: hasScreen,
      localPos: localScreen,
      localNormal: localNormalScreen,
      worldPos: worldScreen,
      worldNormal: normalScreen,
    },
  };

  // Puertos intermedios para apoyabrazos centrales (si tiene 2 o más puestos)
  if (quantity >= 2) {
    for (let seamIndex = 1; seamIndex < quantity; seamIndex += 1) {
      const seamX = seamIndex * moduleSpacingM;
      const localSeam = new THREE.Vector3(seamX, chairConnectorY, chairConnectorZ);
      const localNormalSeam = new THREE.Vector3(0, 0, 1);
      const worldSeam = localSeam.clone().applyMatrix4(targetObj.matrixWorld);
      const normalSeam = localNormalSeam.clone().applyQuaternion(worldQuaternion).normalize();

      ports[`seam_${seamIndex}`] = {
        id: `seam_${seamIndex}`,
        portType: 'seam',
        seamIndex,
        isOccupied: hasArmrestCenter,
        localPos: localSeam,
        localNormal: localNormalSeam,
        worldPos: worldSeam,
        worldNormal: normalSeam,
      };
    }
  }

  return {
    assembly: targetObj,
    isGiro: false,
    isAccessory: false,
    hasArmrestLeft,
    hasArmrestRight,
    hasArmrestCenter,
    hasScreen,
    localLeft,
    localRight,
    localScreen,
    worldLeft,
    worldRight,
    worldScreen,
    normalLeft,
    normalRight,
    normalScreen,
    connectorY: chairConnectorY,
    yaw,
    ports,
  };
}

/**
 * Determina si un puerto específico en coordenadas de mundo ya está ocupado
 */
export function isMilaPortOccupied(portWorldPos, targetAssembly, allCandidates = [], thresholdM = 0.12) {
  if (!portWorldPos || !targetAssembly) return false;

  // 1. Si el objeto mismo tiene puertos marcados como isOccupied (por tener accesorios instalados)
  const targetConnectors = resolveMilaAssemblyConnectors(targetAssembly);
  if (targetConnectors?.ports) {
    for (const key of Object.keys(targetConnectors.ports)) {
      const p = targetConnectors.ports[key];
      if (p && p.worldPos && p.isOccupied) {
        const dist2D = new THREE.Vector2(
          portWorldPos.x - p.worldPos.x,
          portWorldPos.z - p.worldPos.z
        ).length();
        if (dist2D < 0.06) {
          return true;
        }
      }
    }
  }

  // 2. Verificar proximidad con cualquier otro objeto de la escena
  for (const candidate of allCandidates) {
    if (!candidate || candidate === targetAssembly) continue;
    const candidateConnectors = resolveMilaAssemblyConnectors(candidate);
    if (!candidateConnectors || !candidateConnectors.ports) continue;

    for (const portKey of Object.keys(candidateConnectors.ports)) {
      const p = candidateConnectors.ports[portKey];
      if (p && p.worldPos) {
        const dist2D = new THREE.Vector2(
          portWorldPos.x - p.worldPos.x,
          portWorldPos.z - p.worldPos.z
        ).length();
        const distY = Math.abs(portWorldPos.y - p.worldPos.y);
        if (dist2D < thresholdM && distY < 0.35) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Valida si dos puertos son compatibles para acoplarse entre sí
 */
function areMilaPortsCompatible(actPort, tgtPort) {
  if (!actPort || !tgtPort) return false;

  // Si el puerto activo exige un tipo de puerto destino específico:
  if (actPort.targetPortType) {
    return tgtPort.portType === actPort.targetPortType || tgtPort.id === actPort.targetPortType;
  }

  // Si el puerto destino exige un tipo específico:
  if (tgtPort.targetPortType) {
    return actPort.portType === tgtPort.targetPortType || actPort.id === tgtPort.targetPortType;
  }

  // Puertos laterales normales (silla izquierda/derecha y superficie de giro izquierda/derecha):
  const actIsSide =
    actPort.id === 'left' || actPort.id === 'right' || actPort.portType === 'giro';
  const tgtIsSide =
    tgtPort.id === 'left' ||
    tgtPort.id === 'right' ||
    tgtPort.portType === 'giro' ||
    tgtPort.portType === 'panel-wall';
  return actIsSide && tgtIsSide;
}

/**
 * Evalúa y calcula el mejor snap entre un objeto Mila activo (silla, giro o accesorio)
 * y todos los demás elementos Mila de la escena.
 */
export function findBestMilaConnectorSnap({
  activeAssembly,
  allAssemblies = [],
  allGiroSurfaces = [],
  allAccessories = [],
  allPanelDivisors = [],
  snapRadius = MILA_CONNECTOR_CONFIG.SNAP_RADIUS_M,
}) {
  if (!activeAssembly) return null;

  const activeConnectors = resolveMilaAssemblyConnectors(activeAssembly);
  if (!activeConnectors || !activeConnectors.ports) return null;

  const activeGroupId = activeAssembly.userData?.groupId;
  const allCandidates = [...allAssemblies, ...allGiroSurfaces, ...allAccessories, ...allPanelDivisors];

  let bestSnap = null;
  let minDistance = snapRadius;

  const activePortList = Object.values(activeConnectors.ports);

  for (const targetObj of allCandidates) {
    if (!targetObj || targetObj === activeAssembly) continue;

    // No hacer snap contra objetos que ya pertenecen al mismo groupId
    if (activeGroupId && targetObj.userData?.groupId === activeGroupId) {
      continue;
    }

    const targetConnectors = resolveMilaAssemblyConnectors(targetObj);
    if (!targetConnectors || !targetConnectors.ports) continue;

    const targetPortList = Object.values(targetConnectors.ports);

    for (const actPort of activePortList) {
      if (actPort.isOccupied) continue;

      for (const tgtPort of targetPortList) {
        if (tgtPort.isOccupied) continue;

        const effectiveTargetPort = resolvePanelDivisorTargetPort({
          targetConnectors,
          targetPort: tgtPort,
          activeAssembly,
        });

        // Comprobar compatibilidad de roles entre puertos
        if (!areMilaPortsCompatible(actPort, effectiveTargetPort)) {
          continue;
        }

        // Ignorar puertos objetivo ocupados por otra pieza
        if (isMilaPortOccupied(effectiveTargetPort.worldPos, targetObj, allCandidates)) {
          continue;
        }

        const dist = new THREE.Vector2(
          actPort.worldPos.x - effectiveTargetPort.worldPos.x,
          actPort.worldPos.z - effectiveTargetPort.worldPos.z
        ).length();

        if (dist < minDistance) {
          minDistance = dist;

          // Solución matemática exacta en 2D (plano XZ) para rotar el vector normal local del puerto activo
          // hasta que quede opuesto al vector normal del puerto objetivo (normalActiva = -normalObjetivo):
          const Ax = actPort.localNormal.x;
          const Az = actPort.localNormal.z;
          const Tx = effectiveTargetPort.worldNormal.x;
          const Tz = effectiveTargetPort.worldNormal.z;

          const sinAlpha = Ax * Tz - Az * Tx;
          const cosAlpha = -Ax * Tx - Az * Tz;
          const requiredYaw = Math.atan2(sinAlpha, cosAlpha);

          // Traslación del objeto activo
          const rotatedOffset = actPort.localPos
            .clone()
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), requiredYaw);

          const isAccessorySnap = Boolean(activeConnectors.isAccessory || targetConnectors.isAccessory);
          const isGiroSnap = Boolean(activeConnectors.isGiro || targetConnectors.isGiro);
          const isPanelDivisorSnap = Boolean(
            activeConnectors.isPanelDivisor || targetConnectors.isPanelDivisor
          );
          const giroDropM = (Number(MILA_GIRO_TUNE?.CONNECTED_Y_OFFSET_MM) || 0) / 1000;

          let targetPosY;
          if (isAccessorySnap) {
            targetPosY = activeConnectors.isAccessory ? targetObj.position.y : activeAssembly.position.y;
          } else if (isPanelDivisorSnap) {
            // Mantener la altura actual evita que la silla "se hunda" al acoplarse al panel divisor.
            targetPosY = activeAssembly.position.y;
          } else if (isGiroSnap) {
            targetPosY = (effectiveTargetPort.worldPos.y - rotatedOffset.y) + (activeConnectors.isGiro ? giroDropM : 0);
          } else {
            targetPosY = effectiveTargetPort.worldPos.y - rotatedOffset.y;
          }

          const targetPos = new THREE.Vector3(
            effectiveTargetPort.worldPos.x - rotatedOffset.x,
            Number.isFinite(targetPosY) ? targetPosY : activeAssembly.position.y,
            effectiveTargetPort.worldPos.z - rotatedOffset.z
          );

          if (isPanelDivisorSnap && effectiveTargetPort?.side) {
            const qty = resolveActiveMilaQuantity(activeAssembly);
            const baseShift = Number(PANEL_DIVISOR_CONNECTOR_TUNE.seatBackShiftM || 0);
            const multiExtra = qty > 1
              ? Number(PANEL_DIVISOR_CONNECTOR_TUNE.multiSeatBackExtraShiftM || 0)
              : 0;
            const panelSideAxis = new THREE.Vector3(0, 0, 1)
              .applyQuaternion(targetObj.getWorldQuaternion(new THREE.Quaternion()))
              .normalize();
            const sideSign = effectiveTargetPort.side === 'left' ? 1 : -1;
            // Mueve la silla hacia atrás siguiendo el eje real del panel, no el Z mundial.
            targetPos.addScaledVector(panelSideAxis, sideSign * (baseShift + multiExtra));

            const wallOverlapM = Number(PANEL_DIVISOR_CONNECTOR_TUNE.panelWallOverlapM || 0);
            if (wallOverlapM) {
              // Empuja la silla 2 cm hacia la pared para tapar el hueco visual.
              targetPos.addScaledVector(effectiveTargetPort.worldNormal, -wallOverlapM);
            }
          }

          bestSnap = {
            type: 'MILA_SNAP',
            targetObj,
            activeSide: actPort.id,
            targetSide: effectiveTargetPort.id,
            distance: dist,
            targetTransform: {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
              rotY: requiredYaw,
            },
            connectionPoint: effectiveTargetPort.worldPos.clone(),
            targetNormal: effectiveTargetPort.worldNormal.clone(),
            activeNormal: actPort.worldNormal.clone(),
          };
        }
      }
    }
  }

  return bestSnap;
}

/**
 * Unifica dos ensambles conectados bajo el mismo groupId para comportarse como un solo objeto rígido continuo.
 */
export function unifyMilaConnectedAssemblies(objA, objB) {
  if (!objA || !objB) return null;

  const rootA = getMilaAssemblyRoot(objA) || objA;
  const rootB = getMilaAssemblyRoot(objB) || objB;

  const groupA = rootA.userData?.groupId;
  const groupB = rootB.userData?.groupId;
  const commonGroupId =
    groupA || groupB || `MILA_GROUP_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  let sceneRoot = rootA;
  while (sceneRoot.parent) sceneRoot = sceneRoot.parent;

  sceneRoot.traverse((node) => {
    if (!node || !node.userData) return;
    const g = node.userData.groupId;
    if (g && (g === groupA || g === groupB)) {
      node.userData.groupId = commonGroupId;
    }
  });

  const applyGroupId = (root) => {
    if (!root) return;
    if (root.userData) {
      root.userData.groupId = commonGroupId;
    }
    root.traverse((child) => {
      if (child?.userData) {
        child.userData.groupId = commonGroupId;
      }
    });
  };

  applyGroupId(rootA);
  applyGroupId(rootB);

  return commonGroupId;
}
