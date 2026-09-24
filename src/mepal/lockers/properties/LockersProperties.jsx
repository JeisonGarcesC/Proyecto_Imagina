import { useMemo, useState } from 'react';
import LockerConfigFields from '../ui/LockerConfigFields.jsx';
import { defaultLockerConfig } from '../definitions/lockerUiDefaults.js';
import { resolveLockerProduct } from '../resolvers/lockersProductResolver.js';

function LockersPropertiesEditor({ part, api, readOnly = false }) {
  const source = part?.config || defaultLockerConfig();
  const [category, setCategory] = useState('BODY');
  const [draft, setDraft] = useState(() => ({ ...source }));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const resolved = useMemo(() => resolveLockerProduct(draft), [draft]);

  const apply = async () => {
    if (!resolved.supported) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api?.updateSelectedLocker?.(draft);
      setMessage(
        result?.success
          ? 'Locker actualizado sobre el objeto seleccionado.'
          : result?.reason || 'No fue posible actualizar el LOCKER.'
      );
    } catch (error) {
      setMessage(error?.message || 'No fue posible actualizar el LOCKER.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-shell">
      <div className="pp-header">
        <p className="pp-title">LOCKERS</p>
      </div>
      <div className="pp-section" style={{ display: 'grid', gap: 12 }}>
        <div>
          <b>Código:</b> {resolved.codeResolution.code || 'No documentado'}
        </div>
        <div>
          <b>Render:</b> {part?.userData?.renderStatus || 'READY'}
        </div>
        <LockerConfigFields
          config={draft}
          category={category}
          onCategoryChange={setCategory}
          onChange={setDraft}
          disabled={readOnly || busy}
        />
        <div
          style={{
            padding: 10,
            background: resolved.supported ? '#f0f6f2' : '#fff1f2',
            fontSize: 12,
            display: 'grid',
            gap: 4,
          }}
        >
          <b>Coraza:</b> {resolved.codeResolution.code || 'Configuración no soportada'}
          {resolved.bom.map((row) => (
            <div key={`${row.role}-${row.code}`}>
              {row.quantity} × {row.code} · {row.role}
            </div>
          ))}
          {resolved.diagnostics.map((item, index) => (
            <div key={`${item.code}-${index}`} role="alert">
              {item.code}: {item.message}
            </div>
          ))}
        </div>
        <button type="button" disabled={readOnly || busy || !resolved.supported} onClick={apply}>
          {busy ? 'Procesando…' : 'Aplicar cambios'}
        </button>
        {message && <div role="status">{message}</div>}
      </div>
    </div>
  );
}

export default function LockersProperties(props) {
  return <LockersPropertiesEditor key={props.part?.instanceId || 'locker'} {...props} />;
}
