import { PERMISSION_CATALOG } from '../permissions/permissionCatalog.js';

const allPermissions = PERMISSION_CATALOG.map(({ key }) => key);
const catalogViews = allPermissions.filter((key) => /^catalog\..+\.view$/.test(key));

export const ROLE_CATALOG = Object.freeze([
  { key: 'SUPERADMIN', name: 'Superadministrador', description: 'Acceso total del sistema.', system: true, permissions: allPermissions },
  { key: 'ADMIN', name: 'Administrador', description: 'Administración operativa sin garantía de acceso total.', system: true, permissions: [] },
  { key: 'DESIGNER', name: 'Diseño', description: 'Diseño y edición de proyectos.', system: true, permissions: [] },
  { key: 'COMMERCIAL', name: 'Comercial', description: 'Consulta comercial y precios.', system: true, permissions: [] },
  { key: 'VIEWER', name: 'Visualizador', description: 'Consulta sin mutaciones.', system: true, permissions: ['project.open', 'editor.view.2d', 'editor.view.3d', 'editor.object.select', 'bom.view', ...catalogViews] },
]);
