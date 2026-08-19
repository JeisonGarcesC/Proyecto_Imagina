import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import { LINK_TIPOS } from '../../mepal/link/parts/linkParts';
import { LINK_TUNABLES } from '../../mepal/link/config/linkTunables';

export function isLinkEditablePart(part) {
  return part?.kind === 'LINK';
}

export default function LinkProperties({ part, api, onClose }) {
  if (!isLinkEditablePart(part)) return null;

  const [tipoKey, setTipoKey] = useState(part?.tipoKey || '2_archivos');
  const [entrega, setEntrega] = useState(part?.entrega || 'DER');
  const [ancho, setAncho] = useState(part?.ancho || 120);

  useEffect(() => {
    if (part?.tipoKey) setTipoKey(part.tipoKey);
    if (part?.entrega) setEntrega(part.entrega);
    if (part?.ancho) setAncho(part.ancho);
  }, [part?.instanceId]);

  async function handleTipoKeyChange(val) {
    setTipoKey(val);
    if (!api?.swapLinkVariant) return;
    await api.swapLinkVariant(part.instanceId, { tipoKey: val });
  }

  async function handleEntregaChange(val) {
    setEntrega(val);
    if (!api?.swapLinkVariant) return;
    await api.swapLinkVariant(part.instanceId, { entrega: val });
  }

  async function handleAnchoChange(val) {
    const num = Number(val);
    setAncho(num);
    if (!api?.swapLinkVariant) return;
    await api.swapLinkVariant(part.instanceId, { ancho: num });
  }

  return (
    <div style={sectionStyle}>
      {/* ── Tipo de Credenza ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Tipo de Credenza</div>
        <select
          value={tipoKey}
          onChange={(e) => handleTipoKeyChange(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 8px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {LINK_TIPOS.map((tipo) => (
            <option key={tipo.tipoKey} value={tipo.tipoKey} disabled={!tipo.disponible}>
              {tipo.label} {!tipo.disponible ? '(No disp.)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Entrega ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Entrega</div>
        <select
          value={entrega}
          onChange={(e) => handleEntregaChange(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 8px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="DER">Derecha (DER)</option>
          <option value="IZ">Izquierda (IZ)</option>
        </select>
      </div>

      {/* ── Ancho ── */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Ancho</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {LINK_TUNABLES.ANCHOS.map((a) => {
            const isActive = ancho === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => handleAnchoChange(a)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 6,
                  border: isActive ? '1px solid #2d2d2d' : '1px solid #d1d5db',
                  background: isActive ? '#333' : '#fff',
                  color: isActive ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {a} cm
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
