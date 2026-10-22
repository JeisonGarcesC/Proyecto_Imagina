import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import { getAdminDevices, getAdminSessions, revokeAdminDevice, revokeAdminSession } from './adminApi.js';
import './DevicesPage.css';

const deviceStatus = { ACTIVE: 'Activo', REVOKED: 'Revocado', LOST: 'Perdido' };
const sessionStatus = { ACTIVE: 'Activa', EXPIRED: 'Expirada', REVOKED: 'Revocada' };
const empty = { items: [], page: 1, pageSize: 20, total: 0 };
const dateText = (value) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function DevicesPage() {
  const { permissions } = useAuth();
  const canRevoke = permissions.includes('admin.devices.revoke');
  const [mode, setMode] = useState('devices');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filters, setFilters] = useState({ devices: { page: 1, pageSize: 20, search: '', status: '', platform: '' }, sessions: { page: 1, pageSize: 20, search: '', status: '', deviceId: '' } });
  const [searchDraft, setSearchDraft] = useState('');
  const [result, setResult] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const current = filters[mode];

  useEffect(() => {
    let active = true;
    const request = mode === 'devices' ? getAdminDevices : getAdminSessions;
    request(current).then((data) => {
      if (!active) return;
      setResult(data);
      setError('');
    }).catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, current, revision]);

  function changeFilter(key, value) {
    setLoading(true);
    setFilters((all) => ({ ...all, [mode]: { ...all[mode], [key]: value, page: 1 } }));
  }

  function switchMode(next) {
    if (next === mode && !selectedDevice) return;
    setSelectedDevice(null);
    setSearchDraft(filters[next].search);
    setLoading(true);
    setMode(next);
    if (next === 'sessions') setFilters((all) => ({ ...all, sessions: { ...all.sessions, deviceId: '', page: 1 } }));
  }

  function openDevice(device) {
    setSelectedDevice(device);
    setSearchDraft('');
    setLoading(true);
    setMode('sessions');
    setFilters((all) => ({ ...all, sessions: { ...all.sessions, deviceId: device.id, search: '', page: 1 } }));
  }

  async function revoke(session) {
    if (!canRevoke || session.status !== 'ACTIVE' || !window.confirm('Esta sesión perderá la posibilidad de renovar su acceso. El access token actual seguirá válido hasta que expire. ¿Deseas revocarla?')) return;
    setBusyId(session.id);
    setError('');
    setNotice('');
    try {
      await revokeAdminSession(session.id);
      setNotice('Sesión revocada correctamente.');
      setLoading(true);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause.status === 403 ? 'No tienes autorización para revocar este dispositivo/sesión.' : cause.message);
    } finally {
      setBusyId(null);
    }
  }

  async function revokeDevice(device) {
    if (!canRevoke || device.status === 'REVOKED' || !window.confirm('El dispositivo quedará marcado como revocado. Las sesiones existentes y los accesos sin conexión no se invalidarán mediante esta operación. ¿Deseas continuar?')) return;
    setBusyId(device.id);
    setError('');
    setNotice('');
    try {
      const updated = await revokeAdminDevice(device.id);
      setSelectedDevice((current) => current?.id === device.id ? updated : current);
      setNotice('Dispositivo marcado como revocado.');
      setLoading(true);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause.status === 403 ? 'No tienes autorización para revocar este dispositivo/sesión.' : cause.message);
    } finally {
      setBusyId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(result.total / current.pageSize));
  return <AdminLayout active="devices"><main className="admin-main">
    <div className="admin-title-row"><div><p className="admin-eyebrow">Administración / Dispositivos y sesiones</p><h1>Dispositivos y sesiones</h1><p>Consulta la actividad y revoca sesiones activas.</p></div></div>
    <div className="admin-device-tabs"><button type="button" className={mode === 'devices' ? 'active' : ''} onClick={() => switchMode('devices')}>Dispositivos</button><button type="button" className={mode === 'sessions' ? 'active' : ''} onClick={() => switchMode('sessions')}>Sesiones</button></div>
    {selectedDevice && mode === 'sessions' && <section className="admin-device-detail"><div><h2>{selectedDevice.name}</h2><p>{selectedDevice.user.displayName} · {selectedDevice.user.username}</p></div><dl><dt>Plataforma</dt><dd>{selectedDevice.platform}</dd><dt>Estado</dt><dd><span className={`admin-device-status status-${selectedDevice.status}`}>{deviceStatus[selectedDevice.status]}</span></dd><dt>Enrolado</dt><dd>{dateText(selectedDevice.enrolledAt)}</dd><dt>Última actividad</dt><dd>{dateText(selectedDevice.lastSeenAt)}</dd><dt>Revocado</dt><dd>{dateText(selectedDevice.revokedAt)}</dd></dl><div className="admin-device-detail-actions"><button type="button" onClick={() => switchMode('sessions')}>Ver todas las sesiones</button>{canRevoke && selectedDevice.status !== 'REVOKED' && <button type="button" disabled={Boolean(busyId)} onClick={() => revokeDevice(selectedDevice)}>{busyId === selectedDevice.id ? 'Revocando...' : 'Revocar dispositivo'}</button>}</div></section>}
    {notice && <div className="admin-notice" role="status">{notice}</div>}
    <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); changeFilter('search', searchDraft.trim()); }}>
      <label className="admin-search"><span>Buscar usuario o {mode === 'devices' ? 'dispositivo' : 'sesión'}</span><div><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /><button type="submit">Buscar</button></div></label>
      <label><span>Estado</span><select value={current.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">Todos</option>{Object.entries(mode === 'devices' ? deviceStatus : sessionStatus).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {mode === 'devices' && <label><span>Plataforma</span><input value={current.platform} onChange={(event) => changeFilter('platform', event.target.value)} placeholder="Windows, macOS..." /></label>}
      <label><span>Por página</span><select value={current.pageSize} onChange={(event) => changeFilter('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
    </form>
    <section className="admin-table-card" aria-label={mode === 'devices' ? 'Listado de dispositivos' : 'Listado de sesiones'}>
      <div className="admin-table-heading"><strong>{result.total} {mode === 'devices' ? 'dispositivos' : 'sesiones'}</strong><button type="button" disabled={loading} onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>Actualizar</button></div>
      {error ? <div className="admin-table-state admin-error" role="alert">{error}</div> : loading ? <div className="admin-table-state">Cargando {mode === 'devices' ? 'dispositivos' : 'sesiones'}...</div> : !result.items.length ? <div className="admin-table-state">No hay {mode === 'devices' ? 'dispositivos' : 'sesiones'} que coincidan con los filtros.</div> : <div className="admin-table-scroll"><table className="admin-device-table"><thead><tr>{mode === 'devices' ? <><th>Usuario</th><th>Dispositivo</th><th>Plataforma</th><th>Estado</th><th>Enrolado</th><th>Última actividad</th><th>Acción</th></> : <><th>Usuario</th><th>Dispositivo</th><th>Creada</th><th>Último uso</th><th>Expira</th><th>Estado</th><th>Acción</th></>}</tr></thead><tbody>{result.items.map((item) => mode === 'devices' ? <tr key={item.id}><td>{item.user.displayName}<small>{item.user.username}</small></td><td>{item.name}</td><td>{item.platform}</td><td><span className={`admin-device-status status-${item.status}`}>{deviceStatus[item.status]}</span></td><td>{dateText(item.enrolledAt)}</td><td>{dateText(item.lastSeenAt)}</td><td><div className="admin-device-row-actions"><button type="button" onClick={() => openDevice(item)}>Ver sesiones</button>{canRevoke && item.status !== 'REVOKED' && <button type="button" disabled={Boolean(busyId)} onClick={() => revokeDevice(item)}>{busyId === item.id ? 'Revocando...' : 'Revocar dispositivo'}</button>}</div></td></tr> : <tr key={item.id}><td>{item.user.displayName}<small>{item.user.username}</small></td><td>{item.device ? <>{item.device.name}<small>{item.device.platform}</small></> : 'Sin dispositivo asociado'}</td><td>{dateText(item.createdAt)}</td><td>{dateText(item.lastUsedAt)}</td><td>{dateText(item.expiresAt)}</td><td>{sessionStatus[item.status]}</td><td>{canRevoke && item.status === 'ACTIVE' && <button type="button" disabled={Boolean(busyId)} onClick={() => revoke(item)}>{busyId === item.id ? 'Revocando...' : 'Revocar sesión'}</button>}</td></tr>)}</tbody></table></div>}
      <div className="admin-pagination"><span>Página {current.page} de {pages}</span><div><button type="button" disabled={current.page <= 1 || loading} onClick={() => { setLoading(true); setFilters((all) => ({ ...all, [mode]: { ...all[mode], page: current.page - 1 } })); }}>Anterior</button><button type="button" disabled={current.page >= pages || loading} onClick={() => { setLoading(true); setFilters((all) => ({ ...all, [mode]: { ...all[mode], page: current.page + 1 } })); }}>Siguiente</button></div></div>
    </section>
  </main></AdminLayout>;
}
