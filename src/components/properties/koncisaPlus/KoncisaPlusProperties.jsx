import KoncisaDuctProperties from './KoncisaDuctProperties';
import KoncisaCostadoProperties from './KoncisaCostadoProperties';
import KoncisaPedestalProperties from './KoncisaPedestalProperties';
import KoncisaBajanteDuctProperties from './KoncisaBajanteDuctProperties';

export default function KoncisaPlusProperties({ part, api, onClose }) {
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

  const isPedestal = part?.kind === 'pedestal' || part?.meta?.category === 'pedestales';

  const isBajanteDuct = isFloorDuct || isCeilingDuct;

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
  if (!part) return false;

  return (
    part?.kind === 'ducto' ||
    part?.kind === 'ductoPiso' ||
    part?.kind === 'ductoTecho' ||
    part?.kind === 'costado' ||
    part?.kind === 'pedestal' ||
    part?.meta?.category === 'ductos' ||
    part?.meta?.category === 'ductos-a-piso' ||
    part?.meta?.category === 'ductos-a-techo' ||
    part?.meta?.category === 'costados' ||
    part?.meta?.category === 'pedestales'
  );
}
