const entries = {
  project: ['create', 'open', 'save', 'export.svg', 'export.png', 'export.pdf', 'export.dxf', 'export.glb', 'export.ppt'],
  editor: ['view.2d', 'view.3d', 'object.select', 'object.create', 'object.move', 'object.rotate', 'object.delete', 'object.copy', 'object.paste', 'plan.import', 'plan.edit', 'plan.calibrate', 'plan.delete', 'plan.layers.manage', 'dimension.create', 'dimension.update', 'dimension.delete'],
  catalog: ['ares.view', 'eduk.view', 'clak.view', 'salud.view', 'tekSocial.view', 'zen.view', 'koncisaPlus.view', 'prices.view'],
  bom: ['view', 'prices.view', 'export'],
  finishes: ['view', 'apply'],
  admin: ['users.read', 'users.write', 'roles.read', 'roles.write', 'permissions.write', 'devices.read', 'devices.revoke', 'audit.read'],
};

export const PERMISSION_CATALOG = Object.freeze(
  Object.entries(entries).flatMap(([module, suffixes]) =>
    suffixes.map((suffix) => Object.freeze({
      key: `${module}.${suffix}`,
      module,
      description: `${module}: ${suffix}`,
    }))
  )
);

export function assertUniquePermissionKeys(catalog = PERMISSION_CATALOG) {
  const keys = catalog.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) throw new Error('El catálogo contiene permisos duplicados.');
  return true;
}
