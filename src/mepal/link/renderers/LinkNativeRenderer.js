import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Shape, Path, ExtrudeGeometry } from 'three';
import { getLinkPartDimensions, getLinkPartPosition, getLinkPartRotationY } from '../parts/linkParts.js';
import { applyLinkComponentTransform } from '../integration/linkComponentIdentity.js';
import { createLink120SurfaceShape } from '../120/parts/superficie120Shape.js';
import { createFootprint2D } from '../../../plan2d/footprint2D.js';

function addBox(parent, size, position, material) {
  const mesh = new Mesh(new BoxGeometry(...size.map(v => v / 1000)), material);
  mesh.position.set(...position.map(v => v / 1000));
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function renderLinkProduct(product) {
  const root = new Group();
  const c = product.config;
  const materials = {
    surface: new MeshStandardMaterial({ color: c.surfaceColor, roughness: 0.65 }),
    structure: new MeshStandardMaterial({ color: c.supportFinish === 'CROMADO' ? '#c9ced4' : c.structureColor, roughness: c.supportFinish === 'CROMADO' ? 0.15 : 0.45, metalness: c.supportFinish === 'CROMADO' ? 0.9 : 0.3 }),
    grommet: new MeshStandardMaterial({ color: c.grommetFinish === 'PAINTED' ? c.structureColor : '#bfc5ca', metalness: 0.7, roughness: 0.3 }),
    pedestal: new MeshStandardMaterial({ color: c.pedestalColor, roughness: 0.65 }),
    pantallaFrontal: new MeshStandardMaterial({ 
      color: c.pantallaFrontalMaterial === 'vidrio' ? '#bfdff2' : (c.pantallaFrontalMaterial === 'tela' ? '#9b9b9b' : '#d8c7a3'), 
      roughness: c.pantallaFrontalMaterial === 'vidrio' ? 0.05 : 0.75, 
      transparent: c.pantallaFrontalMaterial === 'vidrio', 
      opacity: c.pantallaFrontalMaterial === 'vidrio' ? 0.38 : 1 
    }),
    pantallaLateral: new MeshStandardMaterial({ 
      color: c.pantallaLateralMaterial === 'vidrio' ? '#bfdff2' : (c.pantallaLateralMaterial === 'tela' ? '#9b9b9b' : '#d8c7a3'), 
      roughness: c.pantallaLateralMaterial === 'vidrio' ? 0.05 : 0.75, 
      transparent: c.pantallaLateralMaterial === 'vidrio', 
      opacity: c.pantallaLateralMaterial === 'vidrio' ? 0.38 : 1 
    }),
    pantallaFalda: new MeshStandardMaterial({ 
      color: c.pantallaFaldaMaterial === 'vidrio' ? '#bfdff2' : (c.pantallaFaldaMaterial === 'tela' ? '#9b9b9b' : '#d8c7a3'), 
      roughness: c.pantallaFaldaMaterial === 'vidrio' ? 0.05 : 0.75, 
      transparent: c.pantallaFaldaMaterial === 'vidrio', 
      opacity: c.pantallaFaldaMaterial === 'vidrio' ? 0.38 : 1 
    }),
  };
  for (const part of product.parts) {
    if (part.excludeFrom3D) continue;
    const dimensions = getLinkPartDimensions(part);
    const position = getLinkPartPosition(part);
    const group = new Group();
    group.name = part.key;
    group.userData = { kind: 'LINK_COMPONENT', type: part.type, isPartRoot: true,
      componentRole: part.role, materialRole: part.materialRole,
      componentKey: part.key, codigoPT: part.code, description: part.description, provisional: !!part.provisional,
      dim: { widthMm: dimensions[0], heightMm: dimensions[1], thickMm: dimensions[1], depthMm: dimensions[2] },
      materialBase: part.materialBase || (part.role === 'PEDESTAL' || part.role === 'CREDENZA' ? 'FORMICA' : 'METAL'),
      moduleIndex: part.moduleIndex, componentConfig: part.componentConfig || null,
      configTargetKey: part.configTargetKey || part.key, parentComponentKey: part.parentComponentKey || null,
      leaderRole: part.leaderRole || null, meta: part.meta || null, is120: !!part.is120 };
    const [w, h, d] = dimensions, material = materials[part.materialRole === 'pantalla' ? (part.role === 'PANTALLA_LATERAL_BOARD' ? 'pantallaLateral' : part.role === 'PANTALLA_FALDA_BOARD' ? 'pantallaFalda' : 'pantallaFrontal') : part.materialRole];
    if (part.model?.kind === 'glb' && part.model?.src) {
      // Igual que Koncisa Plus: la pieza física procede directamente del GLB.
      // El grupo conserva selección y metadatos mientras termina la carga asíncrona.
    } else if (part.role === 'PEDESTAL') {
      const panel = 18;
      for (const sign of [-1, 1]) addBox(group, [panel, h, d], [sign * (w - panel) / 2, 0, 0], material);
      for (const sign of [-1, 1]) addBox(group, [w - panel * 2, panel, d], [0, sign * (h - panel) / 2, 0], material);
      addBox(group, [w - panel * 2, h - panel * 2, panel], [0, 0, (d - panel) / 2], material);
      for (let i = 0; i < 3; i++) addBox(group, [w - 4, (h - 12) / 3, panel], [0, h / 2 - (i + 0.5) * h / 3, -(d - panel) / 2], material);
    } else if (part.role === 'SURFACE' && part.grommetHole) {
      const shape=new Shape();
      shape.moveTo(-w/2000,-d/2000);shape.lineTo(w/2000,-d/2000);shape.lineTo(w/2000,d/2000);shape.lineTo(-w/2000,d/2000);shape.closePath();
      const hole=new Path(),hw=part.grommetHole.widthMm/2000,hd=part.grommetHole.depthMm/2000;
      const hx=part.grommetHole.xMm/1000,hz=-part.grommetHole.zMm/1000;
      hole.moveTo(hx-hw,hz-hd);hole.lineTo(hx-hw,hz+hd);hole.lineTo(hx+hw,hz+hd);hole.lineTo(hx+hw,hz-hd);hole.closePath();shape.holes.push(hole);
      const geometry=new ExtrudeGeometry(shape,{depth:h/1000,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
      const mesh=new Mesh(geometry,material);mesh.position.y=-h/2000;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    } else if (part.role === 'SURFACE' && (part.is120 || part.integracionType === '120')) {
      const depthMm = part.depthMm || d;
      const hasGrommet = part.hasGrommet !== false;
      const side = part.side || 'derecha';
      const grommetSide = part.grommetSide || 'izquierda';
      const L = part.L || 1297;
      const L_wing = part.L_wing || 1296;
      const cornerR = part.cornerR || 130;
      const shapeObj = createLink120SurfaceShape({
        L,
        L_wing,
        D: depthMm,
        side,
        hasGrommet,
        grommetSide,
        cornerR,
        gap: part.gap || 0,
      });
      const geometry = new ExtrudeGeometry(shapeObj.shape, { depth: h, bevelEnabled: false });
      geometry.scale(0.001, 0.001, 0.001);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new Mesh(geometry, material);
      mesh.position.y = -h / 2000;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);

      // Footprint 2D exacto para el plano CAD y snap (conserva la curva interior y el cajeado de grommet)
      const footprintPts = shapeObj.shape.getPoints(12).map(p => ({ x: p.x * 0.001, z: -p.y * 0.001 }));
      group.userData.footprint2D = createFootprint2D({ points: footprintPts });
    } else if (part.role === 'SURFACE' && part.integracionType && part.integracionType !== 'ninguna') {
      const type = part.integracionType;
      const hole = part.integracionHole || null;
      const applyIntegrationHole = (shape) => {
        if (!hole) return;
        const hw = hole.widthMm / 2000;
        const hd = hole.depthMm / 2000;
        const hx = hole.xMm / 1000;
        const hz = -hole.zMm / 1000;
        const r = Math.max(0, Math.min(hole.cornerRadiusMm ? hole.cornerRadiusMm / 1000 : 0, hw, hd));
        const holePath = new Path();
        if (r > 0) {
          holePath.moveTo(hx - hw + r, hz - hd);
          holePath.lineTo(hx + hw - r, hz - hd);
          holePath.quadraticCurveTo(hx + hw, hz - hd, hx + hw, hz - hd + r);
          holePath.lineTo(hx + hw, hz + hd - r);
          holePath.quadraticCurveTo(hx + hw, hz + hd, hx + hw - r, hz + hd);
          holePath.lineTo(hx - hw + r, hz + hd);
          holePath.quadraticCurveTo(hx - hw, hz + hd, hx - hw, hz + hd - r);
          holePath.lineTo(hx - hw, hz - hd + r);
          holePath.quadraticCurveTo(hx - hw, hz - hd, hx - hw + r, hz - hd);
        } else {
          holePath.moveTo(hx - hw, hz - hd);
          holePath.lineTo(hx - hw, hz + hd);
          holePath.lineTo(hx + hw, hz + hd);
          holePath.lineTo(hx + hw, hz - hd);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      };
      if (type === 'recta' || type === 'individual') {
        const shape = new Shape();
        const hw = w / 2000;
        const hd = d / 2000;
        if (type === 'individual') {
          const cornerR = Math.max(0, Math.min(60 / 1000, hw, hd));
          const isRightPiece = String(part.key || '').includes('right');
          if (isRightPiece) {
            // Inner edge (left) stays straight; outer edge (right) gets rounded corners.
            shape.moveTo(-hw, -hd);
            shape.lineTo(hw - cornerR, -hd);
            shape.quadraticCurveTo(hw, -hd, hw, -hd + cornerR);
            shape.lineTo(hw, hd - cornerR);
            shape.quadraticCurveTo(hw, hd, hw - cornerR, hd);
            shape.lineTo(-hw, hd);
          } else {
            // Inner edge (right) stays straight; outer edge (left) gets rounded corners.
            shape.moveTo(-hw + cornerR, -hd);
            shape.lineTo(hw, -hd);
            shape.lineTo(hw, hd);
            shape.lineTo(-hw + cornerR, hd);
            shape.quadraticCurveTo(-hw, hd, -hw, hd - cornerR);
            shape.lineTo(-hw, -hd + cornerR);
            shape.quadraticCurveTo(-hw, -hd, -hw + cornerR, -hd);
          }
        } else {
          shape.moveTo(-hw, -hd);
          shape.lineTo(hw, -hd);
          shape.lineTo(hw, hd);
          shape.lineTo(-hw, hd);
        }
        shape.closePath();
        applyIntegrationHole(shape);
        const geometry = new ExtrudeGeometry(shape, { depth: h / 1000, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new Mesh(geometry, material);
        mesh.position.y = -h / 2000;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      } else {
        const shape = new Shape();
        const hw = w / 2000, hd = d / 2000;
        if (type === 'redonda') {
          const r = Math.min(hw, hd, 0.15); // 150mm radius for corners
          shape.moveTo(-hw, -hd); // Start at inner-bottom corner
          shape.lineTo(hw - r, -hd);
          shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
          shape.lineTo(hw, hd - r);
          shape.quadraticCurveTo(hw, hd, hw - r, hd);
          shape.lineTo(-hw, hd);
          shape.closePath();
        } else if (type === 'curva') {
          const cx = hw * 0.6; // Extends out mostly straight, leaving a gentle curve
          shape.moveTo(-hw, -hd);
          shape.lineTo(cx, -hd);
          // Peak at X=hw. 0.5*cx + 0.5*ctrl = hw -> ctrl = 1.4*hw
          shape.quadraticCurveTo(hw * 1.4, 0, cx, hd);
          shape.lineTo(-hw, hd);
          shape.closePath();
        }
        applyIntegrationHole(shape);
        const geometry = new ExtrudeGeometry(shape, { depth: h / 1000, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new Mesh(geometry, material);
        mesh.position.y = -h / 2000;
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
      }
    } else if (part.role === 'SUPPORT' && (part.key === 'support-120-center-240' || part.logicalCode === 'ELSO740000')) {
      // Soporte 240° LINK (ELSO740000): estructura de 2 patas tubulares cuadradas con travesaño superior
      const legSection = 50;
      const topBarH = 30;
      const legH = h - topBarH;
      const legDistZ = 130;
      // 2 patas verticales de 50x50 mm
      addBox(group, [legSection, legH, legSection], [0, -topBarH / 2, -legDistZ], material);
      addBox(group, [legSection, legH, legSection], [0, -topBarH / 2, legDistZ], material);
      // Travesaño superior que une y soporta las 2 superficies a 240°
      addBox(group, [legSection, topBarH, legDistZ * 2 + legSection], [0, (h - topBarH) / 2, 0], material);
      // Niveladores / regatones inferiores
      addBox(group, [42, 10, 42], [0, -h / 2 + 5, -legDistZ], material);
      addBox(group, [42, 10, 42], [0, -h / 2 + 5, legDistZ], material);
    } else if (part.role === 'SUPPORT' && (part.key === 'central-support-360' || part.logicalCode === 'LKSO110000' || part.logicalCode === 'ELSO110000')) {
      // Soporte 360° LINK (ELSO110000 / LKSO110000): estructura de 3 patas tubulares a 120° bajo los 3 puestos y grommets
      const legSection = 50;
      const topBarH = 30;
      const legH = h - topBarH;
      const r = 120; // radio de separación desde el centro
      const cos60 = 0.5, sin60 = Math.sqrt(3) / 2;
      // Pata 1: hacia la espina base (-X)
      addBox(group, [legSection, legH, legSection], [-r, -topBarH / 2, 0], material);
      addBox(group, [42, 10, 42], [-r, -h / 2 + 5, 0], material);
      // Pata 2: hacia el brazo derecho (+60°)
      addBox(group, [legSection, legH, legSection], [r * cos60, -topBarH / 2, r * sin60], material);
      addBox(group, [42, 10, 42], [r * cos60, -h / 2 + 5, r * sin60], material);
      // Pata 3: hacia el brazo izquierdo (-60°)
      addBox(group, [legSection, legH, legSection], [r * cos60, -topBarH / 2, -r * sin60], material);
      addBox(group, [42, 10, 42], [r * cos60, -h / 2 + 5, -r * sin60], material);
      // Travesaños superiores de conexión entre el centro y las 3 patas para soportar las superficies y ductos
      addBox(group, [r, topBarH, legSection], [-r / 2, (h - topBarH) / 2, 0], material);
      const beamGeom = new BoxGeometry(r / 1000, topBarH / 1000, legSection / 1000);
      const mesh2 = new Mesh(beamGeom, material);
      mesh2.position.set((r / 2 * cos60) / 1000, ((h - topBarH) / 2) / 1000, (r / 2 * sin60) / 1000);
      mesh2.rotation.y = -Math.PI / 3;
      mesh2.castShadow = true; mesh2.receiveShadow = true;
      group.add(mesh2);
      const mesh3 = new Mesh(beamGeom, material);
      mesh3.position.set((r / 2 * cos60) / 1000, ((h - topBarH) / 2) / 1000, (-r / 2 * sin60) / 1000);
      mesh3.rotation.y = Math.PI / 3;
      mesh3.castShadow = true; mesh3.receiveShadow = true;
      group.add(mesh3);
    } else addBox(group, dimensions, [0, 0, 0], material);
    group.position.set(...position.map(v => v / 1000));
    group.rotation.y = getLinkPartRotationY(part);
    group.userData.parametricTransform = {
      position: group.position.toArray(),
      quaternion: group.quaternion.toArray(),
      scale: group.scale.toArray(),
    };
    applyLinkComponentTransform(group, c.componentTransforms?.[part.key]);
    group.traverse(node => {
      Object.assign(node.userData, group.userData);
      if (node !== group) delete node.userData.isPartRoot;
      if (node.isMesh) node.name = part.description;
    });
    root.add(group);
  }
  // A pedestal material is unused for simple/double workstations.
  if (!product.leader) materials.pedestal.dispose();
  if (c.cableAccess !== 'grommet') materials.grommet.dispose();
  if (!c.hasPantallaFrontal) materials.pantallaFrontal.dispose();
  if (!c.hasPantallaLateral) materials.pantallaLateral.dispose();
  if (!c.hasPantallaFalda) materials.pantallaFalda.dispose();
  return root;
}

export function disposeLinkGeometry(object) {
  const geometries = new Set(), materials = new Set();
  object.traverse(node => {
    node.userData.linkDisposed = true;
    if (node.geometry) geometries.add(node.geometry);
    for (const original of [].concat(node.userData?.__origMaterial || [])) materials.add(original);
    for (const material of [].concat(node.material || [])) materials.add(material);
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
