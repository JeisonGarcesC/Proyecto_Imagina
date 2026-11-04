import { useEffect, useState } from 'react';
import { btnStyle, sectionStyle } from '../../../../components/properties/shared/PropertyStyles.js';
import { DANCER_DEFAULT_CONFIG, formatDancerLength, normalizeDancerConfig } from '../dancerCatalog.js';
import { resolveDancerCommercial } from '../dancerCommercial.js';
import DancerConfigFields from './DancerConfigFields.jsx';

export default function DancerEditor({ onApply, country = 'CO', readOnly = false }) {
  const [config, setConfig] = useState(() => normalizeDancerConfig(DANCER_DEFAULT_CONFIG));
  const [commercial, setCommercial] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    resolveDancerCommercial(config, country)
      .then((result) => {
        if (alive) setCommercial(result);
      })
      .catch(() => {
        if (alive) setCommercial(null);
      });
    return () => {
      alive = false;
    };
  }, [config, country]);

  async function apply() {
    if (readOnly || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await onApply?.(config);
      setMessage(
        result?.success ? 'Mesa Dancer creada.' : result?.reason || 'No se pudo crear la mesa Dancer.'
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Mesas Dancer</h3>
      <DancerConfigFields config={config} onChange={setConfig} disabled={readOnly || busy} />
      {commercial && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Plano: {commercial.model.planCode}</div>
          <div style={{ fontSize: 12 }}>{commercial.description}</div>
          {commercial.billingCode && (
            <div style={{ fontSize: 11 }}>Código comercial: {commercial.billingCode}</div>
          )}
          {commercial.isSpecial && (
            <div style={{ fontSize: 11 }}>
              Medida especial: se fabrica a {formatDancerLength(config.lengthCm)} y se factura como{' '}
              {formatDancerLength(commercial.tierLengthCm)}.
            </div>
          )}
          {!commercial.found && (
            <div role="alert" style={{ fontSize: 11 }}>
              No se encontró este plano en la lista de precios.
            </div>
          )}
        </div>
      )}
      <button type="button" disabled={readOnly || busy} onClick={apply} style={btnStyle}>
        {busy ? 'Aplicando…' : 'Crear mesa Dancer'}
      </button>
      {message && (
        <div role="status" style={{ fontSize: 12 }}>
          {message}
        </div>
      )}
    </div>
  );
}
