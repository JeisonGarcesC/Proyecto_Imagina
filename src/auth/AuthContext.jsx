import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  loginSession,
  logoutSession,
  refreshSession,
  subscribeToSessionInvalidation,
} from './authApi.js';

const AuthContext = createContext(null);

function roleKey(role) {
  if (typeof role === 'string') return role;
  return role?.key || role?.name || role?.role || '';
}

function sessionState(payload) {
  const roles = Array.isArray(payload?.roles) ? payload.roles : [];
  const permissions = Array.isArray(payload?.permissions) ? payload.permissions : [];
  const role = roleKey(roles[0]);
  const user = payload?.user
    ? {
        ...payload.user,
        role,
        label: payload.user.displayName || role || payload.user.username,
      }
    : null;
  return { user, roles, permissions };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSessionInvalidation(() => {
      if (active) clearSession();
    });
    refreshSession()
      .then((payload) => {
        if (!active) return;
        const session = sessionState(payload);
        setUser(session.user);
        setRoles(session.roles);
        setPermissions(session.permissions);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearSession]);

  const login = useCallback(async (usernameOrEmail, password) => {
    try {
      const payload = await loginSession(String(usernameOrEmail).trim(), String(password));
      const session = sessionState(payload);
      setUser(session.user);
      setRoles(session.roles);
      setPermissions(session.permissions);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'No fue posible iniciar sesión.' };
    }
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    try {
      await logoutSession();
    } catch {
      // La sesión local se limpia incluso si el servidor no está disponible.
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      roles,
      permissions,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, roles, permissions, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider />');
  return ctx;
}

export function getRolePermissions(role) {
  const r = String(role || '').toLowerCase();
  const isAdmin = ['administrador', 'admin', 'superadmin'].includes(r);
  const isDesign = ['diseno', 'diseño', 'designer'].includes(r);
  const isCommercial = ['comercial', 'commercial'].includes(r);

  return {
    isAdmin,
    isDesign,
    isCommercial,
    canEdit: isAdmin || isDesign,
    canExport: isAdmin || isDesign || isCommercial,
    canLoadSave: isAdmin || isDesign, // comercial solo visualiza por ahora
    canSeePrices: isAdmin || isCommercial, // ejemplo: diseño no necesariamente cotiza
  };
}
