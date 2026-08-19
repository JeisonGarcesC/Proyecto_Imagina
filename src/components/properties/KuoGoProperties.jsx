import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import { KUOGO_MODELOS } from '../../mepal/kuoGo/parts/kuoGoParts';
import { KUOGO_TUNABLES } from '../../mepal/kuoGo/config/kuoGoTunables';

export function isKuoGoEditablePart(part) {
  return part?.kind === 'KUOGO';
}

export default function KuoGoProperties({ part, api, onClose }) {
  if (!isKuoGoEditablePart(part)) return null;

  const [espesor, setEspesor] = useState(part?.espesor || 'Espesor Formica 18');
  const [tipoKey, setTipoKey] = useState(part?.tipoKey || 'Kume200000');
  const [especial, setEspecial] = useState(part?.especial || false);

  useEffect(() => {
    if (part?.espesor) setEspesor(part.espesor);
    if (part?.tipoKey) setTipoKey(part.tipoKey);
    if (part?.especial !== undefined) setEspecial(part.especial);
  }, [part?.instanceId]);

  async function handleEspesorChange(nextEspesor) {
    setEspesor(nextEspesor);
    if (!api?.swapKuoGoVariant) return;

    await api.swapKuoGoVariant(part.instanceId, {
      espesor: nextEspesor,
    });
  }

  async function handleTipoKeyChange(nextTipoKey) {
    setTipoKey(nextTipoKey);
    if (!api?.swapKuoGoVariant) return;

    await api.swapKuoGoVariant(part.instanceId, {
      tipoKey: nextTipoKey,
    });
  }

  async function handleEspecialChange(nextEspecial) {
    setEspecial(nextEspecial);
    if (!api?.swapKuoGoVariant) return;

    await api.swapKuoGoVariant(part.instanceId, {
      especial: nextEspecial,
    });
  }

  return (
    <div style={sectionStyle}>
      {/* ── Espesor Superficie ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Espesor Superficie</div>
        <select
          value={espesor}
          onChange={(e) => handleEspesorChange(e.target.value)}
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
          {KUOGO_TUNABLES.ESPESORES.map((esp) => (
            <option key={esp} value={esp}>
              {esp}
            </option>
          ))}
        </select>
      </div>

      {/* ── Modelo (Kume200000) ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Modelo</div>
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
          {KUOGO_MODELOS.map((mod) => (
            <option key={mod.tipoKey} value={mod.tipoKey} disabled={!mod.disponible}>
              {mod.label} {!mod.disponible ? '(No disp.)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Especial / Rematable ── */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={especial}
            onChange={(e) => handleEspecialChange(e.target.checked)}
            style={{ margin: 0, cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 700, fontSize: 12 }}>Especial/Rematable</span>
        </label>
      </div>
    </div>
  );
}
