// src/mepal/compendio/renderers/CompendioRenderer.js
import {
  Group,
  Mesh,
  BoxGeometry,
  Shape,
  ExtrudeGeometry,
  MeshStandardMaterial,
} from 'three';
import { createFootprint2D } from '../../../plan2d/footprint2D.js';
import {
  COMPENDIO_CURVE_SAGITTA_MM,
  COMPENDIO_EN_D_CURVE_SAGITTA_MM,
  isCompendioCurva2,
  isCompendioCurva60a75,
} from '../definitions/compendioDefaults.js';

export function renderCompendioProduct(product) {
  const root = new Group();
  const c = product.config;

  const surfaceMaterial = new MeshStandardMaterial({
    color: c.surfaceColor || '#d8c4a5',
    roughness: 0.65,
    metalness: 0.05,
  });

  for (const part of product.parts) {
    const [w, h, d] = part.dimensions;
    const [px, py, pz] = part.position;
    const isEnP = part.shapeType === 'EN_P' || part.meta?.shapeType === 'EN_P' || c.surfaceType === 'En P';
    const isEnD = part.shapeType === 'EN_D' || part.meta?.shapeType === 'EN_D' || c.surfaceType === 'En D';
    const isCurva60a75 =
      part.shapeType === 'ORGANICA_CURVA_60_75' ||
      part.meta?.shapeType === 'ORGANICA_CURVA_60_75' ||
      isCompendioCurva60a75(part.meta?.surfaceType) ||
      isCompendioCurva60a75(c.surfaceType);
    const isCurva2 =
      part.shapeType === 'ORGANICA_CURVA_2' ||
      part.meta?.shapeType === 'ORGANICA_CURVA_2' ||
      isCompendioCurva2(part.meta?.surfaceType) ||
      isCompendioCurva2(c.surfaceType);
    const isCurved = isEnP || isEnD || isCurva60a75 || isCurva2;

    const L = w / 1000;
    const W = d / 1000;
    const H = h / 1000;
    const sP = COMPENDIO_CURVE_SAGITTA_MM / 1000; // 0.077 m
    const hw = W / 2;

    const componentGroup = new Group();
    componentGroup.name = part.key;
    componentGroup.userData = {
      kind: 'COMPENDIO_COMPONENT_SURFACE',
      type: part.type || 'superficie',
      componentEntityKind: 'COMPENDIO_COMPONENT',
      componentRole: part.role,
      materialRole: part.materialRole,
      componentKey: part.key,
      codigoPT: part.code,
      code: part.code,
      description: part.description,
      dim: { widthMm: w, heightMm: h, thickMm: h, depthMm: d },
      materialBase: part.materialBase || 'FORMICA',
      isPartRoot: true,
      meta: part.meta || null,
      parametricOwner: 'COMPENDIO_PRODUCT',
    };

    let geometry;
    const footprintPoints = [];

    if (isEnD) {
      const sD = COMPENDIO_EN_D_CURVE_SAGITTA_MM / 1000; // 0.100 m
      const straightW = (part.meta?.straightDepthMm || (d - COMPENDIO_EN_D_CURVE_SAGITTA_MM)) / 1000; // 0.6 o 0.75 m
      const Dtotal = straightW + sD;
      const halfL = L / 2;

      // Radio exacto del arco circular frontal:
      // Para L=0.9m: R = (0.45^2 + 0.1^2)/(2 * 0.1) = 1.0625 m
      // Diagonal desde esquina recta (0.45, (straightW - sD)/2) a cúspide (0, Dtotal/2) = sqrt(0.45^2 + 0.1^2) = 0.461 m
      const R = (halfL * halfL + sD * sD) / (2 * sD);
      const zc = Dtotal / 2 - R;
      const thetaStart = Math.atan2(R - sD, halfL);
      const thetaEnd = Math.PI - thetaStart;

      // 1. Esquina trasera izquierda
      footprintPoints.push({ x: -halfL, z: -Dtotal / 2 });
      // 2. Esquina trasera derecha
      footprintPoints.push({ x: halfL, z: -Dtotal / 2 });
      // 3. Esquina delantera derecha (final del costado recto de 600 o 750 mm)
      footprintPoints.push({ x: halfL, z: (straightW - sD) / 2 });

      // 4. Muestreo del arco frontal circular
      const arcSteps = 20;
      for (let i = 1; i < arcSteps; i++) {
        const t = thetaStart + ((thetaEnd - thetaStart) * i) / arcSteps;
        footprintPoints.push({
          x: R * Math.cos(t),
          z: zc + R * Math.sin(t),
        });
      }

      // 5. Esquina delantera izquierda
      footprintPoints.push({ x: -halfL, z: (straightW - sD) / 2 });

      // Generación 3D precisa con ExtrudeGeometry a partir de los puntos 2D
      const shape = new Shape();
      shape.moveTo(footprintPoints[0].x, -footprintPoints[0].z);
      for (let i = 1; i < footprintPoints.length; i++) {
        shape.lineTo(footprintPoints[i].x, -footprintPoints[i].z);
      }
      shape.closePath();

      geometry = new ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
    } else if (isEnP) {
      // Radio exacto del arco circular a partir del ancho W y la flecha s (77 mm)
      // Para W=0.6m: R = (0.3^2 + 0.077^2)/(2 * 0.077) = 0.6229 m
      // Diagonal desde esquina recta (0.523, 0.3) a cúspide (0.6, 0) = sqrt(0.3^2 + 0.077^2) = 0.310 m
      const R = (hw * hw + sP * sP) / (2 * sP);
      const xc = L / 2 - R;
      const alpha = Math.atan2(hw, R - sP);

      const shape = new Shape();
      shape.moveTo(-L / 2, -hw);
      shape.lineTo(L / 2 - sP, -hw);
      shape.absarc(xc, 0, R, -alpha, alpha, false);
      shape.lineTo(-L / 2, hw);
      shape.closePath();

      geometry = new ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);

      // Puntos del footprint 2D para CAD y snap
      footprintPoints.push({ x: -L / 2, z: -hw });
      footprintPoints.push({ x: L / 2 - sP, z: -hw });

      const arcSteps = 16;
      for (let i = 1; i < arcSteps; i++) {
        const t = -alpha + (2 * alpha * i) / arcSteps;
        footprintPoints.push({
          x: xc + R * Math.cos(t),
          z: R * Math.sin(t),
        });
      }

      footprintPoints.push({ x: L / 2 - sP, z: hw });
      footprintPoints.push({ x: -L / 2, z: hw });
    } else if (isCurva60a75) {
      const isInverted = Boolean(c.inverted || part.meta?.inverted);
      const halfL = L / 2;
      const leftDepth = 0.750;
      const rightDepth = 0.600;
      const maxDepth = 0.750;
      const zBack = -maxDepth / 2; // -0.375 m
      const zLeftFront = zBack + leftDepth; // +0.375 m
      const zRightFront = zBack + rightDepth; // +0.225 m

      // Tramo recto exacto de 48 mm (0.048 m) según plano CAD
      const straightSide = 0.048;
      const xA = -halfL + straightSide; // Inicio de la curva por la izquierda
      const xB = halfL - straightSide;  // Fin de la curva por la derecha
      const zA = zLeftFront;
      const zB = zRightFront;

      const deltaX = xB - xA; // Distancia en X de la curva
      const deltaZ = zA - zB; // 0.150 m

      // Radio exacto de los dos arcos circulares tangentes opuestos (curva reversa):
      // R = (deltaX^2 + deltaZ^2) / (4 * deltaZ)
      const R = (deltaX * deltaX + deltaZ * deltaZ) / (4 * deltaZ);
      const thetaMax = Math.asin(Math.min(1, (deltaX / 2) / R));

      // Centros de los dos arcos circulares con tangentes horizontales en ambos extremos:
      // Arco 1 (izquierdo): centro debajo de (xA, zA), curva hacia adentro
      const c1x = xA;
      const c1z = zA - R;
      // Arco 2 (derecho): centro encima de (xB, zB), curva hacia afuera
      const c2x = xB;
      const c2z = zB + R;

      const rawPoints = [];

      // 1. Esquina trasera izquierda
      rawPoints.push({ x: -halfL, z: zBack });
      // 2. Esquina trasera derecha
      rawPoints.push({ x: halfL, z: zBack });
      // 3. Esquina delantera derecha (final del costado derecho de 600 mm)
      rawPoints.push({ x: halfL, z: zRightFront });

      // 4. Tramo recto derecho (0.048 m)
      rawPoints.push({ x: xB, z: zRightFront });

      // 5. Muestreo de la curva reversa simétrica (dos arcos circulares opuestos continuos)
      // Muestreo del Arco 2 (desde xB hacia el punto medio M en x=0):
      const arcSteps = 16;
      for (let i = 1; i <= arcSteps; i++) {
        const t = thetaMax * (i / arcSteps);
        const x = c2x - R * Math.sin(t);
        const z = c2z - R * Math.cos(t);
        rawPoints.push({ x, z });
      }

      // Muestreo del Arco 1 (desde el punto medio M hacia xA):
      for (let i = 1; i < arcSteps; i++) {
        const t = thetaMax * (1 - i / arcSteps);
        const x = c1x + R * Math.sin(t);
        const z = c1z + R * Math.cos(t);
        rawPoints.push({ x, z });
      }

      // 6. Fin de la curva por la izquierda (xA, zA) y tramo recto izquierdo (0.048 m)
      rawPoints.push({ x: xA, z: zLeftFront });
      // 7. Esquina delantera izquierda (final del costado izquierdo de 750 mm)
      rawPoints.push({ x: -halfL, z: zLeftFront });

      // Si está invertida, reflejar en X (x -> -x) e invertir orden para preservar orientación normal
      const pts = isInverted
        ? rawPoints.map((p) => ({ x: -p.x, z: p.z })).reverse()
        : rawPoints;

      for (const p of pts) {
        footprintPoints.push(p);
      }

      // Generación 3D precisa con ExtrudeGeometry a partir de los puntos del footprint 2D
      const shape = new Shape();
      shape.moveTo(footprintPoints[0].x, -footprintPoints[0].z);
      for (let i = 1; i < footprintPoints.length; i++) {
        shape.lineTo(footprintPoints[i].x, -footprintPoints[i].z);
      }
      shape.closePath();

      geometry = new ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
    } else if (isCurva2) {
      const isInverted = Boolean(c.inverted || part.meta?.inverted);
      const halfL = L / 2;
      // En orientación normal: izquierda es mainDepth (0.900 o 1.200 m), derecha es 0.750 m
      const mainDepth =
        Number(c.depthMm) === 1200 ||
        Number(part.meta?.leftDepthMm) === 1200 ||
        Number(part.meta?.rightDepthMm) === 1200 ||
        d >= 1150
          ? 1.200
          : 0.900;
      const rightDepth = 0.750;
      const maxDepth = mainDepth;
      const zBack = -maxDepth / 2;
      const zLeftFront = zBack + mainDepth;
      const zRightFront = zBack + rightDepth;

      // Medidas exactas según plano técnico de fabricación Mepal (Escala 1:10):
      // - Tramo horizontal izquierdo: 595.5 mm (cota 595.5 ± 0.5)
      // - Tramo vertical hacia arriba: 47.7 mm (cota 47.7 mm, 895.5 - 847.8 = 47.7 mm)
      // - Punto 1 (inicio curva): X = 595.5 mm, Y = 847.8 mm desde borde trasero
      // - Punto 2 (ápice curva 1, R327.4): X = 944.2 mm, Y = 552.4 mm desde borde trasero
      // - Punto 3 (inflexión curva 2/3, R452.6 a R441.5): X = 1184.2 mm, Y = 647.3 mm desde borde trasero
      // - Punto 4 (fin curva): X = 1447.8 mm, Y = 745.5 mm desde borde trasero
      // - Tramo horizontal derecho: 47.7 mm (1495.5 - 1447.8 = 47.7 mm)
      const straightLeft = 0.5955;
      const straightUpLeft = 0.0477;
      const straightRight = 0.0477;

      const xLeft = -halfL + straightLeft;

      // Punto 1: inicio de la curva ergonómica tras el tramo vertical de 47.7 mm
      const x1 = xLeft;
      const z1 = zLeftFront - straightUpLeft; // 847.8 mm desde zBack

      // Punto 2: ápice del arco 1 (R327.4)
      const deltaX1 = 0.3487; // 944.2 - 595.5 = 348.7 mm
      const x2 = x1 + deltaX1;
      const z2 = zBack + 0.5524; // Profundidad exacta 552.4 mm desde el borde trasero
      const deltaZ1 = z1 - z2; // 295.4 mm (847.8 - 552.4 mm)

      // Punto D: fin de la curva derecha y remate con tangencia horizontal
      const xD = halfL - straightRight;
      const zD = zRightFront;

      // Geometría CAD circular de transición derecha (restaurada como estaba antes):
      // Sistema de doble arco circular (R2 y R3) con tramo conector tangente de 105 mm:
      // - Arco 3 (convexo, radio R3): inicia en xD con tangencia horizontal pura y curva de inmediato
      //   hacia arriba, eliminando el aplanamiento o recta indeseada.
      // - Tramo recto tangente conector de 105 mm (Lt = 0.105 m a ángulo phi).
      // - Arco 2 (cóncavo, radio R2): desciende desde el ápice (x2, z2) con tangencia horizontal pura.
      const deltaXRight = xD - x2;
      const deltaZRight = zD - z2;
      const Lt = 0.105; // 105 mm exactos según cota del plano técnico

      // Ángulo de inclinación phi que garantiza cierre continuo C1 perfecto:
      const phi = 2 * Math.atan2(deltaZRight, deltaXRight + Lt);

      // Suma total de radios S = R2 + R3:
      const S = (deltaXRight - Lt * Math.cos(phi)) / Math.sin(phi);

      // Distribución proporcional según radios de fabricación Mepal (R452.6 y R441.5):
      const R2 = S * (452.6 / (452.6 + 441.5));
      const R3 = S * (441.5 / (452.6 + 441.5));

      // Punto C: inicio del arco 3 (unión con el tramo recto de 105 mm)
      const xC = xD - R3 * Math.sin(phi);
      const zC = zD - R3 * (1 - Math.cos(phi));

      // Punto B: fin del arco 2 (unión con el tramo recto de 105 mm)
      const xB = xC - Lt * Math.cos(phi);
      const zB = zC - Lt * Math.sin(phi);

      const rawPoints = [];

      // 1. Esquina trasera izquierda
      rawPoints.push({ x: -halfL, z: zBack });
      // 2. Esquina trasera derecha
      rawPoints.push({ x: halfL, z: zBack });
      // 3. Esquina delantera derecha (costado derecho de 745.5 / 750 mm)
      rawPoints.push({ x: halfL, z: zRightFront });
      // 4. Tramo recto horizontal derecho desde la esquina derecha hasta xD
      rawPoints.push({ x: xD, z: zD });

      // 5. Arco 3 (convexo, radio R3): desde xD hacia xC con tangencia horizontal en xD
      // Curvatura circular orgánica pura desde el lado más pequeño (sin aplanamiento)
      const arc3Steps = 24;
      for (let i = 1; i < arc3Steps; i++) {
        const u = phi * (i / arc3Steps);
        const x = xD - R3 * Math.sin(u);
        const z = zD - R3 * (1 - Math.cos(u));
        rawPoints.push({ x, z });
      }
      rawPoints.push({ x: xC, z: zC });

      // 6. Tramo recto tangente conector de 105 mm: desde (xC, zC) hacia (xB, zB)
      rawPoints.push({ x: xB, z: zB });

      // 7. Arco 2 (cóncavo, radio R2): desde (xB, zB) hacia el ápice (x2, z2)
      const arc2Steps = 24;
      for (let i = 1; i < arc2Steps; i++) {
        const v = phi * (1 - i / arc2Steps);
        const x = x2 + R2 * Math.sin(v);
        const z = z2 + R2 * (1 - Math.cos(v));
        rawPoints.push({ x, z });
      }

      // 8. Ápice de la curva ergonómica a exactamente 552.4 mm del borde trasero
      rawPoints.push({ x: x2, z: z2 });

      // 9. Tramo 1 (Arco ergonómico R327.4): desde x2 (ápice) hacia x1 con tangencia vertical pura en x1
      const steps1 = 36;
      for (let i = 1; i <= steps1; i++) {
        const angle = (Math.PI / 2) * (1 - i / steps1);
        const x = x1 + deltaX1 * (1 - Math.cos(angle));
        const z = z1 - deltaZ1 * Math.sin(angle);
        rawPoints.push({ x, z });
      }

      // 10. Fin del arco 1 en (x1, z1) con tangencia vertical
      rawPoints.push({ x: x1, z: z1 });

      // 11. Tramo recto vertical hacia arriba de 47.7 mm ("parte para arriba recta")
      rawPoints.push({ x: xLeft, z: zLeftFront });

      // 12. Esquina delantera izquierda del tramo horizontal de 595.5 mm
      rawPoints.push({ x: -halfL, z: zLeftFront });

      // Si está invertida, reflejar en X (x -> -x) e invertir orden para preservar orientación normal
      const pts = isInverted
        ? rawPoints.map((p) => ({ x: -p.x, z: p.z })).reverse()
        : rawPoints;

      for (const p of pts) {
        footprintPoints.push(p);
      }

      // Generación 3D precisa con ExtrudeGeometry a partir de los puntos del footprint 2D
      const shape = new Shape();
      shape.moveTo(footprintPoints[0].x, -footprintPoints[0].z);
      for (let i = 1; i < footprintPoints.length; i++) {
        shape.lineTo(footprintPoints[i].x, -footprintPoints[i].z);
      }
      shape.closePath();

      geometry = new ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
    } else {
      geometry = new BoxGeometry(L, H, W);
      footprintPoints.push(
        { x: -L / 2, z: -hw },
        { x: L / 2, z: -hw },
        { x: L / 2, z: hw },
        { x: -L / 2, z: hw }
      );
    }

    const mesh = new Mesh(geometry, surfaceMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = part.description;
    if (isCurved) {
      mesh.position.y = -H / 2;
    }

    componentGroup.add(mesh);
    componentGroup.position.set(px / 1000, py / 1000, pz / 1000);

    // 2D footprint para el plano CAD y snap
    componentGroup.userData.footprint2D = createFootprint2D({ points: footprintPoints });

    // Copiar metadatos a cada mesh hijo
    componentGroup.traverse((node) => {
      Object.assign(node.userData, componentGroup.userData);
      if (node !== componentGroup) delete node.userData.isPartRoot;
    });

    root.add(componentGroup);
  }

  return root;
}

export function disposeCompendioGeometry(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.isMesh) {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((m) => m?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    }
  });
}
