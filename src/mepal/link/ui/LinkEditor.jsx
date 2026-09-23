import { normalizeLinkConfig } from '../rules/linkConfigRules.js';
import { btnStyle, sectionStyle } from '../../../components/properties/shared/PropertyStyles.js';
import { useMemo, useState } from 'react';
import { LINK_DEFAULT_CONFIG } from '../definitions/linkDefaults.js';
import { buildLink } from '../builders/LinkBuilder.js';
import LinkConfigFields from './LinkConfigFields.jsx';

export default function LinkEditor({ initialConfig, onApply, editing = false, readOnly = false }) {
  const [config, setConfig] = useState(() => normalizeLinkConfig({ ...LINK_DEFAULT_CONFIG, ...initialConfig }));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => { try { return { product: buildLink(config) }; } catch (error) { return { error: error.message }; } }, [config]);
  async function apply() {
    if (readOnly || busy || preview.error) return;
    setBusy(true); setMessage('');
    try {
      const result = await onApply?.(config);
      setMessage(result?.success ? (editing ? 'Puesto actualizado.' : 'Puesto creado.') : result?.reason || 'No se pudo crear el puesto LINK.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const product = preview.product;
  return <div style={{ display: 'grid', gap: 12 }}>
    <h3 style={{ margin: 0 }}>{editing ? 'Configuración LINK' : 'LINK · puestos de trabajo'}</h3>
    <LinkConfigFields config={config} onChange={setConfig} disabled={readOnly || busy} />
    {config.type === 'doble' && product && <div style={{ padding: 10, background: '#edf3f8', borderRadius: 6, fontSize: 12 }}>
      {product.layout.surfaceDepthMm} + {product.layout.gapMm} + {product.layout.surfaceDepthMm} = {product.layout.totalDepthMm} mm<br />Dos superficies independientes.
    </div>}
    {product?.leader && <div role="note" style={{ background: '#fff2d5', padding: 10, borderRadius: 6, fontSize: 12 }}>
      Puesto líder construido con un módulo independiente. Cada superficie, costado y accesorio se edita al seleccionarlo.
      
    </div>}
    <div style={{ fontSize: 12, color: '#666' }}>Selecciona una pieza en el puesto para aplicar sus acabados desde Propiedades.</div>
    {product && <div style={sectionStyle}>
      <div style={{fontSize:12}}>Puestos: {product.config.puestos} · Superficies: {product.parts.filter(p=>p.role==='SURFACE').length}</div>
      <div style={{fontSize:12}}>Medida por módulo: {product.config.widthMm} × {product.layout.totalDepthMm} mm</div>
      {product.config.modoEspecial && <div style={{fontSize:11}}>Código nominal de superficie: {product.codes.billingWidthMm} × {product.codes.billingDepthMm} mm. Se fabrica a la medida real indicada.</div>}
    </div>}
    {preview.error && <div role="alert">{preview.error}</div>}
    <button type="button" disabled={readOnly || busy || !!preview.error} onClick={apply} style={btnStyle}>
      {busy ? 'Aplicando…' : editing ? 'Aplicar cambios' : 'Crear puesto LINK'}
    </button>
    {message && <div role="status" style={{ fontSize: 12 }}>{message}</div>}
  </div>;
}
