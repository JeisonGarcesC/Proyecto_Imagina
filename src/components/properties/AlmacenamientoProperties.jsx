import { sectionStyle } from './shared/PropertyStyles';

function normalizeVariantLabel(value) {
  if (!value) return 'base';
  return String(value).replace(/^_+/, '').toLowerCase();
}

export default function AlmacenamientoProperties({ part, api, onClose }) {
  if (part?.kind !== 'ALMACENAMIENTO') return null;

  const variants = Array.isArray(part?.almacenVariants) ? part.almacenVariants : [];
  if (!variants.length) return null;

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

  async function handleChange(e) {
    const target = e.target.value;
    if (!target || target === current) return;
    if (!api?.swapAlmacenamientoVariant) return;
    await api.swapAlmacenamientoVariant(part.instanceId, part.code, target);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Variante</div>
      <select
        value={value}
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
        {normalizedOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'base' ? 'Base' : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
