import { useState } from 'react';
import { defaultLockerConfig } from '../definitions/lockerUiDefaults.js';
import { resolveLockerProduct } from '../resolvers/lockersProductResolver.js';
import LockerConfigFields from './LockerConfigFields.jsx';

export function LockerEditor({ initialConfig, onApply, readOnly, editing = false }) {
  const [config, setConfig] = useState(() => initialConfig || defaultLockerConfig());
  const [category, setCategory] = useState('BODY');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const resolved = resolveLockerProduct(config);
  const apply = async () => {
    setBusy(true); setMessage('');
    try { const result = await onApply?.(config); setMessage(result?.success ? (editing ? 'Locker actualizado.' : 'Locker creado.') : result?.reason || 'No se pudo completar la operación.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <div style={{ display: 'grid', gap: 12 }}>
    <h3 style={{ margin: 0 }}>LOCKERS</h3>
    <LockerConfigFields config={config} onChange={setConfig} category={category} onCategoryChange={setCategory} disabled={readOnly || busy} />
    <div style={{ padding: 10, background: resolved.supported ? '#f0f6f2' : '#fff1f2', fontSize: 12 }}>
      <b>Coraza:</b> {resolved.codeResolution.code || 'Configuración no soportada'}
      {resolved.bom.map(row => <div key={row.role}>{row.quantity} × {row.code} · {row.role}</div>)}
      {resolved.diagnostics.map((d, i) => <div role="alert" key={i}>{d.code}: {d.message}</div>)}
    </div>
    <small>Geometría nativa. Herrajes y holguras simplificados; no usar como plano de fabricación.</small>
    <button type="button" disabled={readOnly || busy || !resolved.supported} onClick={apply}>{busy ? 'Procesando…' : editing ? 'Aplicar cambios' : 'Agregar LOCKER'}</button>
    {message && <div role="status">{message}</div>}
  </div>;
}
export default function LockersPanel({ onCreate, readOnly = false }) { return <LockerEditor onApply={onCreate} readOnly={readOnly} />; }
