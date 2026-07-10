import { useMemo, useState } from 'react';
import { btnStyle, inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles';

function normalizeReplaceZone(value) {
  const v = String(value || '')
    .trim()
    .toUpperCase();

  if (['LEFT', 'L', 'IZQ', 'IZQUIERDA'].includes(v)) return 'LEFT';
  if (['RIGHT', 'R', 'DER', 'DERECHA'].includes(v)) return 'RIGHT';

  return '';
}

function normalizeTipoPuesto(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getInitialWidth(part) {
  return (
    part?.meta?.nominalWidthMm ||
    part?.meta?.largoRealMm ||
    part?.dim?.widthMm ||
    part?.dimMm?.widthMm ||
    1200
  );
}

function getInitialDepth(part) {
  return (
    part?.meta?.depthMm ||
    part?.meta?.anchoRealMm ||
    part?.dim?.depthMm ||
    part?.dimMm?.depthMm ||
    600
  );
}

function getInitialFinishCode(part) {
  return part?.meta?.finishCode || part?.finishCode || part?.materialCode || '22008689';
}

function getInitialThickMm(part) {
  return part?.meta?.thickMm || part?.dim?.thickMm || part?.dimMm?.thickMm || 30;
}

export default function KoncisaCostadoProperties({ part, api, onClose }) {
  const replaceZone = normalizeReplaceZone(part?.meta?.replaceZone || part?.meta?.side);

  const tipoPuesto = normalizeTipoPuesto(
    part?.meta?.tipoPuesto || part?.tipoPuesto || part?.meta?.deskType || part?.deskType
  );

  const isTerminal = useMemo(() => {
    const tipoModulo = String(part?.meta?.tipoModulo || part?.tipoModulo || '')
      .trim()
      .toLowerCase();

    return (
      tipoModulo === 'terminal' ||
      replaceZone === 'LEFT' ||
      replaceZone === 'RIGHT' ||
      part?.meta?.isTerminal === true ||
      part?.isTerminal === true
    );
  }, [part, replaceZone]);

  const isIntegrationLeg =
    part?.meta?.isIntegrationLeg === true ||
    part?.meta?.replacesCostado === true ||
    Boolean(part?.meta?.integrationSetId);

  const canUseIntegration = tipoPuesto === 'doble' && isTerminal && !isIntegrationLeg;

  const [integrationWidthMm, setIntegrationWidthMm] = useState(() => {
    const width = Number(getInitialWidth(part));
    return width >= 1500 ? 1500 : 1200;
  });

  const [integrationDepthMm, setIntegrationDepthMm] = useState(() => {
    const depth = Number(getInitialDepth(part));
    return depth >= 750 ? 750 : 600;
  });

  const [cableAccessType, setCableAccessType] = useState('grommet');

  const [finishCode] = useState(() => getInitialFinishCode(part));
  const [thickMm] = useState(() => getInitialThickMm(part));

  const handleAddIntegration = async () => {
    const side = replaceZone === 'LEFT' ? 'LEFT' : 'RIGHT';

    const ok = await api?.replaceSelectedCostadoWithIntegration?.({
      side,
      widthMm: Number(integrationWidthMm),
      depthMm: Number(integrationDepthMm),
      cableAccessType,
      finishCode,
      thickMm,
    });

    if (ok !== false) {
      onClose?.();
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Costado Koncisa Plus</div>

      <div style={{ fontSize: 11, opacity: 0.75, display: 'grid', gap: 3 }}>
        <div>
          <b>Zona:</b> {replaceZone || part?.meta?.replaceZone || part?.meta?.side || 'No definida'}
        </div>

        <div>
          <b>Módulo:</b> {part?.meta?.moduleIndex ?? 'No definido'}
        </div>

        <div>
          <b>Tipo puesto:</b> {tipoPuesto || 'No definido'}
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

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <label style={labelStyle}>Puesto de integración</label>

        {isIntegrationLeg && (
          <>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.4,
                opacity: 0.75,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 8,
              }}
            >
              Este costado pertenece a un puesto de integración.
            </div>

            <button
              type="button"
              style={{
                ...btnStyle,
                marginTop: 10,
                background: '#b91c1c',
                borderColor: '#b91c1c',
              }}
              onClick={async () => {
                const ok = await api?.removeSelectedIntegrationAndRestoreCostado?.();

                if (ok !== false) {
                  onClose?.();
                }
              }}
            >
              Quitar puesto de integración
            </button>
          </>
        )}

        {!isIntegrationLeg && !canUseIntegration ? (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.4,
              opacity: 0.65,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 8,
            }}
          >
            Disponible solo para costados terminales de puestos dobles.
          </div>
        ) : !isIntegrationLeg ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Largo</label>
                <select
                  style={inputStyle}
                  value={integrationWidthMm}
                  onChange={(e) => setIntegrationWidthMm(Number(e.target.value))}
                >
                  <option value={1200}>120 cm</option>
                  <option value={1500}>150 cm</option>
                </select>
              </div>

              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Fondo</label>
                <select
                  style={inputStyle}
                  value={integrationDepthMm}
                  onChange={(e) => setIntegrationDepthMm(Number(e.target.value))}
                >
                  <option value={600}>60 cm</option>
                  <option value={750}>75 cm</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>Acceso de cableado</label>

              <select
                style={inputStyle}
                value={cableAccessType}
                onChange={(e) => setCableAccessType(e.target.value)}
              >
                <option value="grommet">Grommet aluminio 4 tomas</option>
                <option value="pasacable">Pasacable gris claro</option>
              </select>
            </div>

            <button
              type="button"
              style={{
                ...btnStyle,
                marginTop: 10,
                background: '#0f766e',
                borderColor: '#0f766e',
              }}
              onClick={handleAddIntegration}
            >
              Agregar puesto de integración
            </button>

            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65, lineHeight: 1.35 }}>
              Esta acción reemplaza el costado terminal por un costado doble de integración y agrega
              la superficie, ducto individual, acople, refuerzo y costados unitarios.
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
