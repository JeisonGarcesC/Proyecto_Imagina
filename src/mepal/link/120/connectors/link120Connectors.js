// src/mepal/link/120/connectors/link120Connectors.js
import * as THREE from 'three';
import { getLink120WingLayout } from '../rules/link120Rules.js';
import { getLinkRoot } from '../../integration/linkRegistration.js';

export const LINK_120_CONNECTOR_CONFIG = {
  SNAP_RADIUS_M: 0.85, // Radio generoso y cómodo para acople de mesas grandes a 120° (85 cm)
  CONNECTOR_RADIUS_M: 0.05, // Radio del cilindro conector
  CONNECTOR_THICKNESS_M: 0.035, // Grosor lateral
  COLOR_NORMAL: 0xf59e0b, // Ámbar / amarillo normal tipo CAD
  COLOR_SNAP_ACTIVE: 0x10b981, // Verde esmeralda cuando está en rango de acople
  CORE_COLOR_NORMAL: 0xd97706,
  CORE_COLOR_ACTIVE: 0x059669,
};

export function isLink120Assembly(object) {
  if (!object?.userData) return false;
  const root = getLinkRoot(object) || object;
  return root.userData?.kind === 'LINK_PRODUCT';
}

/**
 * Resuelve todos los puertos terminales de conexión para una mesa a 120° o mesa Link estándar.
 * Cada mesa termina en sus extremos: la base recta y los extremos de las alas a 120° (o extremos izq/der en recta).
 */
