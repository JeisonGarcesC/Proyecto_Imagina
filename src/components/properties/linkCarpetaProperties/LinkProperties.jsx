import { useState } from 'react';
import LinkDuctProperties from './LinkDuctProperties.jsx';
import LinkCostadoProperties from './LinkCostadoProperties.jsx';
import LinkSurfaceProperties from './LinkSurfaceProperties.jsx';
import LinkBajanteDuctProperties from './LinkBajanteDuctProperties.jsx';
import LinkPantallaProperties from './LinkPantallaProperties.jsx';
import LinkCredenzaProperties from './LinkCredenzaProperties.jsx';
import LinkDimensionsProperties from './LinkDimensionsProperties.jsx';
import { sectionStyle } from '../shared/PropertyStyles.js';

const isLinkWorkstation = (part) => ['sencillo', 'doble'].includes(part?.config?.type);

export default function LinkProperties({ part, api, readOnly = false }) {
  if (part?.kind !== 'LINK_PRODUCT') return null;
  const credenzaKey = part.config?.type === 'credenza' ? `:${part.config.credenzaModel}:${part.config.side}:${part.config.credenzaLengthMm}` : '';
  const dimensionsKey = isLinkWorkstation(part) ? `:${part.config.modoEspecial}:${part.config.widthMm}:${part.config.depthMm}` : '';
  return <LinkComponentProperties key={`${part.instanceId}:${part.componentKey}:${JSON.stringify(part.componentConfig)}${credenzaKey}${dimensionsKey}`} part={part} api={api} readOnly={readOnly} />;
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
      return true;
    } catch (cause) { setError(cause.message); return false; } finally { setBusy(false); }
  }
  const props = { part, config, onChange: update, disabled: readOnly || busy, api };
  let controls;
  switch (part.componentRole) {
    case 'DUCT': controls = <LinkDuctProperties {...props} />; break;
    case 'SUPPORT': case 'PEDESTAL': controls = <LinkCostadoProperties {...props} />; break;
    case 'SURFACE': case 'GROMMET': controls = <LinkSurfaceProperties {...props} />; break;
    case 'FLOOR_DUCT': case 'CEILING_DUCT': case 'DUCT_COVER': controls = <LinkBajanteDuctProperties {...props} />; break;
    case 'PANTALLA_FRONTAL_BOARD': case 'PANTALLA_LATERAL_BOARD': case 'PANTALLA_FALDA_BOARD': controls = <LinkPantallaProperties {...props} />; break;
    case 'CREDENZA':
      controls = part.config?.type === 'credenza' ? <LinkCredenzaProperties {...props} /> : <div style={{ fontSize: 12 }}>Selecciona una pieza para ver sus opciones. Los acabados se editan en el panel de propiedades.</div>;
      break;
    default: controls = <div style={{ fontSize: 12 }}>Selecciona una pieza para ver sus opciones. Los acabados se editan en el panel de propiedades.</div>;
  }
  return <div style={sectionStyle}>{isLinkWorkstation(part) && <LinkDimensionsProperties {...props} />}{controls}{error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}</div>;
}
