import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Shape, Path, ExtrudeGeometry } from 'three';
import { getLinkPartDimensions, getLinkPartPosition, getLinkPartRotationY } from '../parts/linkParts.js';
import { applyLinkComponentTransform } from '../integration/linkComponentIdentity.js';

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
  };
  for (const part of product.parts) {
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
      leaderRole: part.leaderRole || null, meta: part.meta || null };
    const [w, h, d] = dimensions, material = materials[part.materialRole];
    if (part.model?.kind === 'glb' && part.model?.src) {
      // Igual que Koncisa Plus: la pieza física procede directamente del GLB.
      // El grupo conserva selección y metadatos mientras termina la carga asíncrona.
    } else if (part.role === 'PEDESTAL') {
      const panel = 18;
      for (const sign of [-1, 1]) addBox(group, [panel, h, d], [sign * (w - panel) / 2, 0, 0], material);
      for (const sign of [-1, 1]) addBox(group, [w - panel * 2, panel, d], [0, sign * (h - panel) / 2, 0], material);
      addBox(group, [w - panel * 2, h - panel * 2, panel], [0, 0, -(d - panel) / 2], material);
      for (let i = 0; i < 3; i++) addBox(group, [w - 4, (h - 12) / 3, panel], [0, h / 2 - (i + 0.5) * h / 3, (d - panel) / 2], material);
    } else if (part.role === 'SURFACE' && part.grommetHole) {
      const shape=new Shape();
      shape.moveTo(-w/2000,-d/2000);shape.lineTo(w/2000,-d/2000);shape.lineTo(w/2000,d/2000);shape.lineTo(-w/2000,d/2000);shape.closePath();
      const hole=new Path(),hw=part.grommetHole.widthMm/2000,hd=part.grommetHole.depthMm/2000;
      const hx=part.grommetHole.xMm/1000,hz=-part.grommetHole.zMm/1000;
      hole.moveTo(hx-hw,hz-hd);hole.lineTo(hx-hw,hz+hd);hole.lineTo(hx+hw,hz+hd);hole.lineTo(hx+hw,hz-hd);hole.closePath();shape.holes.push(hole);
      const geometry=new ExtrudeGeometry(shape,{depth:h/1000,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
      const mesh=new Mesh(geometry,material);mesh.position.y=-h/2000;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
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
