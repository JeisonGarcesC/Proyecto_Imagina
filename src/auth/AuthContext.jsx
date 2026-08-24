import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  loginSession,
  logoutSession,
  refreshSession,
  subscribeToSessionInvalidation,
} from './authApi.js';
import { shouldRestoreApiSession } from './authRuntime.js';

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
  const [authMode, setAuthMode] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setAuthMode(null);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSessionInvalidation(() => {
      if (active) clearSession();
    });

    if (!shouldRestoreApiSession(import.meta.env)) {
      setLoading(false);
      return () => {
        active = false;
        unsubscribe();
      };
    }

    refreshSession()
      .then((payload) => {
        if (!active) return;
        const session = sessionState(payload);
        setUser(session.user);
        setRoles(session.roles);
        setPermissions(session.permissions);
        setAuthMode('api');
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
      setAuthMode('api');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || 'No fue posible iniciar sesión.' };
    }
  }, []);

  const devLogin = useCallback(async (username) => {
    if (!import.meta.env.DEV) {
      return { ok: false, error: 'El acceso de desarrollo no está disponible.' };
    }

    const { createDevSession } = await import('./devAuth.js');
    const payload = createDevSession(username);
    if (!payload) return { ok: false, error: 'Usuario de desarrollo no válido.' };

    const session = sessionState(payload);
    setUser(session.user);
    setRoles(session.roles);
    setPermissions(session.permissions);
    setAuthMode('dev');
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    if (authMode === 'dev') return;
    try {
      await logoutSession();
    } catch {
      // La sesión local se limpia incluso si el servidor no está disponible.
    }
  }, [authMode, clearSession]);

  const value = useMemo(
    () => ({
      user,
      roles,
      permissions,
      loading,
      isAuthenticated: Boolean(user),
      login,
      devLogin,
      logout,
    }),
    [user, roles, permissions, loading, login, devLogin, logout]
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
