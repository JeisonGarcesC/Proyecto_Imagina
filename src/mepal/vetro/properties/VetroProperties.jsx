import { useMemo, useState } from 'react';
import VetroConfigFields from '../ui/VetroConfigFields.jsx';
import { defaultVetroConfig } from '../definitions/vetroUiDefaults.js';
import { resolveVetroProduct } from '../resolvers/vetroProductResolver.js';

function sectionFrom(config = {}) {
  if (config.productType === 'PROFILE') return config.subcategory === 'VERTICAL' ? 'PROFILE_VERTICAL' : 'PROFILE_HORIZONTAL';
  return config.productType || 'PANEL';
}

function VetroPropertiesEditor({ part, api, readOnly = false }) {
  const source = part?.config || defaultVetroConfig();
  const [section, setSection] = useState(() => sectionFrom(source));
  const [draft, setDraft] = useState(() => ({ ...source }));
  const [message, setMessage] = useState('');
  const resolved = useMemo(() => resolveVetroProduct(draft), [draft]);
  const apply = async () => {
    if (!resolved.codeResolution.supported) return;
    const result = await api?.updateSelectedVetro?.(draft);
    setMessage(result?.success ? 'Producto actualizado.' : result?.reason || 'No fue posible actualizar VETRO.');
  };
  return <div className="pp-shell">
    <div className="pp-header"><p className="pp-title">VETRO</p></div>
    <div className="pp-section" style={{ display: 'grid', gap: 10 }}>
      <div><b>Codigo:</b> {resolved.codeResolution.code || 'No documentado'}</div>
      <div><b>Render:</b> {part?.userData?.renderStatus || 'ASSET_NOT_AVAILABLE'}</div>
      <VetroConfigFields section={section} config={draft} onSectionChange={(value) => { setSection(value); setDraft(defaultVetroConfig(value)); }} onChange={setDraft} disabled={readOnly} />
      {resolved.diagnostics.map((item) => <div key={item.code} style={{ color: item.severity === 'ERROR' ? '#b91c1c' : '#92400e', fontSize: 12 }}>{item.code}</div>)}
      <button type="button" disabled={readOnly || !resolved.codeResolution.supported} onClick={apply}>Aplicar cambios</button>
      {message && <div style={{ fontSize: 12 }}>{message}</div>}
    </div>
  </div>;
}

export default function VetroProperties(props) {
  return <VetroPropertiesEditor key={props.part?.instanceId || 'vetro'} {...props} />;
}
