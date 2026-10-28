import * as THREE from 'three';

export const EDUK_ABATIBLE_CODES = new Set([
  '22000116753',
  '22000116754',
  '22000116756',
  '22000116757',
  '22000116758',
  '22000116759',
  '22000116761',
  '22000116762',
]);

export const EDUK_ABATIBLE_STRUCTURE_CODES = {
  '60': {
    '120': {
      code: '22000116753',
      price: 2123100,
      desc: 'ESTRUCTURA MESA ABATIBLE 60X120CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '130': {
      code: '22000116754',
      price: 2134650,
      desc: 'ESTRUCTURA MESA ABATIBLE 60X130CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '150': {
      code: '22000116756',
      price: 2403450,
      desc: 'ESTRUCTURA MESA ABATIBLE 60X150CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '160': {
      code: '22000116757',
      price: 2415000,
      desc: 'ESTRUCTURA MESA ABATIBLE 60X160CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
  },
  '75': {
    '120': {
      code: '22000116758',
      price: 2123100,
      desc: 'ESTRUCTURA MESA ABATIBLE 75X120CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '130': {
      code: '22000116759',
      price: 2134650,
      desc: 'ESTRUCTURA MESA ABATIBLE 75X130CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '150': {
      code: '22000116761',
      price: 2403450,
      desc: 'ESTRUCTURA MESA ABATIBLE 75X150CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
    '160': {
      code: '22000116762',
      price: 2415000,
      desc: 'ESTRUCTURA MESA ABATIBLE 75X160CM H-74 COSTADOS CURVOS CON RODACHINAS EDUK EDKME330000',
    },
  },
};

export const EDUK_ABATIBLE_SURFACE_CODES = {
  curvas: {
    '60': {
      '120': {
        code: '22000123777',
        price: 614250,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 120X60X3CM FORMICA KUO KUSU190000',
      },
      '130': {
        code: '22000123777',
        price: 614250,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 120X60X3CM FORMICA KUO KUSU190000',
      },
      '150': {
        code: '22000123778',
        price: 742350,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 150X60X3CM FORMICA KUO KUSU190000',
      },
      '160': {
        code: '22000123779',
        price: 916650,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 165X60X3CM FORMICA KUO KUSU190000',
      },
    },
    '75': {
      '120': {
        code: '22000123780',
        price: 851550,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 120X90X3CM FORMICA KUO KUSU190000',
      },
      '130': {
        code: '22000123780',
        price: 851550,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 120X90X3CM FORMICA KUO KUSU190000',
      },
      '150': {
        code: '22000123781',
        price: 1100400,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 150X90X3CM FORMICA KUO KUSU190000',
      },
      '160': {
        code: '22000123782',
        price: 1442700,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS CURVAS 165X90X3CM FORMICA KUO KUSU190000',
      },
    },
  },
  rectas: {
    '60': {
      '120': {
        code: '22000123741',
        price: 564900,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 120X60X3CM FORMICA KUO KUSU170000',
      },
      '130': {
        code: '22000123741',
        price: 564900,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 120X60X3CM FORMICA KUO KUSU170000',
      },
      '150': {
        code: '22000123742',
        price: 699300,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 150X60X3CM FORMICA KUO KUSU170000',
      },
      '160': {
        code: '22000123743',
        price: 873600,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 165X60X3CM FORMICA KUO KUSU170000',
      },
    },
    '75': {
      '120': {
        code: '22000123744',
        price: 758100,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 120X80X3CM FORMICA KUO KUSU170000',
      },
      '130': {
        code: '22000123744',
        price: 758100,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 120X80X3CM FORMICA KUO KUSU170000',
      },
      '150': {
        code: '22000123745',
        price: 1006950,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 150X80X3CM FORMICA KUO KUSU170000',
      },
      '160': {
        code: '22000123746',
        price: 1382850,
        desc: 'SUPERFICIE TRABAJO RECTANGULAR ESQUINAS RECTAS 165X80X3CM FORMICA KUO KUSU170000',
      },
    },
  },
};

export const EDUK_ABATIBLE_PROPERTY_DEFINITIONS = [
  {
    key: 'width',
    label: 'Ancho',
    options: [
      { value: '120cm', label: '120 cm' },
      { value: '130cm', label: '130 cm' },
      { value: '150cm', label: '150 cm' },
      { value: '160cm', label: '160 cm' },
    ],
  },
  {
    key: 'depth',
    label: 'Profundidad',
    options: [
      { value: '60cm', label: '60 cm' },
      { value: '75cm', label: '75 cm' },
    ],
  },
  {
    key: 'corners',
    label: 'Esquinas',
    options: [
      { value: 'curvas', label: 'Esquinas curvas' },
      { value: 'rectas', label: 'Esquinas rectas' },
    ],
  },
];

export function isEdukAbatible(partOrCode) {
  if (!partOrCode) return false;
  if (typeof partOrCode === 'object' && (partOrCode?.edukAbatible || partOrCode?.userData?.edukAbatible)) {
    return true;
  }
  const code =
    typeof partOrCode === 'string'
      ? partOrCode
      : partOrCode?.code || partOrCode?.codigoPT || partOrCode?.userData?.codigoPT || '';
  const cleanCode = String(code).trim();
  return cleanCode === '22000116753' || EDUK_ABATIBLE_CODES.has(cleanCode);
}

export function getEdukAbatibleBOMParts(config = {}, country = 'CO') {
  const widthStr = String(config.width || '120cm').replace(/[^\d]/g, '') || '120';
  const depthStr = String(config.depth || '60cm').replace(/[^\d]/g, '') || '60';
  const corners = config.corners === 'rectas' ? 'rectas' : 'curvas';

  const structInfo =
    EDUK_ABATIBLE_STRUCTURE_CODES[depthStr]?.[widthStr] ||
    EDUK_ABATIBLE_STRUCTURE_CODES['60']['120'];

  const surfaceInfo =
    EDUK_ABATIBLE_SURFACE_CODES[corners]?.[depthStr]?.[widthStr] ||
    EDUK_ABATIBLE_SURFACE_CODES[corners]?.['60']?.['120'] ||
    EDUK_ABATIBLE_SURFACE_CODES.curvas['60']['120'];

  return [
    {
      code: structInfo.code,
      description: structInfo.desc,
      qty: 1,
      unitPrice: structInfo.price,
      prices: { [country]: structInfo.price, CO: structInfo.price },
    },
    {
      code: surfaceInfo.code,
      description: surfaceInfo.desc,
      qty: 1,
      unitPrice: surfaceInfo.price,
      prices: { [country]: surfaceInfo.price, CO: surfaceInfo.price },
    },
  ];
}

export function applyEdukAbatibleGeometry(obj, config = {}) {
  if (!obj) return;

  const widthCm = Number(String(config.width || '120cm').replace(/[^\d]/g, '')) || 120;
  const depthCm = Number(String(config.depth || '60cm').replace(/[^\d]/g, '')) || 60;
  const corners = config.corners === 'rectas' ? 'rectas' : 'curvas';

  const widthM = widthCm / 100;
  const depthM = depthCm / 100;

  const meshes = [];
  obj.traverse((child) => {
    if (child.isMesh && child !== obj.userData?.dynamicSurfaceMesh) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) return;

  // Clasificar meshes por su rango en Z (altura)
  let legsMesh = null;
  let beamMesh = null;
  const originalSurfaceMeshes = [];

  for (const m of meshes) {
    if (!m.geometry) continue;
    m.geometry.computeBoundingBox();
    const box = m.geometry.boundingBox;
    if (!box) continue;

    // La superficie está en z ~ 0.73 - 0.75
    if (box.min.z >= 0.72) {
      originalSurfaceMeshes.push(m);
    } else if (box.min.z < 0.05) {
      // Patas / costados con rodachinas tocan el suelo (z ~ 0)
      legsMesh = m;
    } else {
      // Viga central
      beamMesh = m;
    }
  }

  // Ocultar superficies originales del modelo GLB base
  originalSurfaceMeshes.forEach((m) => {
    m.visible = false;
  });

  const deltaW = widthM - 1.20;
  const scaleDepth = depthM / 0.60;
  const centerX = 0.60;
  const centerY = 0.30;

  // 1) Ajustar patas (legsMesh)
  if (legsMesh && legsMesh.geometry) {
    if (!legsMesh.userData.basePositions) {
      legsMesh.userData.basePositions = Float32Array.from(
        legsMesh.geometry.attributes.position.array
      );
    }
    const basePos = legsMesh.userData.basePositions;
    const posAttr = legsMesh.geometry.attributes.position;
    const vertexCount = posAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const bz = basePos[i * 3 + 2];

      let nx = bx;
      if (bx < centerX) {
        nx = bx - deltaW / 2;
      } else {
        nx = bx + deltaW / 2;
      }

      const ny = centerY + (by - centerY) * scaleDepth;

      posAttr.setXYZ(i, nx, ny, bz);
    }
    posAttr.needsUpdate = true;
    legsMesh.geometry.computeVertexNormals();
    legsMesh.geometry.computeBoundingBox();
    legsMesh.geometry.computeBoundingSphere();
  }

  // 2) Ajustar viga central (beamMesh)
  if (beamMesh && beamMesh.geometry) {
    if (!beamMesh.userData.basePositions) {
      beamMesh.userData.basePositions = Float32Array.from(
        beamMesh.geometry.attributes.position.array
      );
    }
    const baseBeamPos = beamMesh.userData.basePositions;
    const posBeamAttr = beamMesh.geometry.attributes.position;
    const vertexCount = posBeamAttr.count;
    const scaleWidth = widthM / 1.20;

    for (let i = 0; i < vertexCount; i++) {
      const bx = baseBeamPos[i * 3];
      const by = baseBeamPos[i * 3 + 1];
      const bz = baseBeamPos[i * 3 + 2];

      const nx = centerX + (bx - centerX) * scaleWidth;
      const ny = centerY + (by - centerY) * scaleDepth;

      posBeamAttr.setXYZ(i, nx, ny, bz);
    }
    posBeamAttr.needsUpdate = true;
    beamMesh.geometry.computeVertexNormals();
    beamMesh.geometry.computeBoundingBox();
    beamMesh.geometry.computeBoundingSphere();
  }

  // 3) Construir o actualizar la superficie paramétrica
  const minX = centerX - widthM / 2;
  const maxX = centerX + widthM / 2;
  const minY = centerY - depthM / 2;
  const maxY = centerY + depthM / 2;
  const r = corners === 'curvas' ? 0.05 : 0;

  const shape = new THREE.Shape();
  if (r <= 0.001) {
    shape.moveTo(minX, minY);
    shape.lineTo(maxX, minY);
    shape.lineTo(maxX, maxY);
    shape.lineTo(minX, maxY);
    shape.closePath();
  } else {
    shape.moveTo(minX + r, minY);
    shape.lineTo(maxX - r, minY);
    shape.absarc(maxX - r, minY + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(maxX, maxY - r);
    shape.absarc(maxX - r, maxY - r, r, 0, Math.PI / 2, false);
    shape.lineTo(minX + r, maxY);
    shape.absarc(minX + r, maxY - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(minX, minY + r);
    shape.absarc(minX + r, minY + r, r, Math.PI, (3 * Math.PI) / 2, false);
  }

  const surfaceGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.002,
    bevelThickness: 0.002,
  });
  // ExtrudeGeometry extruye en +Z de 0 a depth. Desplazar a la altura de la superficie
  surfaceGeometry.translate(0, 0, 0.7298);

  let surfaceMaterial = null;
  if (originalSurfaceMeshes.length > 0 && originalSurfaceMeshes[0].material) {
    surfaceMaterial = originalSurfaceMeshes[0].material;
  } else {
    surfaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f3ea,
      roughness: 0.35,
      metalness: 0.05,
    });
  }

  if (obj.userData?.dynamicSurfaceMesh) {
    obj.userData.dynamicSurfaceMesh.geometry.dispose();
    obj.userData.dynamicSurfaceMesh.geometry = surfaceGeometry;
    obj.userData.dynamicSurfaceMesh.material = surfaceMaterial;
    obj.userData.dynamicSurfaceMesh.visible = true;
  } else {
    const dynamicSurfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    dynamicSurfaceMesh.name = 'EDUK_ABATIBLE_DYNAMIC_SURFACE';
    dynamicSurfaceMesh.castShadow = true;
    dynamicSurfaceMesh.receiveShadow = true;

    // Añadir al mismo padre que las mallas originales
    const parentNode = (legsMesh && legsMesh.parent) || obj;
    parentNode.add(dynamicSurfaceMesh);
    obj.userData.dynamicSurfaceMesh = dynamicSurfaceMesh;
  }

  obj.userData.edukAbatible = {
    width: `${widthCm}cm`,
    depth: `${depthCm}cm`,
    corners,
  };
}
