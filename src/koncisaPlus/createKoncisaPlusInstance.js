import { buildKoncisaPlus } from './KoncisaPlusBuilder';

function defaultNotify(message) {
  globalThis.alert?.(message);
}

function applyTransformOverrides(object, transformOverrides) {
  if (!object || !transformOverrides) return;
  if (Array.isArray(transformOverrides.position)) {
    object.position.fromArray(transformOverrides.position);
  }
  if (Array.isArray(transformOverrides.quaternion)) {
    object.quaternion.fromArray(transformOverrides.quaternion).normalize();
  }
  if (Array.isArray(transformOverrides.scale)) {
    object.scale.fromArray(transformOverrides.scale);
  }
  object.updateMatrixWorld?.(true);
}

export async function createKoncisaPlusInstance({
  api,
  config,
  parts: providedParts,
  groupId: providedGroupId,
  groupName: providedGroupName,
  layoutType: providedLayoutType,
  transformOverrides = null,
  parent = null,
  notify = defaultNotify,
} = {}) {
  if (!api) throw new TypeError('createKoncisaPlusInstance requires the ThreeCanvas API.');
  if (!config || typeof config !== 'object') {
    throw new TypeError('createKoncisaPlusInstance requires a configuration object.');
  }

  const built =
    providedParts && providedGroupId
      ? {
          groupId: providedGroupId,
          groupName: providedGroupName,
          parts: providedParts,
          layoutType: providedLayoutType,
        }
      : buildKoncisaPlus(config);
  const {
    groupId,
    groupName,
    parts = [],
    layoutType = config.layoutType || 'STANDARD',
  } = built || {};

  console.log('Koncisa Plus config:', config);
  console.log('Koncisa Plus result:', built);
  console.log('Koncisa Plus parts:', parts);

  const puestoGroup =
    api.createKoncisaPlusAssemblyGroup?.({
      ...config,
      groupId,
      groupName,
      layoutType,
    }) || null;

  if (!puestoGroup) {
    notify('No se pudo crear el grupo del puesto Koncisa Plus.');
    return null;
  }

  if (parent && puestoGroup.parent !== parent) parent.add?.(puestoGroup);

  for (const surface of parts.filter((part) => part.type === 'superficie')) {
    if (!surface.code) {
      notify(`No tenemos disponible esta superficie: ${surface.logicalCode}`);
      continue;
    }

    const { widthMm, depthMm, thickMm } = surface.dimMm || {};
    console.log('SUPERFICIE A CREAR', {
      subtype: surface.subtype,
      position: surface.position,
      rotation: surface.rotation,
    });

    api.addSurface?.(
      {
        line: surface.line,
        codigoPT: surface.code,
        widthM: Number(widthMm || 0) / 1000,
        depthM: Number(depthMm || 0) / 1000,
        thicknessM: Number(thickMm || 0) / 1000,
        dim: { widthMm, depthMm, thickMm },
        position: {
          x: Number(surface.position?.x || 0) / 1000,
          y: Number(surface.position?.y || 0) / 1000,
          z: Number(surface.position?.z || 0) / 1000,
        },
        rotation: {
          x: Number(surface.rotation?.x || 0),
          y: Number(surface.rotation?.y || 0),
          z: Number(surface.rotation?.z || 0),
        },
        groupId: surface.groupId || groupId,
        groupName: surface.groupName || groupName,
        parentGroup: puestoGroup,
        logicalCode: surface.logicalCode,
        edgeFinish: surface.meta?.canto || surface.canto || 'PVC-2MM',
      },
      surface
    );
  }

  for (const grommet of parts.filter((part) => part.type === 'grommet')) {
    if (!grommet.code) {
      notify(`No tenemos disponible este grommet: ${grommet.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.({
      ...grommet,
      groupId: grommet.groupId || groupId,
      groupName: grommet.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const pasacable of parts.filter((part) => part.type === 'pasacable')) {
    if (!pasacable.code) {
      notify(`No tenemos disponible este pasacable: ${pasacable.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.({
      ...pasacable,
      groupId: pasacable.groupId || groupId,
      groupName: pasacable.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const costado of parts.filter((part) => part.type === 'costado')) {
    if (!costado?.code) {
      notify(`No tenemos disponible este costado: ${costado?.logicalCode || 'sin código lógico'}`);
      continue;
    }

    const modelKind = String(costado?.model?.kind || 'glb').trim().toLowerCase();
    if (modelKind === 'koncisa-costado-assembly') {
      const assembly = costado?.meta?.costadoAssembly || null;
      if (!assembly?.leftLegSrc || !assembly?.rightLegSrc || !assembly?.centerBracketSrc) {
        notify(`El costado ${costado.logicalCode} no tiene completo su ensamble 3D.`);
        continue;
      }
      await api.addKoncisaCostadoAssemblyPart?.({
        ...costado,
        groupId: costado.groupId || groupId,
        groupName: costado.groupName || groupName,
        parentGroup: puestoGroup,
      });
      continue;
    }

    if (!costado?.model?.src) {
      notify(`Este costado no tiene modelo 3D asociado: ${costado.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.({
      ...costado,
      groupId: costado.groupId || groupId,
      groupName: costado.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const viga of parts.filter((part) => part.type === 'viga')) {
    if (!viga.code) {
      notify(`No tenemos disponible esta viga: ${viga.logicalCode}`);
      continue;
    }
    api.addNativeBlockPart?.({
      ...viga,
      groupId: viga.groupId || groupId,
      groupName: viga.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const ducto of parts.filter((part) => part.type === 'ducto')) {
    if (!ducto.code) {
      notify(`No tenemos disponible este ducto: ${ducto.logicalCode}`);
      continue;
    }
    const payload = {
      ...ducto,
      groupId: ducto.groupId || groupId,
      groupName: ducto.groupName || groupName,
      parentGroup: puestoGroup,
    };
    if (ducto.model?.kind === 'native-koncisa-duct' || ducto.meta?.useNativeModel) {
      const created = api.addNativeKoncisaDuctPart?.(payload);
      if (!created) notify(`No se pudo crear el ducto especial: ${ducto.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.(payload);
  }

  for (const ductoPiso of parts.filter((part) => part.type === 'ductoPiso')) {
    if (!ductoPiso.code) {
      notify(`No tenemos disponible este ducto a piso: ${ductoPiso.logicalCode}`);
      continue;
    }
    if (!ductoPiso?.model?.src) {
      notify(`Este ducto a piso no tiene modelo 3D asociado: ${ductoPiso.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.({
      ...ductoPiso,
      groupId: ductoPiso.groupId || groupId,
      groupName: ductoPiso.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const ductoTecho of parts.filter((part) => part.type === 'ductoTecho')) {
    if (!ductoTecho.code) {
      notify(`No tenemos disponible este ducto a techo: ${ductoTecho.logicalCode}`);
      continue;
    }
    if (!ductoTecho?.model?.src) {
      notify(`Este ducto a techo no tiene modelo 3D asociado: ${ductoTecho.logicalCode}`);
      continue;
    }
    await api.addExternalGlbPart?.({
      ...ductoTecho,
      groupId: ductoTecho.groupId || groupId,
      groupName: ductoTecho.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  for (const support of parts.filter((part) => part.type === 'leaderUnionSupport')) {
    api.addNativeBlockPart?.({
      ...support,
      groupId: support.groupId || groupId,
      groupName: support.groupName || groupName,
      parentGroup: puestoGroup,
    });
  }

  if (config.privacyPanel?.enabled) {
    for (let index = 0; index < config.puestos; index += 1) {
      const offsetXMm = index * config.largoCobroMm;
      await api.addKoncisaPrivacyPanel?.({
        tipo: config.privacyPanel.tipo,
        material: config.privacyPanel.material,
        lengthMm: config.privacyPanel.lengthMm,
        heightMm: config.privacyPanel.heightMm,
        finishCode: config.privacyPanel.finishCode,
        finishLabel: config.privacyPanel.finishLabel,
        privacyPanelFinishId: config.privacyPanel.privacyPanelFinishId,
        x: offsetXMm,
        y: 900,
        z: -config.anchoCobroMm / 2,
        parentGroup: puestoGroup,
      });
    }
  }

  applyTransformOverrides(puestoGroup, transformOverrides);
  api.selectObject?.(puestoGroup);

  return {
    assembly: puestoGroup,
    groupId,
    groupName,
    parts,
    layoutType,
  };
}

