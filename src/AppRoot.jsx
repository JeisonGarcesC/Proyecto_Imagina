import { useEffect, useState } from 'react';
import App from './App.jsx';
import Login from './components/Login.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import UsersPage from './admin/UsersPage.jsx';
import RolesPage from './admin/RolesPage.jsx';
import DevicesPage from './admin/DevicesPage.jsx';
import AuditPage from './admin/AuditPage.jsx';
import { ADMIN_AUDIT_PATH, ADMIN_DEVICES_PATH, ADMIN_ROLES_PATH, ADMIN_USERS_PATH, navigateInApp } from './admin/adminNavigation.js';

export default function AppRoot() {
  const { user, loading, permissions } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    window.addEventListener('imagina:navigate', updatePath);
    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('imagina:navigate', updatePath);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
        Cargando...
      </div>
    );
  }

  if (!user) return <Login />;
  if (pathname.startsWith('/admin')) {
    if (pathname === ADMIN_USERS_PATH && permissions.includes('admin.users.read')) return <UsersPage />;
    if (pathname === ADMIN_ROLES_PATH && permissions.includes('admin.roles.read')) return <RolesPage />;
    if (pathname === ADMIN_DEVICES_PATH && permissions.includes('admin.devices.read')) return <DevicesPage />;
    if (pathname === ADMIN_AUDIT_PATH && permissions.includes('admin.audit.read')) return <AuditPage />;
    const known = pathname === ADMIN_USERS_PATH || pathname === ADMIN_ROLES_PATH || pathname === ADMIN_DEVICES_PATH || pathname === ADMIN_AUDIT_PATH;
    return <div className="admin-access-denied" role="alert"><div><p>{known ? 'Acceso denegado. No tienes permiso para consultar este módulo.' : 'Página administrativa no encontrada.'}</p><button type="button" onClick={() => navigateInApp('/')}>Volver al configurador</button></div></div>;
  }
  return <App />;
}