export function resolveLink120AssemblyConnectors(object) {
  if (!object) return null;
  const root = getLinkRoot(object) || object;
  if (!isLink120Assembly(root)) return null;

  root.updateMatrixWorld(true);
  const config = root.userData?.config || {};
  const depthMm = Number(config.depthMm) >= 700 ? 750 : 600;
  const depthM = depthMm / 1000;
  const disp = config.disposicion120 || 'individual';
  const L = 1.297;
  const L_wing = 1.296;
  const baseX = -0.900;
  const surfaceY = 0.710;
  const cos60 = 0.5;
  const sin60 = Math.sqrt(3) / 2;

  const worldQuat = root.getWorldQuaternion(new THREE.Quaternion());
  const euler = new THREE.Euler().setFromQuaternion(worldQuat, 'YXZ');
  const yaw = euler.y;

  const ports = {};

  if (config.type !== 'puesto120') {
    // Mesa Link estándar (recta sencilla o doble)
    const puestos = Number(config.puestos) || 1;
    const widthMm = Number(config.widthMm) || 1200;
    const totalWidthM = (widthMm * puestos) / 1000;
    const isDoble = config.type === 'doble';
    const portWidthM = isDoble ? (depthMm * 2 + 26) / 1000 : depthM;
    const portType = isDoble ? 'base' : 'wing';

    const leftLocalPos = new THREE.Vector3(-totalWidthM / 2, surfaceY, 0);
    const leftLocalNormal = new THREE.Vector3(-1, 0, 0);
    ports.left = {
      id: 'left',
      side: 'left',
      portType,
      widthM: portWidthM,
      localPos: leftLocalPos,
      localNormal: leftLocalNormal,
      worldPos: leftLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: leftLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    const rightLocalPos = new THREE.Vector3(totalWidthM / 2, surfaceY, 0);
    const rightLocalNormal = new THREE.Vector3(1, 0, 0);
    ports.right = {
      id: 'right',
      side: 'right',
      portType,
      widthM: portWidthM,
      localPos: rightLocalPos,
      localNormal: rightLocalNormal,
      worldPos: rightLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: rightLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    return {
      root,
      is120: false,
      disp: config.type,
      yaw,
      ports,
    };
  }

  if (disp === '360') {
    // 1. Conjunto 360° (3 puestos a 120°): 3 brazos dobles a 120° entre sí
    // Cada brazo es de ancho doble (depthMm * 2 + 26)
    // Brazo 1: Base stem hacia -X
    const baseLocalPos = new THREE.Vector3(baseX, surfaceY, 0);
    const baseLocalNormal = new THREE.Vector3(-1, 0, 0);
    ports.base = {
      id: 'base',
      side: 'base',
      portType: 'base',
      widthM: (depthMm * 2 + 26) / 1000,
      localPos: baseLocalPos,
      localNormal: baseLocalNormal,
      worldPos: baseLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: baseLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // Brazo 2: Brazo a +60° desde la bifurcación (baseX + L, 0)
    const armX = baseX + L + L_wing * cos60;
    const armZ = L_wing * sin60;

    const wingDerLocalPos = new THREE.Vector3(armX, surfaceY, armZ);
    const wingDerLocalNormal = new THREE.Vector3(cos60, 0, sin60).normalize();
    ports.wing_right = {
      id: 'wing_right',
      side: 'wing_right',
      portType: 'base',
      widthM: (depthMm * 2 + 26) / 1000,
      localPos: wingDerLocalPos,
      localNormal: wingDerLocalNormal,
      worldPos: wingDerLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: wingDerLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // Brazo 3: Brazo a -60° desde la bifurcación (baseX + L, 0)
    const wingIzqLocalPos = new THREE.Vector3(armX, surfaceY, -armZ);
    const wingIzqLocalNormal = new THREE.Vector3(cos60, 0, -sin60).normalize();
    ports.wing_left = {
      id: 'wing_left',
      side: 'wing_left',
      portType: 'base',
      widthM: (depthMm * 2 + 26) / 1000,
      localPos: wingIzqLocalPos,
      localNormal: wingIzqLocalNormal,
      worldPos: wingIzqLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: wingIzqLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };
  } else if (disp === 'doble') {
    const layoutDer = getLink120WingLayout(depthMm, 'derecha', 26, 1297, 1296);
    const layoutIzq = getLink120WingLayout(depthMm, 'izquierda', 26, 1297, 1296);

    // 1. Puerto Base Central (ancho completo 120/150 cm - para acople doble a doble o doble a 360)
    const baseLocalPos = new THREE.Vector3(baseX, surfaceY, 0);
    const baseLocalNormal = new THREE.Vector3(-1, 0, 0);
    ports.base = {
      id: 'base',
      side: 'base',
      portType: 'base',
      widthM: (depthMm * 2 + 26) / 1000,
      localPos: baseLocalPos,
      localNormal: baseLocalNormal,
      worldPos: baseLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: baseLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // 2. Subpuertos Base Izquierda y Derecha (60/75 cm cada uno - para acople de un ala a la base)
    const halfBaseOffsetZ = (depthMm / 2 + 13) / 1000;
    const baseLeftLocalPos = new THREE.Vector3(baseX, surfaceY, -halfBaseOffsetZ);
    ports.base_left = {
      id: 'base_left',
      side: 'base_left',
      portType: 'wing',
      widthM: depthM,
      localPos: baseLeftLocalPos,
      localNormal: baseLocalNormal.clone(),
      worldPos: baseLeftLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: baseLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    const baseRightLocalPos = new THREE.Vector3(baseX, surfaceY, halfBaseOffsetZ);
    ports.base_right = {
      id: 'base_right',
      side: 'base_right',
      portType: 'wing',
      widthM: depthM,
      localPos: baseRightLocalPos,
      localNormal: baseLocalNormal.clone(),
      worldPos: baseRightLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: baseLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // 3. Extremo Ala Derecha (+60°, ancho sencillo depthM)
    const wingDerMidX = baseX + layoutDer.wingMidpoint[0] / 1000;
    const wingDerMidZ = layoutDer.wingMidpoint[1] / 1000;
    const wingDerLocalPos = new THREE.Vector3(wingDerMidX, surfaceY, wingDerMidZ);
    const wingDerLocalNormal = new THREE.Vector3(cos60, 0, sin60).normalize();
    ports.wing_right = {
      id: 'wing_right',
      side: 'wing_right',
      portType: 'wing',
      widthM: depthM,
      localPos: wingDerLocalPos,
      localNormal: wingDerLocalNormal,
      worldPos: wingDerLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: wingDerLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // 4. Extremo Ala Izquierda (-60°, ancho sencillo depthM)
    const wingIzqMidX = baseX + layoutIzq.wingMidpoint[0] / 1000;
    const wingIzqMidZ = layoutIzq.wingMidpoint[1] / 1000;
    const wingIzqLocalPos = new THREE.Vector3(wingIzqMidX, surfaceY, wingIzqMidZ);
    const wingIzqLocalNormal = new THREE.Vector3(cos60, 0, -sin60).normalize();
    ports.wing_left = {
      id: 'wing_left',
      side: 'wing_left',
      portType: 'wing',
      widthM: depthM,
      localPos: wingIzqLocalPos,
      localNormal: wingIzqLocalNormal,
      worldPos: wingIzqLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: wingIzqLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };
  } else {
    // Individual (1 sola superficie a 120°)
    const side = config.side120 || 'derecha';
    const isDer = side === 'derecha';
    const signZ = isDer ? 1 : -1;
    const layout = getLink120WingLayout(depthMm, side, 0, 1297, 1296);

    // 1. Puerto Base Sencillo (60/75 cm)
    const baseLocalPos = new THREE.Vector3(baseX, surfaceY, signZ * (depthM / 2));
    const baseLocalNormal = new THREE.Vector3(-1, 0, 0);
    ports.base = {
      id: 'base',
      side: 'base',
      portType: 'wing',
      widthM: depthM,
      localPos: baseLocalPos,
      localNormal: baseLocalNormal,
      worldPos: baseLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: baseLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };

    // 2. Extremo del Ala
    const wingMidX = baseX + layout.wingMidpoint[0] / 1000;
    const wingMidZ = layout.wingMidpoint[1] / 1000;
    const wingLocalPos = new THREE.Vector3(wingMidX, surfaceY, wingMidZ);
    const wingLocalNormal = new THREE.Vector3(cos60, 0, signZ * sin60).normalize();
    ports.wing = {
      id: 'wing',
      side: 'wing',
      portType: 'wing',
      widthM: depthM,
      localPos: wingLocalPos,
      localNormal: wingLocalNormal,
      worldPos: wingLocalPos.clone().applyMatrix4(root.matrixWorld),
      worldNormal: wingLocalNormal.clone().applyQuaternion(worldQuat).normalize(),
    };
  }

  return {
    root,
    is120: true,
    disp,
    yaw,
    ports,
  };
}

/**
 * Valida si un puerto está ocupado por otra mesa en la escena (proximidad < 8 cm).
 */
export function isLink120PortOccupied(portWorldPos, targetAssembly, allCandidates = [], thresholdM = 0.08, ignoredObjects = []) {
  if (!portWorldPos) return false;
  const ignoredSet = new Set(ignoredObjects.map((o) => getLinkRoot(o) || o).filter(Boolean));

  for (const candidate of allCandidates) {
    if (!candidate || candidate === targetAssembly) continue;
    const candRoot = getLinkRoot(candidate) || candidate;
    if (ignoredSet.has(candRoot)) continue;

    const candConnectors = resolveLink120AssemblyConnectors(candRoot);
    if (!candConnectors?.ports) continue;

    for (const p of Object.values(candConnectors.ports)) {
      if (!p?.worldPos) continue;
      const dist2D = new THREE.Vector2(portWorldPos.x - p.worldPos.x, portWorldPos.z - p.worldPos.z).length();
      const distY = Math.abs(portWorldPos.y - p.worldPos.y);
      if (dist2D < thresholdM && distY < 0.25) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verifica si dos puertos de mesas a 120° son geométricamente compatibles para acoplarse.
 */
export function areLink120PortsCompatible(actPort, tgtPort) {
  if (!actPort || !tgtPort) return false;

  // 1. Conexión de puertos base completos (doble a doble, doble a 360, 360 a 360)
  if (actPort.portType === 'base' && tgtPort.portType === 'base') {
    return Math.abs(actPort.widthM - tgtPort.widthM) < 0.05;
  }

  // 2. Conexión de alas / puertos estándar individuales (ancho ~600 mm o ~750 mm)
  if (actPort.portType === 'wing' && tgtPort.portType === 'wing') {
    if (Math.abs(actPort.widthM - tgtPort.widthM) >= 0.05) return false;

    const sA = actPort.side;
    const sB = tgtPort.side;

    // No permitir acoplar dos alas del mismo lado (evita que la cara de usuario colisione con espina trasera)
    if (sA === 'wing_right' && sB === 'wing_right') return false;
    if (sA === 'wing_left' && sB === 'wing_left') return false;

    // No permitir caras invertidas en subpuertos de base
    if (sA === 'wing_right' && sB === 'base_right') return false;
    if (sA === 'wing_left' && sB === 'base_left') return false;
    if (sA === 'base_right' && sB === 'wing_right') return false;
    if (sA === 'base_left' && sB === 'wing_left') return false;

    return true;
  }

  return false;
}

/**
 * Evalúa y calcula el mejor snap entre la mesa activa y las demás mesas a 120° de la escena.
 */
export function findBestLink120ConnectorSnap({
  activeAssembly,
  allAssemblies = [],
  snapRadius = LINK_120_CONNECTOR_CONFIG.SNAP_RADIUS_M,
}) {
  if (!activeAssembly) return null;
  const activeRoot = getLinkRoot(activeAssembly) || activeAssembly;
  const activeConnectors = resolveLink120AssemblyConnectors(activeRoot);
  if (!activeConnectors?.ports) return null;

  const activeGroupId = activeRoot.userData?.groupId;
  const activePortList = Object.values(activeConnectors.ports);

  let bestSnap = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of allAssemblies) {
    if (!candidate || candidate === activeRoot) continue;
    const targetRoot = getLinkRoot(candidate) || candidate;
    if (targetRoot === activeRoot) continue;

    // No acoplar contra objetos del mismo grupo continuo
    if (activeGroupId && targetRoot.userData?.groupId === activeGroupId) continue;

    const targetConnectors = resolveLink120AssemblyConnectors(targetRoot);
    if (!targetConnectors?.ports) continue;

    const targetPortList = Object.values(targetConnectors.ports);

    for (const actPort of activePortList) {
      for (const tgtPort of targetPortList) {
        if (!areLink120PortsCompatible(actPort, tgtPort)) continue;

        // Comprobar si el puerto objetivo ya está ocupado por otra mesa
        if (isLink120PortOccupied(tgtPort.worldPos, targetRoot, allAssemblies, 0.08, [activeRoot])) {
          continue;
        }

        // Solución matemática 2D en el plano XZ para rotar la normal local del puerto activo
        // de modo que quede opuesta a la normal mundial del puerto objetivo (normalActiva = -normalObjetivo):
        const Ax = actPort.localNormal.x;
        const Az = actPort.localNormal.z;
        const Tx = tgtPort.worldNormal.x;
        const Tz = tgtPort.worldNormal.z;

        const sinAlpha = Ax * Tz - Az * Tx;
        const cosAlpha = -Ax * Tx - Az * Tz;
        const requiredYaw = Math.atan2(sinAlpha, cosAlpha);

        // Trasladar la mesa activa para que el puerto activo coincida exactamente con el puerto objetivo
        const rotatedOffset = actPort.localPos
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), requiredYaw);

        const targetPos = new THREE.Vector3(
          tgtPort.worldPos.x - rotatedOffset.x,
          activeRoot.position.y,
          tgtPort.worldPos.z - rotatedOffset.z
        );

        // Distancia 1: ¿Qué tan cerca está la posición actual del ensamble respecto a la posición acoplada final?
        const alignDist = new THREE.Vector2(
          activeRoot.position.x - targetPos.x,
          activeRoot.position.z - targetPos.z
        ).length();

        // Distancia 2: Distancia directa entre los dos puertos en el mundo
        const directDist = new THREE.Vector2(
          actPort.worldPos.x - tgtPort.worldPos.x,
          actPort.worldPos.z - tgtPort.worldPos.z
        ).length();

        // El score es la menor distancia para dar la mejor respuesta tanto si el usuario acerca el centro como el puerto
        const scoreDist = Math.min(alignDist, directDist);

        if (scoreDist <= snapRadius && scoreDist < bestScore) {
          bestScore = scoreDist;
          bestSnap = {
            activeSide: actPort.side,
            targetSide: tgtPort.side,
            activePort: actPort,
            targetPort: tgtPort,
            activeAssembly: activeRoot,
            targetObj: targetRoot,
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
 * Unifica dos ensambles conectados bajo el mismo groupId para formar un solo grupo continuo rígido.
 */
export function unifyLink120ConnectedAssemblies(objA, objB) {
  if (!objA || !objB) return null;

  const rootA = getLinkRoot(objA) || objA;
  const rootB = getLinkRoot(objB) || objB;

  const groupA = rootA.userData?.groupId;
  const groupB = rootB.userData?.groupId;
  const commonGroupId =
    groupA || groupB || `LINK_120_GROUP_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  let sceneRoot = rootA;
  while (sceneRoot.parent) sceneRoot = sceneRoot.parent;

  sceneRoot.traverse((node) => {
    if (!node?.userData) return;
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
