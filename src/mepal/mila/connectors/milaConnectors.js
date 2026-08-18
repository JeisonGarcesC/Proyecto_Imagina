// src/mepal/mila/connectors/milaConnectors.js
import * as THREE from 'three';
import { MILA_GIRO_CONNECTOR_TUNE } from '../config/milaGiroTunables.js';

export const MILA_CONNECTOR_CONFIG = {
  SNAP_RADIUS_M: 0.48, // Radio de detección para acople óptimo (48 cm)
  CONNECTOR_RADIUS_M: 0.048, // Radio del cilindro conector
  CONNECTOR_THICKNESS_M: 0.035, // Grosor lateral
  COLOR_NORMAL: 0xf59e0b, // Amarillo / ámbar sólido tipo accesorio CAD
  COLOR_SNAP_ACTIVE: 0x10b981, // Verde esmeralda cuando está en rango de acople
  CORE_COLOR_NORMAL: 0xd97706, // Color contraste del núcleo interior
  CORE_COLOR_ACTIVE: 0x059669,
};

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
 * Obtiene el nodo raíz del ensamble o superficie de giro Mila.
 * Sube por la cadena de padres hasta encontrar el grupo contenedor (MILA_ASSEMBLY o MILA_GIRO_SURFACE).
 * Nunca confunde ensambles individuales con el groupId general.
 */
export function getMilaAssemblyRoot(object) {
  if (!object) return null;

  // 1. Subir por la cadena de padres directa hasta encontrar el contenedor del ensamble
  let curr = object;
  while (curr && curr.parent && curr !== curr.parent) {
    if (
      curr.userData?.kind === 'MILA_ASSEMBLY' ||
      curr.userData?.kind === 'MILA_GIRO_SURFACE' ||
      curr.userData?.type === 'mila' ||
      curr.userData?.type === 'MILA_GIRO_SURFACE' ||
      curr.userData?.meta?.role === 'giro-surface'
    ) {
      return curr;
    }
    curr = curr.parent;
  }

  // 2. Si el objeto mismo es el ensamble
  if (
    object.userData?.kind === 'MILA_ASSEMBLY' ||
    object.userData?.kind === 'MILA_GIRO_SURFACE' ||
    object.userData?.type === 'mila' ||
    object.userData?.type === 'MILA_GIRO_SURFACE' ||
    object.userData?.meta?.role === 'giro-surface' ||
    String(object.userData?.line || '').toUpperCase() === 'MILA'
  ) {
    return object;
  }

  // 3. Fallback: buscar por parentAssemblyId (únicamente por instanceId o uuid exacto, nunca por groupId ni code)
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
    if (found) return found;
  }

  return null;
}

/**
 * Resuelve los conectores (puertos A y B / izquierdo y derecho) de un objeto Mila
 * Compatible con ensambles Mila (sillas de 1 a 4 puestos) y Superficies de Giro Mila
 */
