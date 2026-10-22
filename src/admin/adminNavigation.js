export const ADMIN_USERS_PATH = '/admin/users';
export const ADMIN_ROLES_PATH = '/admin/roles';
export const ADMIN_DEVICES_PATH = '/admin/devices';
export const ADMIN_AUDIT_PATH = '/admin/audit';

export function navigateInApp(path) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('imagina:navigate'));
}
