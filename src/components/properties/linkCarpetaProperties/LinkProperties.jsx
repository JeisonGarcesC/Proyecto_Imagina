import { useState } from 'react';
import LinkDuctProperties from './LinkDuctProperties.jsx';
import LinkCostadoProperties from './LinkCostadoProperties.jsx';
import LinkSurfaceProperties from './LinkSurfaceProperties.jsx';
import LinkBajanteDuctProperties from './LinkBajanteDuctProperties.jsx';
import { sectionStyle } from '../shared/PropertyStyles.js';

export default function LinkProperties({ part, api, readOnly = false }) {
  if (part?.kind !== 'LINK_PRODUCT') return null;
  return <LinkComponentProperties key={`${part.instanceId}:${part.componentKey}:${JSON.stringify(part.componentConfig)}`} part={part} api={api} readOnly={readOnly} />;
}

function LinkComponentProperties({ part, api, readOnly }) {
  const [config, setConfig] = useState(part.componentConfig || {});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function update(patch) {
    setBusy(true); setError('');
    try {
      const result = await api?.updateSelectedLinkComponent?.(part.componentKey, patch, part.instanceId);
      if (!result?.success) throw new Error(result?.reason || 'No se pudo actualizar la pieza.');
      setConfig((current) => ({ ...current, ...patch }));
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  const props = { part, config, onChange: update, disabled: readOnly || busy };
  let controls;
  switch (part.componentRole) {
    case 'DUCT': controls = <LinkDuctProperties {...props} />; break;
    case 'SUPPORT': case 'PEDESTAL': controls = <LinkCostadoProperties {...props} />; break;
    case 'SURFACE': case 'GROMMET': controls = <LinkSurfaceProperties {...props} />; break;
    case 'FLOOR_DUCT': case 'CEILING_DUCT': case 'DUCT_COVER': controls = <LinkBajanteDuctProperties {...props} />; break;
    default: controls = <div style={{ fontSize: 12 }}>Selecciona una pieza para ver sus opciones. Los acabados se editan en el panel de propiedades.</div>;
  }
  return <div style={sectionStyle}>{controls}{error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}</div>;
}
