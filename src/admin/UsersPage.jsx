import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import UserPermissionsPanel from './UserPermissionsPanel.jsx';
import {
  createAdminUser, getAdminRoles, getAdminUser, getAdminUsers, resetAdminUserPassword,
  updateAdminUser, updateAdminUserRoles, updateAdminUserStatus,
} from './adminApi.js';

const statusLabels = { ACTIVE: 'Activo', DISABLED: 'Desactivado', LOCKED: 'Bloqueado' };
const emptyForm = { displayName: '', username: '', email: '', password: '', roleKey: '' };

function dateText(value) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}

function validateProfile(form, creating) {
  if (!form.displayName.trim()) return 'Ingresa el nombre completo.';
  if (!form.username.trim()) return 'Ingresa el usuario.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Ingresa un correo válido.';
  if (creating && form.password.length < 12) return 'La contraseña inicial debe tener al menos 12 caracteres.';
  if (creating && !form.roleKey) return 'Selecciona un rol.';
  return '';
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`admin-modal${wide ? ' admin-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-modal-header"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, ...props }) {
  return <label className="admin-field"><span>{label}</span><input {...props} /></label>;
}

function UserForm({ user, roles, canWrite, canAssignRoles, busy, onSave, onRoles, onClose, error }) {
  const creating = !user;
  const [form, setForm] = useState(() => creating ? emptyForm : {
    displayName: user.displayName || '', username: user.username || '', email: user.email || '', password: '', roleKey: '',
  });
  const [selectedRoles, setSelectedRoles] = useState(() => user?.roles.map((role) => role.key) || []);
  const [validation, setValidation] = useState('');
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const problem = validateProfile(form, creating);
    setValidation(problem);
    if (problem) return;
    onSave(creating ? {
      displayName: form.displayName.trim(), username: form.username.trim(), email: form.email.trim(),
      password: form.password, roleKey: form.roleKey,
    } : {
      displayName: form.displayName.trim(), username: form.username.trim(), email: form.email.trim(),
    });
  };

  return (
    <Modal title={creating ? 'Nuevo usuario' : 'Editar usuario'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <Field label="Nombre completo" value={form.displayName} onChange={set('displayName')} maxLength={160} required />
        <Field label="Usuario" value={form.username} onChange={set('username')} maxLength={64} required />
        <Field label="Correo" type="email" value={form.email} onChange={set('email')} maxLength={254} required />
        {creating && <Field label="Contraseña inicial" type="password" value={form.password} onChange={set('password')} minLength={12} autoComplete="new-password" required />}
        {creating && <label className="admin-field"><span>Rol</span><select value={form.roleKey} onChange={set('roleKey')} required><option value="">Seleccionar rol</option>{roles.filter((role) => role.enabled).map((role) => <option key={role.id} value={role.key}>{role.name} · {role.key}</option>)}</select></label>}
        {(validation || error) && <p className="admin-error" role="alert">{validation || error}</p>}
        <div className="admin-form-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit" disabled={busy || !canWrite}>{busy ? 'Guardando...' : 'Guardar datos'}</button></div>
      </form>
      {!creating && canAssignRoles && <div className="admin-roles-editor">
        <h3>Roles asignados</h3>
        <div className="admin-role-options">{roles.filter((role) => role.enabled || selectedRoles.includes(role.key)).map((role) => <label key={role.id}><input type="checkbox" checked={selectedRoles.includes(role.key)} onChange={(event) => setSelectedRoles((current) => event.target.checked ? [...current, role.key] : current.filter((key) => key !== role.key))} />{role.name}</label>)}</div>
        <button type="button" disabled={busy || !selectedRoles.length} onClick={() => {
          if (window.confirm('¿Confirmas el cambio de roles de este usuario?')) onRoles(selectedRoles);
        }}>Actualizar roles</button>
      </div>}
    </Modal>
  );
}

function PasswordForm({ user, busy, error, onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validation, setValidation] = useState('');
  return <Modal title={`Cambiar contraseña · ${user.username}`} onClose={onClose}>
    <form className="admin-form" onSubmit={(event) => {
      event.preventDefault();
      const problem = password.length < 12 ? 'La contraseña debe tener al menos 12 caracteres.' : password !== confirm ? 'Las contraseñas no coinciden.' : '';
      setValidation(problem);
      if (!problem && window.confirm(`¿Confirmas el cambio de contraseña de ${user.username}? Se cerrarán sus sesiones activas.`)) onSubmit(password);
    }}>
      <Field label="Nueva contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
      <Field label="Confirmar contraseña" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
      {(validation || error) && <p className="admin-error" role="alert">{validation || error}</p>}
      <div className="admin-form-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Cambiar contraseña'}</button></div>
    </form>
  </Modal>;
}

export default function UsersPage() {
  const { permissions } = useAuth();
  const canWrite = permissions.includes('admin.users.write');
  const canReadRoles = permissions.includes('admin.roles.read');
  const canAssignRoles = permissions.includes('admin.roles.write') && canReadRoles;
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '', status: '', role: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [roles, setRoles] = useState([]);
  const [rolesError, setRolesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canReadRoles) return;
    let active = true;
    getAdminRoles().then((items) => { if (active) setRoles(items); }).catch((cause) => { if (active) setRolesError(cause.message); });
    return () => { active = false; };
  }, [canReadRoles]);

  useEffect(() => {
    let active = true;
    getAdminUsers(filters).then((data) => {
      if (!active) return;
      setResult(data);
      setError('');
    }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);

  const changeFilter = (key, value) => {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };
  const refresh = useCallback(() => { setLoading(true); setRevision((value) => value + 1); }, []);
  const closeDialog = () => { if (!busy) { setDialog(null); setDialogError(''); } };
  const run = async (operation, success, close = true) => {
    setBusy(true);
    setDialogError('');
    try {
      await operation();
      setNotice(success);
      if (close) setDialog(null);
      refresh();
    } catch (cause) {
      setDialogError(cause.message);
    } finally { setBusy(false); }
  };
  const openUser = async (id, type) => {
    setDialogError('');
    try { setDialog({ type, user: await getAdminUser(id) }); }
    catch (cause) { setNotice(''); setError(cause.message); }
  };
  const totalPages = Math.max(1, Math.ceil(result.total / filters.pageSize));

  return <AdminLayout active="users">
      <main className="admin-main">
        <div className="admin-title-row"><div><p className="admin-eyebrow">Administración / Usuarios</p><h1>Usuarios</h1><p>Gestiona el acceso y los roles de las personas que utilizan Imagina.</p></div>{canWrite && <button className="admin-primary" type="button" disabled={!canReadRoles || !roles.length} onClick={() => { setDialogError(''); setDialog({ type: 'create' }); }}>+ Nuevo usuario</button>}</div>
        {rolesError && <p className="admin-error" role="alert">No fue posible cargar los roles: {rolesError}</p>}
        {notice && <div className="admin-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}
        <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); changeFilter('search', searchDraft.trim()); }}>
          <label className="admin-search"><span>Buscar usuarios</span><div><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Nombre, usuario o correo" /><button type="submit">Buscar</button></div></label>
          <label><span>Estado</span><select value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {canReadRoles && <label><span>Rol</span><select value={filters.role} onChange={(event) => changeFilter('role', event.target.value)}><option value="">Todos los roles</option>{roles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}</select></label>}
          <label><span>Por página</span><select value={filters.pageSize} onChange={(event) => changeFilter('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
        </form>
        <section className="admin-table-card" aria-label="Listado de usuarios">
          <div className="admin-table-heading"><strong>{result.total} {result.total === 1 ? 'usuario' : 'usuarios'}</strong><button type="button" onClick={refresh} disabled={loading}>Actualizar</button></div>
          {error ? <div className="admin-table-state admin-error" role="alert">Error al cargar usuarios: {error}<button type="button" onClick={refresh}>Reintentar</button></div> : loading ? <div className="admin-table-state">Cargando usuarios...</div> : !result.items.length ? <div className="admin-table-state">No hay usuarios que coincidan con los filtros.</div> : <div className="admin-table-scroll"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol(es)</th><th>Estado</th><th>Último acceso</th><th>Creación</th><th>Acciones</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong></td><td>{item.username}</td><td>{item.email}</td><td>{item.roles.map((role) => role.name || role.key).join(', ') || '—'}</td><td><span className={`admin-status admin-status-${item.status.toLowerCase()}`}>{statusLabels[item.status] || item.status}</span></td><td>{dateText(item.lastLoginAt)}</td><td>{dateText(item.createdAt)}</td><td><div className="admin-row-actions"><button type="button" onClick={() => openUser(item.id, 'view')}>Ver</button>{canWrite && <><button type="button" onClick={() => openUser(item.id, 'edit')}>Editar</button><button type="button" onClick={() => openUser(item.id, 'password')}>Contraseña</button><button type="button" onClick={() => setDialog({ type: 'status', user: item, status: item.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>{item.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}</button>{item.status !== 'LOCKED' && <button type="button" onClick={() => setDialog({ type: 'status', user: item, status: 'LOCKED' })}>Bloquear</button>}</>}</div></td></tr>)}</tbody></table></div>}
          <div className="admin-pagination"><span>Página {filters.page} de {totalPages}</span><div><button type="button" disabled={filters.page <= 1 || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page - 1 })); }}>Anterior</button><button type="button" disabled={filters.page >= totalPages || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page + 1 })); }}>Siguiente</button></div></div>
        </section>
      </main>
    {(dialog?.type === 'create' || dialog?.type === 'edit') && <UserForm key={dialog.user?.id || 'create'} user={dialog.user} roles={roles} canWrite={canWrite} canAssignRoles={canAssignRoles} busy={busy} error={dialogError} onClose={closeDialog} onSave={(data) => run(() => dialog.type === 'create' ? createAdminUser(data) : updateAdminUser(dialog.user.id, data), dialog.type === 'create' ? 'Usuario creado correctamente.' : 'Usuario actualizado correctamente.')} onRoles={(roleKeys) => run(() => updateAdminUserRoles(dialog.user.id, roleKeys), 'Roles actualizados correctamente.')} />}
    {dialog?.type === 'view' && <Modal title="Detalle del usuario" onClose={closeDialog} wide><dl className="admin-details"><dt>Nombre</dt><dd>{dialog.user.displayName}</dd><dt>Usuario</dt><dd>{dialog.user.username}</dd><dt>Correo</dt><dd>{dialog.user.email}</dd><dt>Estado</dt><dd>{statusLabels[dialog.user.status]}</dd><dt>Roles</dt><dd>{dialog.user.roles.map((role) => role.name || role.key).join(', ') || '—'}</dd><dt>Último acceso</dt><dd>{dateText(dialog.user.lastLoginAt)}</dd><dt>Creación</dt><dd>{dateText(dialog.user.createdAt)}</dd></dl><UserPermissionsPanel userId={dialog.user.id} /></Modal>}
    {dialog?.type === 'password' && <PasswordForm user={dialog.user} busy={busy} error={dialogError} onClose={closeDialog} onSubmit={(password) => run(() => resetAdminUserPassword(dialog.user.id, password), 'La contraseña fue actualizada correctamente.')} />}
    {dialog?.type === 'status' && <Modal title="Confirmar cambio de estado" onClose={closeDialog}><div className="admin-confirm"><p>¿Deseas cambiar el estado de <strong>{dialog.user.displayName}</strong> a <strong>{statusLabels[dialog.status]}</strong>?</p>{dialogError && <p className="admin-error" role="alert">{dialogError}</p>}<div className="admin-form-actions"><button type="button" onClick={closeDialog}>Cancelar</button><button className="admin-primary" type="button" disabled={busy} onClick={() => run(() => updateAdminUserStatus(dialog.user.id, dialog.status), `Estado actualizado a ${statusLabels[dialog.status]}.`)}>{busy ? 'Guardando...' : 'Confirmar'}</button></div></div></Modal>}
  </AdminLayout>;
}
