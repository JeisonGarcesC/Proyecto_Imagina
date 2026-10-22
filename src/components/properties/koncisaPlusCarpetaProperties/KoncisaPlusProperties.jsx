import KoncisaDuctProperties from './KoncisaDuctProperties';
import KoncisaCostadoProperties from './KoncisaCostadoProperties';
import KoncisaPedestalProperties from './KoncisaPedestalProperties';
import KoncisaBajanteDuctProperties from './KoncisaBajanteDuctProperties';
import KoncisaPrivacyPanelProperties from './KoncisaPrivacyPanelProperties';
import KoncisaSurfaceProperties from './KoncisaSurfaceProperties';
import KoncisaLeaderOutletBoxProperties from './KoncisaLeaderOutletBoxProperties';
import KoncisaLeaderGrommetProperties from './KoncisaLeaderGrommetProperties';

function isLateralPrivacyPanel(part) {
  if (part?.kind !== 'PRIVACY_PANEL') return false;
  if (String(part?.subtype || '').toLowerCase() === 'lateral') return true;
  return String(part?.description || part?.name || '')
    .toUpperCase()
    .includes('PANTALLA LATERAL');
}

function isLinkPart(part) {
  return part?.kind === 'LINK_PRODUCT' || String(part?.line || '').toUpperCase() === 'LINK';
}

export default function KoncisaPlusProperties({ part, api, onClose }) {
  if (isLinkPart(part)) return null;

  const isNormalDucto = part?.kind === 'ducto' || part?.meta?.category === 'ductos';

  const isFloorDuct =
    part?.kind === 'ductoPiso' ||
    part?.meta?.category === 'ductos-a-piso' ||
    part?.meta?.category === 'ductos_a_piso';

  const isCeilingDuct =
    part?.kind === 'ductoTecho' ||
    part?.meta?.category === 'ductos-a-techo' ||
    part?.meta?.category === 'ductos_a_techo';

  const isCostado = part?.kind === 'costado' || part?.meta?.category === 'costados';
  const isSurface =
    part?.kind === 'SURFACE' ||
    part?.type === 'superficie' ||
    part?.meta?.category === 'superficies';
  const isLeaderOutletBox =
    part?.meta?.category === 'cajas-de-tomas' && part?.meta?.layoutType === 'LEADER';
  const isLeaderGrommet =
    part?.kind === 'grommet' &&
    part?.meta?.category === 'grommets' &&
    part?.meta?.layoutType === 'LEADER';

  const isPedestal = part?.kind === 'pedestal' || part?.meta?.category === 'pedestales';

  const isBajanteDuct = isFloorDuct || isCeilingDuct;
  const isPrivacyPanel = isLateralPrivacyPanel(part);

  if (isPrivacyPanel) {
    return <KoncisaPrivacyPanelProperties part={part} api={api} onClose={onClose} />;
  }

  if (isLeaderOutletBox) {
    return (
      <KoncisaLeaderOutletBoxProperties
        key={`${part?.parentAssemblyId || ''}:${part?.meta?.componentKey || ''}:${part?.instanceId || part?.code || ''}:${JSON.stringify(part?.meta?.componentConfig || {})}`}
        part={part}
        api={api}
      />
    );
  }

  if (isLeaderGrommet) {
    return (
      <KoncisaLeaderGrommetProperties
        key={`${part?.parentAssemblyId || ''}:${part?.meta?.targetSurfaceKey || ''}:${part?.instanceId || part?.code || ''}:${part?.meta?.finish || ''}`}
        part={part}
        api={api}
      />
    );
  }

  if (part?.meta?.targetSurfaceKey === 'SIMPLE_RETURN_SURFACE' && !isSurface) {
    const returnConfig = api?.getSelectedKoncisaSimpleReturnConfig?.(part?.parentAssemblyId);
    return <KoncisaSurfaceProperties
      key={`${part?.parentAssemblyId || ''}:SIMPLE_RETURN_SURFACE:${JSON.stringify(returnConfig || {})}`}
      part={{ ...part, meta: { ...part.meta, componentKey: 'SIMPLE_RETURN_SURFACE',
        componentConfig: returnConfig?.componentConfig || {} } }} api={api} />;
  }

  if (isSurface)
    return (
      <KoncisaSurfaceProperties
        key={`${part?.parentAssemblyId || ''}:${part?.meta?.componentKey || ''}:${JSON.stringify(part?.meta?.componentConfig || {})}`}
        part={part}
        api={api}
      />
    );

  if (isNormalDucto) {
    return <KoncisaDuctProperties part={part} api={api} />;
  }

  if (isCostado) {
    return <KoncisaCostadoProperties part={part} api={api} onClose={onClose} />;
  }

  if (isPedestal) {
    return <KoncisaPedestalProperties part={part} api={api} onClose={onClose} />;
  }

  if (isBajanteDuct) {
    return (
      <KoncisaBajanteDuctProperties
        part={part}
        api={api}
        isFloorDuct={isFloorDuct}
        isCeilingDuct={isCeilingDuct}
      />
    );
  }

  return null;
}

export function isKoncisaPlusEditablePart(part) {
  if (!part || isLinkPart(part)) return false;

  return (
    part?.kind === 'ducto' ||
    part?.kind === 'SURFACE' ||
    part?.type === 'superficie' ||
    part?.kind === 'ductoPiso' ||
    part?.kind === 'ductoTecho' ||
    part?.kind === 'costado' ||
    part?.kind === 'pedestal' ||
    isLateralPrivacyPanel(part) ||
    part?.meta?.category === 'ductos' ||
    part?.meta?.category === 'superficies' ||
    (part?.kind === 'grommet' &&
      part?.meta?.category === 'grommets' &&
      part?.meta?.layoutType === 'LEADER') ||
    (part?.meta?.category === 'cajas-de-tomas' && part?.meta?.layoutType === 'LEADER') ||
    part?.meta?.category === 'ductos-a-piso' ||
    part?.meta?.category === 'ductos-a-techo' ||
    part?.meta?.category === 'costados' ||
    part?.meta?.category === 'pedestales'
    || part?.meta?.targetSurfaceKey === 'SIMPLE_RETURN_SURFACE'
  );
}
