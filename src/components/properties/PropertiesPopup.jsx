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
  const dragRef = useRef(null);
  const [dragPosition, setDragPosition] = useState(null);

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

  useEffect(() => {
    if (open && !anchorRef.current.open) {
      anchorRef.current = { open: true, x, y };
    } else if (!open) {
      anchorRef.current.open = false;
      dragRef.current = null;
      setDragPosition(null);
    }
  }, [open, x, y]);

  if (!open || !part) return null;

  const isFloor = part?.kind === 'FLOOR_VISUAL';
  const hasIntegration = Boolean(part?.meta?.integrationSetId || part?.integrationSetId);
  const isIntegrationLeg = Boolean(part?.meta?.isIntegrationLeg || part?.isIntegrationLeg);
  const isLinkLeg = part?.kind === 'LINK_PRODUCT' && (part?.componentRole === 'SUPPORT' || part?.componentRole === 'PEDESTAL');
  const hasSpecificIntegrationButton = isIntegrationLeg || isLinkLeg;
  const showGenericIntegrationButton = hasIntegration && !hasSpecificIntegrationButton;

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
    isFloor ||
    showGenericIntegrationButton;

  const popupWidth = 330;
  const anchorX = anchorRef.current.open ? anchorRef.current.x : x;
  const anchorY = anchorRef.current.open ? anchorRef.current.y : y;
  const popupLeft = Math.max(0, Math.min(anchorX + 12, window.innerWidth - popupWidth - 12));
  const popupTop = Math.max(0, Math.min(anchorY + 12, window.innerHeight - 40));
  const isKoncisaPopup = isKoncisaPlusEditablePart(part);
  const left = isKoncisaPopup && dragPosition ? dragPosition.left : popupLeft;
  const top = isKoncisaPopup && dragPosition ? dragPosition.top : popupTop;

  function startKoncisaDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left, top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveKoncisaDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setDragPosition({
      left: Math.max(0, Math.min(drag.left + event.clientX - drag.x, window.innerWidth - popupWidth)),
      top: Math.max(0, Math.min(drag.top + event.clientY - drag.y, window.innerHeight - 40)),
    });
  }

  function stopKoncisaDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left,
        top,
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
      {isKoncisaPopup && (
        <div
          onPointerDown={startKoncisaDrag}
          onPointerMove={moveKoncisaDrag}
          onPointerUp={stopKoncisaDrag}
          onPointerCancel={stopKoncisaDrag}
          title="Arrastrar cuadro de propiedades"
          aria-label="Mover cuadro de propiedades"
          style={{
            height: 16,
            margin: '10px 12px 0',
            borderRadius: 6,
            background: '#f3f4f6',
            cursor: 'grab',
            touchAction: 'none',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ padding: '8px 12px 0', flexShrink: 0 }}>
        <PropertyHeader title="Propiedades" onClose={onClose} />
      </div>
      <div style={{ padding: '0 12px 12px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>

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

      {showGenericIntegrationButton && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.75, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            Esta pieza pertenece a un puesto de integración.
          </div>
          <button
            type="button"
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px 12px',
              background: '#b91c1c',
              color: '#fff',
              border: '1px solid #b91c1c',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={async () => {
              await api?.removeSelectedIntegrationAndRestoreCostado?.();
            }}
          >
            Quitar puesto de integración
          </button>
        </div>
      )}

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
