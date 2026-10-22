import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { getAdminAudit, getAdminAuditEvent } from './adminApi.js';
import './DevicesPage.css';

const empty = { items: [], page: 1, pageSize: 20, total: 0 };
const dateText = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const labels = {
  ADMIN_USER_CREATED: 'Usuario creado', ADMIN_USER_UPDATED: 'Usuario editado',
  ADMIN_USER_STATUS_CHANGED: 'Estado de usuario cambiado', ADMIN_USER_PASSWORD_RESET: 'Contraseña restablecida',
  ADMIN_USER_ROLES_CHANGED: 'Roles de usuario cambiados', ADMIN_ROLE_PERMISSIONS_UPDATED: 'Permisos de rol cambiados',
  ADMIN_USER_PERMISSIONS_UPDATED: 'Permisos individuales cambiados', ADMIN_SESSION_REVOKED: 'Sesión revocada',
  ADMIN_DEVICE_REVOKED: 'Dispositivo revocado',
};

function snapshot(value) {
  return value ? <pre>{JSON.stringify(value, null, 2)}</pre> : <span>Sin datos registrados</span>;
}

export default function AuditPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '', action: '', user: '', from: '', until: '' });
  const [draft, setDraft] = useState({ search: '', user: '' });
  const [result, setResult] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    getAdminAudit(filters).then((data) => { if (active) { setResult(data); setError(''); } })
      .catch((cause) => { if (active) setError(cause.status === 403 ? 'No tienes autorización para consultar la auditoría.' : cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);

  function change(key, value) {
    setLoading(true);
    setSelected(null);
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  async function open(id) {
    setDetailLoading(true);
    setDetailError('');
    setSelected(null);
    try {
      setSelected(await getAdminAuditEvent(id));
    } catch (cause) {
      setDetailError(cause.status === 403 ? 'No tienes autorización para consultar la auditoría.' : cause.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const pages = Math.max(1, Math.ceil(result.total / filters.pageSize));
  return <AdminLayout active="audit"><main className="admin-main">
    <div className="admin-title-row"><div><p className="admin-eyebrow">Administración / Auditoría</p><h1>Auditoría</h1><p>Consulta los eventos registrados y sus cambios históricos.</p></div></div>
    <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setLoading(true); setSelected(null); setFilters((current) => ({ ...current, ...draft, search: draft.search.trim(), user: draft.user.trim(), page: 1 })); }}>
      <label className="admin-search"><span>Buscar acción, recurso o actor</span><div><input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} /><button type="submit">Buscar</button></div></label>
      <label><span>Acción</span><select value={filters.action} onChange={(event) => change('action', event.target.value)}><option value="">Todas</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label><span>Usuario o actor</span><input value={draft.user} onChange={(event) => setDraft((current) => ({ ...current, user: event.target.value }))} placeholder="Nombre, correo o ID" /></label>
      <label><span>Desde (UTC)</span><input type="date" value={filters.from} onChange={(event) => change('from', event.target.value)} /></label>
      <label><span>Hasta (UTC)</span><input type="date" value={filters.until} onChange={(event) => change('until', event.target.value)} /></label>
      <label><span>Por página</span><select value={filters.pageSize} onChange={(event) => change('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
    </form>
    <section className="admin-table-card" aria-label="Eventos de auditoría">
      <div className="admin-table-heading"><strong>{result.total} eventos</strong><button type="button" disabled={loading} onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>Actualizar</button></div>
      {error ? <div className="admin-table-state admin-error" role="alert">{error}</div> : loading ? <div className="admin-table-state">Cargando eventos...</div> : !result.items.length ? <div className="admin-table-state">No hay eventos que coincidan con los filtros.</div> : <div className="admin-table-scroll"><table className="admin-device-table"><thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Recurso</th><th>Usuario afectado</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{dateText(item.createdAt)}</td><td>{item.actor ? <>{item.actor.displayName}<small>{item.actor.username}</small></> : item.actorUserId || 'No identificado'}</td><td>{labels[item.action] || item.action}</td><td>{item.targetType}<small>{item.targetId || '—'}</small></td><td>{item.affectedUserId || '—'}</td><td>Registrado</td><td><button type="button" onClick={() => open(item.id)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
      <div className="admin-pagination"><span>Página {filters.page} de {pages} · {result.total} eventos</span><div><button type="button" disabled={filters.page <= 1 || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page - 1 })); }}>Anterior</button><button type="button" disabled={filters.page >= pages || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page + 1 })); }}>Siguiente</button></div></div>
    </section>
    {detailLoading && <section className="admin-device-detail">Cargando detalle...</section>}
    {detailError && <div className="admin-notice admin-error" role="alert">{detailError}</div>}
    {selected && <section className="admin-device-detail" aria-label="Detalle del evento"><div><h2>{labels[selected.action] || selected.action}</h2><button type="button" onClick={() => setSelected(null)}>Cerrar</button></div><dl><dt>Fecha y hora</dt><dd>{dateText(selected.createdAt)}</dd><dt>Actor</dt><dd>{selected.actor ? `${selected.actor.displayName} (${selected.actor.username})` : selected.actorUserId || 'No identificado'}</dd><dt>Acción</dt><dd>{selected.action}</dd><dt>Recurso</dt><dd>{selected.targetType} · {selected.targetId || '—'}</dd><dt>Usuario afectado</dt><dd>{selected.affectedUserId || '—'}</dd><dt>Dispositivo actor</dt><dd>{selected.actorDevice?.name || selected.actorDeviceId || '—'}</dd><dt>Resultado</dt><dd>Evento registrado; no se almacena resultado independiente</dd><dt>Antes</dt><dd>{snapshot(selected.before)}</dd><dt>Después</dt><dd>{snapshot(selected.after)}</dd></dl></section>}
  </main></AdminLayout>;
}
