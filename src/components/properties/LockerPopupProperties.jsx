import { useState } from 'react';
import LockerConfigPopup from '../../mepal/lockers/properties/LockerConfigPopup.jsx';
import { sectionStyle, btnStyle } from './shared/PropertyStyles';

export function isLockerEditablePart(part) {
  return part?.kind === 'LOCKER_PRODUCT';
}

export default function LockerPopupProperties({ part, api, onClose }) {
  const [configOpen, setConfigOpen] = useState(false);

  if (!isLockerEditablePart(part)) return null;

  return (
    <div style={sectionStyle}>
      <button type="button" style={btnStyle} onClick={() => setConfigOpen(true)}>
        Editar configuración (dimensiones/calibre)
      </button>

      <LockerConfigPopup
        open={configOpen}
        part={part}
        api={api}
        onClose={() => {
          setConfigOpen(false);
          onClose?.();
        }}
      />
    </div>
  );
}
