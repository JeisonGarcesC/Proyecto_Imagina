import { useEffect, useRef } from 'react';

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
  const isFloor = part?.kind === 'FLOOR_VISUAL';

  const hasEditableProperties =
    isNormalDucto || isBajanteDuct || isFloor || isCostado || isPedestal;

  const popupLeft = Math.min(x + 12, window.innerWidth - 310);
  const popupTop = Math.min(y + 12, window.innerHeight - 420);

  const inputStyle = {
    width: '100%',
    height: 34,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    padding: '0 8px',
    background: '#fff',
    boxSizing: 'border-box',
    fontSize: 12,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  };

  const sectionStyle = {
    marginTop: 12,
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 10,
    background: '#f9fafb',
  };

  const btnStyle = {
    width: '100%',
    height: 34,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Propiedades</div>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        {part.description || part.code || 'Elemento'}
      </div>

      {part.code && (
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>Código: {part.code}</div>
      )}

      <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
        kind: {String(part?.kind || '')}
      </div>

      {isNormalDucto && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Tipo de ducto</label>

          <select
            value={String(part?.meta?.tipoModulo || 'TERMINAL').toUpperCase()}
            onChange={(e) => api?.updateSelectedDuctType?.(e.target.value)}
            style={inputStyle}
          >
            <option value="TERMINAL">Terminal</option>
            <option value="INTERMEDIO">Intermedio</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
      )}

      {isCostado && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Costado Koncisa Plus</div>

          <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
            <div>
              <b>Zona:</b> {part?.meta?.replaceZone || part?.meta?.side || 'No definida'}
            </div>

            <div>
              <b>Módulo:</b> {part?.meta?.moduleIndex ?? 'No definido'}
            </div>

            <div>
              <b>Replace key:</b> {part?.meta?.replaceKey || 'No definido'}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Reemplazar por pedestal</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  api?.replaceSelectedCostadoWithPedestal?.({
                    placementSide: 'LEFT',
                  });
                  onClose?.();
                }}
              >
                Izquierda
              </button>

              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  api?.replaceSelectedCostadoWithPedestal?.({
                    placementSide: 'RIGHT',
                  });
                  onClose?.();
                }}
              >
                Derecha
              </button>
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
            Esta acción elimina este costado y crea un pedestal en su lugar.
          </div>
        </div>
      )}

      {isPedestal && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
            Pedestal Koncisa Plus
          </div>

          <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
            <div>
              <b>Modelo:</b> {part?.meta?.modelCode || 'KONPLUSSPYMPED'}
            </div>

            <div>
              <b>Reemplaza:</b> {part?.meta?.replaceZone || 'Costado'}
            </div>

            <div>
              <b>Lado:</b> {part?.meta?.placementSide === 'LEFT' ? 'Izquierda' : 'Derecha'}
            </div>
          </div>

          <button
            type="button"
            style={{
              width: '100%',
              height: 34,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#7f1d1d',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              marginTop: 10,
            }}
            onClick={() => {
              api?.replaceSelectedPedestalWithCostado?.();
              onClose?.();
            }}
          >
            Volver a costado
          </button>

          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
            Esta acción elimina el pedestal y restaura el costado original.
          </div>
        </div>
      )}

      {isBajanteDuct && (
        <div style={sectionStyle}>
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
            {isFloorDuct ? 'Ducto bajante a piso' : 'Ducto bajante a techo'}
          </div>

          <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
            <div>
              <b>Modelo:</b> {part?.meta?.modelCode || 'No definido'}
            </div>

            <div>
              <b>Referencia:</b>{' '}
              {part?.meta?.referenceDuctType ||
                part?.meta?.tipoModuloReferencia ||
                part?.meta?.referenceDuctCode ||
                'No definida'}
            </div>

            {part?.meta?.tipoPuesto && (
              <div>
                <b>Tipo puesto:</b> {part.meta.tipoPuesto}
              </div>
            )}

            {part?.meta?.tipoPasoCable && (
              <div>
                <b>Cableado:</b> {part.meta.tipoPasoCable}
              </div>
            )}

            {part?.meta?.side && (
              <div>
                <b>Lado actual:</b> {part.meta.side === 'RIGHT' ? 'Derecha' : 'Izquierda'}
              </div>
            )}
          </div>

          {isCeilingDuct && (
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Lado ducto a techo</label>

              <select
                value={part?.meta?.side || 'LEFT'}
                onChange={(e) => {
                  const side = e.target.value;
                  api?.updateSelectedCeilingDuctSide?.(side);
                }}
                style={inputStyle}
              >
                <option value="LEFT">Izquierda</option>
                <option value="RIGHT">Derecha</option>
              </select>
            </div>
          )}

          {isFloorDuct && (
            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
              Este ducto bajante a piso se ubica automáticamente según la regla del puesto y el
              ducto de referencia.
            </div>
          )}
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
