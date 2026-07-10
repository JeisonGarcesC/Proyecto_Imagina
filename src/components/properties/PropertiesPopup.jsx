import { useEffect, useRef } from 'react';
import KoncisaPlusProperties, {
  isKoncisaPlusEditablePart,
} from './koncisaPlusCarpetaProperties/KoncisaPlusProperties';
import MepalSaludProperties from './MepalSaludProperties';
import ClakProperties from './ClakProperties';
import AlmacenamientoProperties from './AlmacenamientoProperties';
import { isClakPuffVariantPart } from './clakPuffVariants';
import { sectionStyle } from './shared/PropertyStyles';
import PropertyHeader from './shared/PropertyHeader';

function isMepalSaludPart(part) {
  return part?.kind === 'MEPAL_SALUD';
}

function isAlmacenamientoPart(part) {
  return part?.kind === 'ALMACENAMIENTO';
}

export default function PropertiesPopup({ open, x, y, part, api, onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !part) return null;

  const isFloor = part?.kind === 'FLOOR_VISUAL';

  const hasEditableProperties =
    isKoncisaPlusEditablePart(part) ||
    isMepalSaludPart(part) ||
    isAlmacenamientoPart(part) ||
    isClakPuffVariantPart(part) ||
    isFloor;

  const popupLeft = Math.min(x + 12, window.innerWidth - 310);
  const popupTop = Math.min(y + 12, window.innerHeight - 420);

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: popupLeft,
        top: popupTop,
        zIndex: 99999,
        width: 290,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
        padding: 12,
      }}
    >
      <PropertyHeader title="Propiedades" onClose={onClose} />

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        {part.description || part.code || 'Elemento'}
      </div>

      {part.code && (
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Código: {part.code}</div>
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
        kind: {String(part?.kind || '')}
      </div>

      <KoncisaPlusProperties part={part} api={api} onClose={onClose} />

      <MepalSaludProperties part={part} api={api} onClose={onClose} />

      <ClakProperties part={part} api={api} onClose={onClose} />

      <AlmacenamientoProperties part={part} api={api} onClose={onClose} />

      {isFloor && (
        <div style={sectionStyle}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={part?.showGrid !== false}
              onChange={(e) => {
                api?.updateFloorVisualOptions?.({
                  showGrid: e.target.checked,
                });
              }}
            />
            Mostrar cuadrícula
          </label>
        </div>
      )}

      {!hasEditableProperties && (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          Este elemento aún no tiene propiedades editables desde el popup.
        </div>
      )}
    </div>
  );
}