export function resolveMilaAssemblyConnectors(object) {
  if (!object) return null;

  const targetObj = getMilaAssemblyRoot(object);
  if (!targetObj) return null;

  const isGiro =
    targetObj.userData?.kind === 'MILA_GIRO_SURFACE' ||
    targetObj.userData?.type === 'MILA_GIRO_SURFACE' ||
    targetObj.userData?.meta?.role === 'giro-surface';

  const isMila =
    isGiro ||
    targetObj.userData?.kind === 'MILA_ASSEMBLY' ||
    targetObj.userData?.type === 'mila' ||
    String(targetObj.userData?.line || '').toUpperCase() === 'MILA';

  if (!isMila) return null;

  targetObj.updateMatrixWorld(true);
  const worldQuaternion = targetObj.getWorldQuaternion(new THREE.Quaternion());
  const yaw = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;

  // ─────────────────────────────────────────────────────────
  // CASO A: Superficie de Giro Mila (centrada en las platinas grises)
  // Las posiciones y normales se controlan desde milaGiroTunables.js
  // ─────────────────────────────────────────────────────────
  if (isGiro) {
    const angleDeg = Number(
      targetObj.userData?.angleDeg || targetObj.userData?.meta?.angleDeg || 60
    );
    const angleRad = (angleDeg * Math.PI) / 180;

    // Leer tunables por ángulo (fallback a 60° si el ángulo no está definido)
    const tune = MILA_GIRO_CONNECTOR_TUNE[angleDeg] || MILA_GIRO_CONNECTOR_TUNE[60];

    const tuneA = tune.portA;
    const tuneB = tune.portB;

    const localLeft = new THREE.Vector3(
      Number(tuneA.x),
      Number(tuneA.y),
      Number(tuneA.z)
    );
    const localRight = new THREE.Vector3(
      Number(tuneB.x),
      Number(tuneB.y),
      Number(tuneB.z)
    );

    const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
    const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);

    // Normales locales hacia afuera definidas en tunables
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
      angleDeg,
      angleRad,
      localLeft,
      localRight,
      localNormalLeft,
      localNormalRight,
      worldLeft,
      worldRight,
      normalLeft,
      normalRight,
      connectorY: Number(tuneA.y),
      yaw,
      ports: {
        left: {
          id: 'left',
          localPos: localLeft,
          localNormal: localNormalLeft,
          worldPos: worldLeft,
          worldNormal: normalLeft,
        },
        right: {
          id: 'right',
          localPos: localRight,
          localNormal: localNormalRight,
          worldPos: worldRight,
          worldNormal: normalRight,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────
  // CASO B: Ensamble Silla Mila (1 a 4 puestos)
  // Conectores a los extremos de las vigas/patas (Z ≈ -0.36m, Y ≈ 0.14m)
  // ─────────────────────────────────────────────────────────
  const quantity = Math.max(1, Number(targetObj.userData?.config?.quantity || 1));
  const moduleSpacingM = Number(targetObj.userData?.config?.moduleSpacingMm || 600) / 1000;
  const totalWidthM = quantity * moduleSpacingM;

  const chairConnectorY = 0.14;
  const chairConnectorZ = -0.36;

  const localLeft = new THREE.Vector3(0, chairConnectorY, chairConnectorZ);
  const localRight = new THREE.Vector3(totalWidthM, chairConnectorY, chairConnectorZ);

  const localNormalLeft = new THREE.Vector3(-1, 0, 0);
  const localNormalRight = new THREE.Vector3(1, 0, 0);

  const worldLeft = localLeft.clone().applyMatrix4(targetObj.matrixWorld);
  const worldRight = localRight.clone().applyMatrix4(targetObj.matrixWorld);

  const normalLeft = localNormalLeft.clone().applyQuaternion(worldQuaternion).normalize();
  const normalRight = localNormalRight.clone().applyQuaternion(worldQuaternion).normalize();

  return {
    assembly: targetObj,
    isGiro: false,
    localLeft,
    localRight,
    localNormalLeft,
    localNormalRight,
    worldLeft,
    worldRight,
    normalLeft,
    normalRight,
    connectorY: chairConnectorY,
    yaw,
    ports: {
      left: {
        id: 'left',
        localPos: localLeft,
        localNormal: localNormalLeft,
        worldPos: worldLeft,
        worldNormal: normalLeft,
      },
      right: {
        id: 'right',
        localPos: localRight,
        localNormal: localNormalRight,
        worldPos: worldRight,
        worldNormal: normalRight,
      },
    },
  };
}

/**
 * Determina si un puerto específico en coordenadas de mundo ya está conectado a otra pieza en la escena
 */
export function isMilaPortOccupied(portWorldPos, targetAssembly, allCandidates = [], thresholdM = 0.06) {
  if (!portWorldPos || !targetAssembly) return false;

  for (const candidate of allCandidates) {
    if (!candidate || candidate === targetAssembly) continue;
    const candidateConnectors = resolveMilaAssemblyConnectors(candidate);
    if (!candidateConnectors || !candidateConnectors.ports) continue;

    for (const portKey of ['left', 'right']) {
      const p = candidateConnectors.ports[portKey];
      if (p && p.worldPos) {
        const dist = portWorldPos.distanceTo(p.worldPos);
        if (dist < thresholdM) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Evalúa y calcula el mejor snap entre un objeto Mila/Giro activo y todos los demás elementos Mila de la escena.
 * Evalúa exhaustivamente todas las combinaciones posibles de puertos (izq-izq, izq-der, der-izq, der-der).
 */
export function findBestMilaConnectorSnap({
  activeAssembly,
  allAssemblies = [],
  allGiroSurfaces = [],
  snapRadius = MILA_CONNECTOR_CONFIG.SNAP_RADIUS_M,
}) {
  if (!activeAssembly) return null;

  const activeConnectors = resolveMilaAssemblyConnectors(activeAssembly);
  if (!activeConnectors || !activeConnectors.ports) return null;

  const activeGroupId = activeAssembly.userData?.groupId;
  const allCandidates = [...allAssemblies, ...allGiroSurfaces];

  let bestSnap = null;
  let minDistance = snapRadius;

  const activePorts = [
    activeConnectors.ports.left,
    activeConnectors.ports.right,
  ];

  for (const targetObj of allCandidates) {
    if (!targetObj || targetObj === activeAssembly) continue;

    // No hacer snap contra objetos que ya están unidos en el mismo grupo rígido continuo
    if (activeGroupId && targetObj.userData?.groupId === activeGroupId) {
      continue;
    }

    const targetConnectors = resolveMilaAssemblyConnectors(targetObj);
    if (!targetConnectors || !targetConnectors.ports) continue;

    const targetPorts = [
      targetConnectors.ports.left,
      targetConnectors.ports.right,
    ];

    // Evaluar todas las combinaciones de puertos (2 x 2 = 4 combinaciones)
    for (const actPort of activePorts) {
      for (const tgtPort of targetPorts) {
        // Ignorar puertos objetivo que ya estén ocupados por otra pieza conectada en la escena
        if (isMilaPortOccupied(tgtPort.worldPos, targetObj, allCandidates)) {
          continue;
        }

        const dist = new THREE.Vector2(
          actPort.worldPos.x - tgtPort.worldPos.x,
          actPort.worldPos.z - tgtPort.worldPos.z
        ).length();

        if (dist < minDistance) {
          minDistance = dist;

          // Solución matemática exacta en 2D (plano XZ) para rotar el vector normal local del puerto activo
          // hasta que quede opuesto al vector normal del puerto objetivo (normalActiva = -normalObjetivo):
          const Ax = actPort.localNormal.x;
          const Az = actPort.localNormal.z;
          const Tx = tgtPort.worldNormal.x;
          const Tz = tgtPort.worldNormal.z;

          const sinAlpha = Ax * Tz - Az * Tx;
          const cosAlpha = -Ax * Tx - Az * Tz;
          const requiredYaw = Math.atan2(sinAlpha, cosAlpha);

          // Traslación del objeto activo
          const rotatedOffset = actPort.localPos
            .clone()
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), requiredYaw);

          const targetPos = new THREE.Vector3(
            tgtPort.worldPos.x - rotatedOffset.x,
            activeAssembly.position.y,
            tgtPort.worldPos.z - rotatedOffset.z
          );

          bestSnap = {
            type: 'MILA_SNAP',
            targetObj,
            activeSide: actPort.id,
            targetSide: tgtPort.id,
            distance: dist,
            targetTransform: {
              x: targetPos.x,
              y: targetPos.y,
              z: targetPos.z,
              rotY: requiredYaw,
            },
            connectionPoint: tgtPort.worldPos.clone(),
            targetNormal: tgtPort.worldNormal.clone(),
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
 * Actualiza todas las piezas que pertenecían a groupA o groupB en la escena para evitar fragmentación de grupos.
 */
export function unifyMilaConnectedAssemblies(objA, objB) {
  if (!objA || !objB) return null;

  const rootA = getMilaAssemblyRoot(objA) || objA;
  const rootB = getMilaAssemblyRoot(objB) || objB;

  const groupA = rootA.userData?.groupId;
  const groupB = rootB.userData?.groupId;
  const commonGroupId =
    groupA || groupB || `MILA_GROUP_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  // Encontrar la raíz de la escena para actualizar todas las piezas que ya pertenecían a cualquiera de los dos grupos
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
