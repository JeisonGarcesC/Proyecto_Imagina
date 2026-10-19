import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import { getAdminPermissions, getAdminRole, getAdminRoles, updateAdminRolePermissions } from './adminApi.js';
import './RolesPage.css';

export default function RolesPage() {
  const { roles: ownRoles, permissions: ownPermissions } = useAuth();
  const canManage = ownRoles.some((item) => (typeof item === 'string' ? item : item.key) === 'SUPERADMIN')
    && ownPermissions.includes('admin.roles.write');
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [draftKeys, setDraftKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getAdminRoles(), getAdminPermissions()]).then(([items, available]) => {
      if (!active) return;
      setRoles(items);
      setCatalog(available);
      setSelectedId(items[0]?.id || null);
      setError('');
    }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getAdminRole(selectedId).then((details) => {
      if (!active) return;
      setRole(details);
      setDraftKeys(details.permissionKeys);
      setRoleError('');
      setMessage('');
    }).catch((cause) => { if (active) setRoleError(cause.message); }).finally(() => { if (active) setRoleLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const groups = useMemo(() => Object.groupBy
    ? Object.groupBy(catalog, (item) => item.module)
    : catalog.reduce((result, item) => ({ ...result, [item.module]: [...(result[item.module] || []), item] }), {}), [catalog]);
  const selected = new Set(draftKeys);
  const canEdit = canManage && role?.key !== 'SUPERADMIN';
  const dirty = role && (draftKeys.length !== role.permissionKeys.length
    || draftKeys.some((key) => !role.permissionKeys.includes(key)));

  async function saveChanges() {
    if (!canEdit || !dirty || saving || !window.confirm(`Vas a modificar los permisos del rol ${role.key}. ¿Deseas continuar?`)) return;
    setSaving(true);
    setRoleError('');
    setMessage('');
    try {
      const permissionIds = catalog.filter(({ key }) => selected.has(key)).map(({ id }) => id);
      const updated = await updateAdminRolePermissions(role.id, permissionIds);
      setRole(updated);
      setDraftKeys(updated.permissionKeys);
      setMessage('Los permisos del rol se guardaron correctamente.');
    } catch (cause) {
      setRoleError(cause.status === 403
        ? 'No tienes autorización para modificar los permisos de este rol.' : cause.message);
    } finally {
      setSaving(false);
    }
  }

  return <AdminLayout active="roles">
    <main className="admin-main">
      <div className="admin-title-row"><div><p className="admin-eyebrow">Administración / Roles y permisos</p><h1>Roles y permisos</h1><p>Consulta los permisos asignados a cada rol del sistema.</p></div></div>
      {error ? <div className="admin-error" role="alert">Error al cargar roles y permisos: {error}</div>
        : loading ? <div className="admin-table-state">Cargando roles y permisos...</div>
          : !roles.length ? <div className="admin-table-state">No hay roles disponibles.</div>
            : <div className="admin-roles-layout">
              <aside className="admin-roles-list" aria-label="Roles"><div className="admin-roles-list-title">Roles <span>{roles.length}</span></div>{roles.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-selected' : ''} onClick={() => { if (item.id === selectedId || saving) return; setRoleLoading(true); setRoleError(''); setMessage(''); setSelectedId(item.id); }}><strong>{item.name}</strong><small>{item.key}</small></button>)}</aside>
              <section className="admin-role-panel" aria-label="Permisos del rol">
                {roleError && (!role || role.id !== selectedId) ? <p className="admin-error" role="alert">{roleError}</p>
                  : roleLoading || !role || role.id !== selectedId ? <div className="admin-table-state">Cargando rol...</div> : <>
                  <div className="admin-role-summary"><div><p className="admin-eyebrow">ROL</p><h2>{role.name}</h2><p>{role.description || 'Sin descripción.'}</p></div><div className="admin-role-badges"><span>{role.key}</span><span>{role.enabled ? 'Habilitado' : 'Deshabilitado'}</span>{role.system && <span>Del sistema</span>}</div></div>
                  <div className="admin-role-count"><strong>{draftKeys.length}</strong> permisos asignados <span>·</span> {catalog.length} disponibles</div>
                  {role.key === 'SUPERADMIN' && <p className="admin-role-help">Los permisos del rol SUPERADMIN son inmutables y no pueden modificarse desde este panel.</p>}
                  {!canManage && role.key !== 'SUPERADMIN' && <p className="admin-role-help">Tienes acceso de lectura. Solo un SUPERADMIN con admin.roles.write puede modificar permisos.</p>}
                  {roleError && <p className="admin-error" role="alert">{roleError}</p>}
                  {message && <p className="admin-role-success" role="status">{message}</p>}
                  <div className="admin-permission-groups">{Object.entries(groups).map(([module, items]) => <fieldset key={module}><legend>{module}</legend>{items.map((permission) => <label key={permission.key}><input type="checkbox" checked={selected.has(permission.key)} disabled={!canEdit || saving} onChange={(event) => setDraftKeys((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} /><span><strong>{permission.key}</strong><small>{permission.description}</small></span></label>)}</fieldset>)}</div>
                  {canEdit && <div className="admin-role-actions"><button type="button" disabled={!dirty || saving} onClick={saveChanges}>{saving ? 'Guardando...' : 'Guardar cambios'}</button><button type="button" disabled={!dirty || saving} onClick={() => { setDraftKeys(role.permissionKeys); setRoleError(''); setMessage(''); }}>Cancelar</button></div>}
                </>}
              </section>
            </div>}
    </main>
  </AdminLayout>;
}
