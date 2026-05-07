// src/components/properties/MepalSaludProperties.jsx
import { sectionStyle } from './shared/PropertyStyles';

const MEPAL_SALUD_DEPLOYABLE_CODES = new Set(['22000129632', '22000127958']);

export default function MepalSaludProperties({ part, api, onClose }) {
  if (part?.kind !== 'MEPAL_SALUD') return null;

  const baseCode = String(part?.code || '')
    .trim()
    .replace(/_2$/, '');
  const canUseDesplegado = MEPAL_SALUD_DEPLOYABLE_CODES.has(baseCode);
  if (!canUseDesplegado) return null;

  const current = part?.mepalVariant || 'normal';

  async function handleChange(e) {
    const target = e.target.value;
    if (target === current) return;
    if (target === 'desplegado' && !canUseDesplegado) return;
    if (!api?.swapMepalSaludVariant) return;
    await api.swapMepalSaludVariant(part.instanceId, part.code, target);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Estado del sofá</div>
      <select
        value={current}
        onChange={handleChange}
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
        <option value="normal">Normal</option>
        <option value="desplegado">Desplegado</option>
      </select>
    </div>
  );
}
