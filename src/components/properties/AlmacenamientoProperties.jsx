import { sectionStyle } from './shared/PropertyStyles';
import { ZEN_ALMACENAMIENTO_PEDESTALS } from '../../mepal/link/leader/rules/leaderPedestalRules.js';

function normalizeVariantLabel(value) {
  if (!value) return 'base';
  return String(value).replace(/^_+/, '').toLowerCase();
}

export default function AlmacenamientoProperties({ part, api, onClose }) {
  if (part?.kind !== 'ALMACENAMIENTO') return null;

  const currentBaseCode = part?.code || part?.codigoPT || '';
  const isPedestal =
    part?.almacenCategory === 'Pedestal' ||
    ZEN_ALMACENAMIENTO_PEDESTALS.some((p) => p.code === currentBaseCode);

  const variants = Array.isArray(part?.almacenVariants) ? part.almacenVariants : [];

  const normalizedOptions = [];
  const seen = new Set();

  variants.forEach((entry) => {
    const val = normalizeVariantLabel(entry?.variant);
    if (seen.has(val)) return;
    seen.add(val);
    normalizedOptions.push(val);
  });

  if (!normalizedOptions.length) normalizedOptions.push('base');

  const current = normalizeVariantLabel(part?.almacenVariant);
  const value = normalizedOptions.includes(current) ? current : normalizedOptions[0];

  if (!isPedestal && normalizedOptions.length <= 1) return null;

  async function handleModelChange(e) {
    const targetCode = e.target.value;
    if (!targetCode || targetCode === currentBaseCode) return;
    if (!api?.swapAlmacenamientoVariant) return;
    await api.swapAlmacenamientoVariant(part.instanceId, targetCode, current || 'base');
    onClose?.();
  }

  async function handleVariantChange(e) {
    const target = e.target.value;
    if (!target || target === current) return;
    if (!api?.swapAlmacenamientoVariant) return;
    await api.swapAlmacenamientoVariant(part.instanceId, currentBaseCode, target);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      {isPedestal && (
        <div style={{ marginBottom: normalizedOptions.length > 1 ? 12 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
            Modelo de pedestal Zen
          </div>
          <select
            value={currentBaseCode}
            onChange={handleModelChange}
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
            {ZEN_ALMACENAMIENTO_PEDESTALS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {normalizedOptions.length > 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Variante</div>
          <select
            value={value}
            onChange={handleVariantChange}
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
            {normalizedOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'base' ? 'Base' : opt === 'cushion' ? 'Cushion (cojín)' : opt}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
