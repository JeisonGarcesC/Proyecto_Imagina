import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAdminUserPermissions, updateAdminUserPermissions } from './adminApi.js';
import './UserPermissionsPanel.css';

function overridesFrom(data) {
  return Object.fromEntries(data.permissions.filter(({ override }) => override)
    .map(({ id, override }) => [id, override]));
}

export default function UserPermissionsPanel({ userId }) {
  const { roles, permissions: ownPermissions } = useAuth();
  const canManage = roles.some((item) => (typeof item === 'string' ? item : item.key) === 'SUPERADMIN')
    && ownPermissions.includes('admin.permissions.write');
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getAdminUserPermissions(userId).then((result) => {
      if (!active) return;
      setData(result);
      setDraft(overridesFrom(result));
      setError('');
    }).catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const groups = useMemo(() => (data?.permissions || []).reduce((result, item) => {
    (result[item.module] ||= []).push(item);
    return result;
  }, {}), [data]);
  const canEdit = canManage && data && !data.user.superadmin;
  const dirty = data?.permissions.some(({ id, override }) => (draft[id] || null) !== override);

  async function save() {
    if (!canEdit || !dirty || saving || !window.confirm(`Vas a modificar los permisos individuales de ${data.user.username}. ¿Deseas continuar?`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const overrides = data.permissions.filter(({ id }) => draft[id])
        .map(({ id }) => ({ permissionId: id, effect: draft[id] }));
      const updated = await updateAdminUserPermissions(userId, overrides);
      setData(updated);
      setDraft(overridesFrom(updated));
      setMessage('Permisos individuales guardados correctamente.');
    } catch (cause) {
      setError(cause.status === 403 ? 'No tienes autorización para modificar permisos individuales.' : cause.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-user-permissions" aria-label="Permisos individuales">
    <h3>Permisos individuales</h3>
    {loading ? <p>Cargando permisos individuales...</p> : !data ? <p className="admin-error" role="alert">{error}</p> : <>
      {data.user.superadmin && <p className="admin-user-permissions-help">Los permisos de SUPERADMIN están protegidos y se muestran en modo lectura.</p>}
      {!canManage && !data.user.superadmin && <p className="admin-user-permissions-help">Solo un SUPERADMIN con admin.permissions.write puede modificar excepciones.</p>}
      <p className="admin-user-permissions-help">El permiso efectivo mostrado corresponde al estado guardado. Se actualizará después de guardar.</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-notice" role="status">{message}</p>}
      {Object.entries(groups).map(([module, items]) => <div className="admin-user-permission-group" key={module}>
        <h4>{module}</h4>
        {items.map((permission) => <div className="admin-user-permission-row" key={permission.id}>
          <div><strong>{permission.key}</strong><small>{permission.description}</small><small>{permission.override === 'ALLOW' ? 'Concedido individualmente' : permission.override === 'DENY' ? 'Denegado individualmente' : permission.roleGranted ? 'Concedido por rol' : 'Sin permiso'}</small></div>
          <span>Rol: <strong>{permission.roleGranted ? 'Sí' : 'No'}</strong></span>
          <label>Excepción<select value={draft[permission.id] || 'NONE'} disabled={!canEdit || saving} onChange={(event) => setDraft((current) => ({ ...current, [permission.id]: event.target.value === 'NONE' ? null : event.target.value }))}><option value="NONE">Sin excepción</option><option value="ALLOW">Permitir</option><option value="DENY">Denegar</option></select></label>
          <span>Efectivo: <strong>{permission.effective ? 'Sí' : 'No'}</strong></span>
        </div>)}
      </div>)}
      {canEdit && <div className="admin-form-actions"><button type="button" disabled={!dirty || saving} onClick={() => { setDraft(overridesFrom(data)); setError(''); setMessage(''); }}>Cancelar</button><button className="admin-primary" type="button" disabled={!dirty || saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>}
    </>}
  </section>;
}
