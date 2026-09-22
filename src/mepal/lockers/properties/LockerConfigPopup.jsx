import { useMemo, useState } from 'react';
import LockerConfigFields from '../ui/LockerConfigFields.jsx';
import { defaultLockerConfig } from '../definitions/lockerUiDefaults.js';
import { resolveLockerProduct } from '../resolvers/lockersProductResolver.js';

// Popup para editar dimensiones/calibre/coraza del LOCKER seleccionado (naves y corazas).
export default function LockerConfigPopup({ open, part, api, readOnly = false, onClose }) {
  const source = part?.config || defaultLockerConfig();
  const [category, setCategory] = useState('BODY');
  const [draft, setDraft] = useState(() => ({ ...source }));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const resolved = useMemo(() => resolveLockerProduct(draft), [draft]);

  if (!open) return null;

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: 380,
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Configuración del LOCKER</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div>
            <b>Código:</b> {resolved.codeResolution.code || 'No documentado'}
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
    </div>
  );
}
