import { useMemo, useState } from 'react';
import VetroConfigFields from './VetroConfigFields.jsx';
import { defaultVetroConfig } from '../definitions/vetroUiDefaults.js';
import { resolveVetroProduct } from '../resolvers/vetroProductResolver.js';

export default function VetroPanel({ onCreate, readOnly = false }) {
  const [section, setSection] = useState('PANEL');
  const [config, setConfig] = useState(() => defaultVetroConfig('PANEL'));
  const resolved = useMemo(() => resolveVetroProduct(config), [config]);
  const changeSection = (value) => { setSection(value); setConfig(defaultVetroConfig(value)); };
  const missing = !resolved.codeResolution.supported;
  const heightConflict = resolved.diagnostics.some((item) => item.code === 'VETRO_HEIGHT_280_318_CONFLICT');
  return <div style={{ display: 'grid', gap: 12 }}>
    <h3 style={{ margin: 0 }}>VETRO</h3>
    <VetroConfigFields section={section} config={config} onSectionChange={changeSection} onChange={setConfig} disabled={readOnly} />
    <div style={{ padding: 10, borderRadius: 8, background: missing ? '#fff1f2' : '#f4f7f5', fontSize: 12 }}>
      <div><b>Codigo:</b> {resolved.codeResolution.code || 'No documentado'}</div>
      <div><b>Referencia:</b> {resolved.commercial.reference || 'No documentada'}</div>
      {missing && <div style={{ color: '#b91c1c' }}>VETRO_CODE_NOT_DOCUMENTED</div>}
      {heightConflict && <div style={{ color: '#92400e' }}>VETRO_HEIGHT_280_318_CONFLICT - definicion tecnica pendiente.</div>}
      <div style={{ marginTop: 4, opacity: 0.7 }}>Modelo 3D: asset no disponible.</div>
    </div>
    <button type="button" disabled={readOnly || missing} onClick={() => onCreate?.(config)} style={{ padding: 11, borderRadius: 10, border: '1px solid #d8d8d8', fontWeight: 800, cursor: readOnly || missing ? 'not-allowed' : 'pointer' }}>Agregar producto VETRO</button>
  </div>;
}
