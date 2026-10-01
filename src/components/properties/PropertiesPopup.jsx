import LinkProperties from './linkCarpetaProperties/LinkProperties.jsx';
import MultipleProperties from '../../mepal/multiple/properties/MultipleProperties.jsx';
import { useEffect, useRef, useState } from 'react';
import KoncisaPlusProperties, {
  isKoncisaPlusEditablePart,
} from './koncisaPlusCarpetaProperties/KoncisaPlusProperties';
import MepalSaludProperties from './MepalSaludProperties';
import ClakProperties from './ClakProperties';
import AlmacenamientoProperties from './AlmacenamientoProperties';
import EdukProperties, { isEdukShelfEditablePart } from './EdukProperties';
import KuoGoProperties, { isKuoGoEditablePart } from './KuoGoProperties';
import KuoAVProperties, { isKuoAVEditablePart } from './KuoAVProperties';
import KuoAVDobleProperties, { isKuoAVDobleEditablePart } from './KuoAVDobleProperties';
import GiroSurfaceProperties, { isGiroSurfaceEditablePart } from './GiroSurfaceProperties';
import MoreaProperties, { isMoreaEditablePart } from './MoreaProperties';
import MilaProperties, { isMilaEditablePart } from './MilaProperties';
import { isClakPuffVariantPart } from './clakPuffVariants';
import LockerPopupProperties, { isLockerEditablePart } from './LockerPopupProperties';
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
  const anchorRef = useRef({ open: false, x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialOffset: { x: 0, y: 0 } });

  useEffect(() => {
    if (!open) {
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
      return;
    }

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

  useEffect(() => {
    if (!isDragging) return;
    function handlePointerMove(e) {
      setDragOffset({
        x: dragStartRef.current.initialOffset.x + (e.clientX - dragStartRef.current.startX),
        y: dragStartRef.current.initialOffset.y + (e.clientY - dragStartRef.current.startY)
      });
    }
    function handlePointerUp() {
      setIsDragging(false);
    }
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (open && !anchorRef.current.open) {
      anchorRef.current = { open: true, x, y };
    } else if (!open) {
      anchorRef.current.open = false;
    }
  }, [open, x, y]);

  if (!open || !part) return null;

  const isFloor = part?.kind === 'FLOOR_VISUAL';

  const hasEditableProperties =
    part?.kind === 'LINK_PRODUCT' ||
    part?.kind === 'MULTIPLE_PRODUCT' ||
    isKoncisaPlusEditablePart(part) ||
    isMepalSaludPart(part) ||
    isAlmacenamientoPart(part) ||
    isEdukShelfEditablePart(part) ||
    isClakPuffVariantPart(part) ||
    isKuoGoEditablePart(part) ||
    isKuoAVEditablePart(part) ||
    isKuoAVDobleEditablePart(part) ||
    isGiroSurfaceEditablePart(part) ||
    isMoreaEditablePart(part) ||
    isMilaEditablePart(part) ||
    isLockerEditablePart(part) ||
    isFloor;

  const popupWidth = 330;
  const anchorX = anchorRef.current.open ? anchorRef.current.x : x;
  const anchorY = anchorRef.current.open ? anchorRef.current.y : y;
  
  let popupLeft = Math.min(anchorX + 12, window.innerWidth - popupWidth - 12) + dragOffset.x;
  let popupTop = Math.min(anchorY + 12, window.innerHeight - 420) + dragOffset.y;
  
  popupLeft = Math.max(0, Math.min(popupLeft, window.innerWidth - popupWidth));
  popupTop = Math.max(0, Math.min(popupTop, window.innerHeight - 50));

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: popupLeft,
        top: popupTop,
        zIndex: 99999,
        width: popupWidth,
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
      }}
    >
      <div 
        onPointerDown={(e) => {
          dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialOffset: dragOffset
          };
          setIsDragging(true);
          if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
        }}
        style={{ cursor: 'move', userSelect: 'none', touchAction: 'none', padding: '12px 12px 0 12px' }}
      >
        <PropertyHeader title="Propiedades" onClose={onClose} />
      </div>

      <div style={{ padding: '0 12px 12px 12px', overflowY: 'auto', flex: 1 }}>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        {part.description || part.code || 'Elemento'}
      </div>

      {part.code && (
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Código: {part.code}</div>
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
        kind: {String(part?.kind || '')}
      </div>

      <LinkProperties part={part} api={api} onClose={onClose} />
      <MultipleProperties part={part} api={api} onClose={onClose} />
      <KoncisaPlusProperties part={part} api={api} onClose={onClose} />

      <MepalSaludProperties part={part} api={api} onClose={onClose} />

      <ClakProperties part={part} api={api} onClose={onClose} />

      <AlmacenamientoProperties part={part} api={api} onClose={onClose} />

      <EdukProperties part={part} api={api} onClose={onClose} />

      <KuoGoProperties part={part} api={api} onClose={onClose} />

      <KuoAVProperties part={part} api={api} onClose={onClose} />

      <KuoAVDobleProperties part={part} api={api} onClose={onClose} />

      <GiroSurfaceProperties part={part} api={api} onClose={onClose} />

      <MoreaProperties part={part} api={api} onClose={onClose} />

      {!isMoreaEditablePart(part) && <MilaProperties part={part} api={api} onClose={onClose} />}

      <LockerPopupProperties part={part} api={api} onClose={onClose} />

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

          <label
            style={{
              display: 'grid',
              gap: 6,
              marginTop: 12,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Tamaño de cuadrícula
            <select
              value={String(part?.gridSize || 0.1)}
              onChange={(e) => {
                api?.updateFloorVisualOptions?.({
                  gridSize: Number(e.target.value),
                });
              }}
            >
              <option value="0.1">0.10 m</option>
              <option value="0.25">0.25 m</option>
              <option value="0.5">0.50 m</option>
              <option value="1">1.00 m</option>
            </select>
          </label>
        </div>
      )}

      {!hasEditableProperties && (
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          Este elemento aún no tiene propiedades editables desde el popup.
        </div>
      )}
      </div>
    </div>
  );
}
