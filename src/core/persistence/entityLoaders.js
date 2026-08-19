const LOADERS = {
  KONCISA_PLUS: (entity, context) => context.createKoncisaPlus(entity),
  SURFACE: (entity, context) => context.createSurface(entity),
  CLAK: (entity, context) => context.addClak(entity.codigoPT, { variant: entity.metadata?.clakVariant }),
  EDUK: (entity, context) => context.addEduk(entity.codigoPT, { variant: entity.metadata?.edukVariant }),
  ARES: (entity, context) => context.addAres(entity.codigoPT),
  MEPAL_SALUD: (entity, context) =>
    context.addMepalSalud(entity.codigoPT, { variant: entity.metadata?.mepalVariant }),
  MEPAL_TEK_SOCIAL: (entity, context) => context.addMepalTekSocial(entity.codigoPT),
  ALMACENAMIENTO: (entity, context) =>
    context.addZen(entity.codigoPT, { variant: entity.metadata?.almacenVariant || 'base' }),
  OFFICE_ACCESSORY: (entity, context) =>
    context.addOfficeAccessory(entity.metadata?.accessoryName || entity.codigoPT),
  PART: (entity, context) => context.addCatalogItem(entity.codigoPT),
  CATALOG_PRODUCT: (entity, context) => context.addCatalogItem(entity.codigoPT),
  TYPOLOGY: (entity, context) => context.addCatalogItem(entity.codigoPT),
};

export function getEntityLoader(kind) {
  return LOADERS[String(kind || '').trim().toUpperCase()] || null;
}

export async function loadPersistedEntity(entity, context) {
  const loader = getEntityLoader(entity?.kind);
  if (!loader) throw new Error(`UNSUPPORTED_KIND:${entity?.kind || 'UNKNOWN'}`);
  if (!entity?.codigoPT && entity?.kind !== 'SURFACE') throw new Error('MISSING_CODIGO_PT');

  const object = await loader(entity, context);
  if (!object) throw new Error('CREATOR_DID_NOT_RETURN_OBJECT');
  return object;
}
