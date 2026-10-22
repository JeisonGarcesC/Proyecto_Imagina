import { useAuth } from '../auth/AuthContext.jsx';
import { ADMIN_AUDIT_PATH, ADMIN_DEVICES_PATH, ADMIN_ROLES_PATH, ADMIN_USERS_PATH, navigateInApp } from './adminNavigation.js';
import './UsersPage.css';

export default function AdminLayout({ active, children }) {
  const { user, permissions, logout } = useAuth();
  const canReadUsers = permissions.includes('admin.users.read');
  const canReadRoles = permissions.includes('admin.roles.read');
  const canReadDevices = permissions.includes('admin.devices.read');
  const canReadAudit = permissions.includes('admin.audit.read');

  return <div className="admin-page">
    <header className="admin-header">
      <div className="admin-brand"><span className="admin-brand-mark">I</span><div><strong>PROYECTO IMAGINA</strong><small>Administración</small></div></div>
      <div className="admin-header-actions"><span>{user.displayName || user.username}</span><button type="button" onClick={() => navigateInApp('/')}>Volver al configurador</button><button type="button" onClick={logout}>Salir</button></div>
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p>ADMINISTRACIÓN</p>
        {canReadUsers && <button type="button" className={active === 'users' ? 'admin-sidebar-active' : ''} onClick={() => navigateInApp(ADMIN_USERS_PATH)}>Usuarios</button>}
        {canReadRoles && <button type="button" className={active === 'roles' ? 'admin-sidebar-active' : ''} onClick={() => navigateInApp(ADMIN_ROLES_PATH)}>Roles y permisos</button>}
        {canReadDevices && <button type="button" className={active === 'devices' ? 'admin-sidebar-active' : ''} onClick={() => navigateInApp(ADMIN_DEVICES_PATH)}>Dispositivos y sesiones</button>}
        {canReadAudit && <button type="button" className={active === 'audit' ? 'admin-sidebar-active' : ''} onClick={() => navigateInApp(ADMIN_AUDIT_PATH)}>Auditoría</button>}
      </aside>
      {children}
    </div>
  </div>;
}
