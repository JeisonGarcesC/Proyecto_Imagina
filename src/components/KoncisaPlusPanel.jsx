//src/components/KoncisaPlusPanel.jsx

/*
function redondearLargoSencillo(mm) {
  const metros = mm / 1000;

  if (metros <= 1) return 1000;
  if (metros > 1 && metros <= 1.2) return 1200;
  if (metros > 1.2 && metros <= 1.5) return 1500;
  return 1200;
}
*/
import { useMemo, useState, useEffect } from 'react';
import { KONCISA_SURFACE_FINISH_OPTIONS } from '../mepal/koncisaPlus/rules/koncisaSurfaceFinishOptions';
import DuctConfigModal from './DuctConfigModal';

import {
  KONCISA_PRIVACY_PANEL_FINISH_OPTIONS,
  getKoncisaPrivacyPanelFinishById,
} from '../mepal/koncisaPlus/rules/koncisaPrivacyPanelFinishOptions';

function redondearLargo(mm) {
  if (mm <= 1000) return 1000;
  if (mm <= 1200) return 1200;
  if (mm <= 1500) return 1500;
  return 1200;
}

function redondearAnchoSencillo(mm) {
  if (mm <= 600) return 600;
  if (mm <= 700) return 700;
  if (mm <= 750) return 750;
  return 600;
}

function redondearAnchoDoble(mm) {
  if (mm <= 1200) return 1200;
  if (mm <= 1500) return 1500;
  return 1200;
}

export default function KoncisaPlusPanel({ onCreate }) {
  const [puestos, setPuestos] = useState(1);
  const [tipoPuesto, setTipoPuesto] = useState('sencillo');
  const [modoEspecial, setModoEspecial] = useState(false);

  const [largoRealMm, setLargoRealMm] = useState(1200);
  const [anchoRealMm, setAnchoRealMm] = useState(600);

  const [grommet, setGrommet] = useState(true);
  const [tipoPasoCable, setTipoPasoCable] = useState('none');
  const [grommetFinish, setGrommetFinish] = useState('ALUMINIUM');
  const [selectedFinishId, setSelectedFinishId] = useState('FORMICA_30');

  const [includePrivacyPanel, setIncludePrivacyPanel] = useState(false);
  const [selectedPrivacyPanelFinishId, setSelectedPrivacyPanelFinishId] = useState(
    'PANEL_LATERAL_FORMICA_22008689'
  );

  const [tipoCostado, setTipoCostado] = useState('RECT');

  const selectedFinish = useMemo(() => {
    return (
      KONCISA_SURFACE_FINISH_OPTIONS.find((f) => f.id === selectedFinishId) ||
      KONCISA_SURFACE_FINISH_OPTIONS[0]
    );
  }, [selectedFinishId]);

  //pantalla
  const selectedPrivacyPanelFinish = useMemo(() => {
    return getKoncisaPrivacyPanelFinishById(selectedPrivacyPanelFinishId);
  }, [selectedPrivacyPanelFinishId]);

  const largoCobroMm = useMemo(() => {
    return redondearLargo(largoRealMm);
  }, [largoRealMm]);

  const anchoCobroMm = useMemo(() => {
    return tipoPuesto === 'sencillo'
      ? redondearAnchoSencillo(anchoRealMm)
      : redondearAnchoDoble(anchoRealMm);
  }, [anchoRealMm, tipoPuesto]);

  const opcionesLargoNormal = [1000, 1200, 1500];

  const opcionesAnchoNormal = tipoPuesto === 'sencillo' ? [600, 750] : [1200, 1500];

  const opcionesLargoEspecial = [1000, 1100, 1150, 1200, 1300, 1400, 1500];

  const opcionesAnchoEspecial =
    tipoPuesto === 'sencillo' ? [600, 700, 750] : [1200, 1300, 1400, 1500];

  const handleTipoPuestoChange = (value) => {
    setTipoPuesto(value);

    if (value === 'sencillo') {
      setAnchoRealMm(600);
    } else {
      setAnchoRealMm(1200);
    }

    setLargoRealMm(1200);
  };

  const [includeFloorDuct, setIncludeFloorDuct] = useState(false);

  const handleCreate = () => {
    // =========================================
    // PUESTO LÍDER
    // =========================================
    if (layoutType === 'LEADER') {
      const leaderThickMm = leaderMaterialType === 'FORMICA' ? 30 : 25;

      onCreate({
        layoutType: 'LEADER',

        leaderModoEspecial,

        leaderMainWidthMm,
        leaderMainDepthMm,

        leaderReturnLengthMm,
        leaderReturnDepthMm,

        leaderSide,
        leaderCredenza: {
          enabled: leaderCredenzaEnabled,
          side: leaderSide,
          lengthMm: leaderCredenzaLengthMm,
        },

        leaderMainCostadoForma,
        leaderJunctionHasOutletBox,

        thickMm: leaderThickMm,
        leaderMaterialType,

        finishCode: leaderMaterialType === 'FORMICA' ? '22008689' : '22015137',

        leaderHasGrommetBox,
        leaderMainGrommet: {
          enabled: leaderMainGrommetEnabled,
          position: leaderMainGrommetPosition,
          finish: grommetFinish,
        },
        leaderReturnGrommet: {
          enabled: !leaderCredenzaEnabled && leaderHasGrommetBox,
          position: leaderReturnGrommetPosition,
          finish: grommetFinish,
        },
        leaderMainFloorDuct: {
          enabled: leaderMainFloorDuctEnabled,
          position: leaderMainGrommetPosition,
        },
        leaderReturnFloorDuct: {
          enabled: !leaderCredenzaEnabled && leaderReturnFloorDuctEnabled,
          position: leaderReturnGrommetPosition,
        },
        leaderMainOutletCoupling: {
          enabled: leaderMainGrommetEnabled && leaderMainOutletCouplingEnabled,
        },
        leaderReturnOutletCoupling: {
          enabled:
            !leaderCredenzaEnabled && leaderHasGrommetBox && leaderReturnOutletCouplingEnabled,
        },
        leaderCostadoOutletCoupling: {
          enabled: leaderJunctionHasOutletBox && leaderCostadoOutletCouplingEnabled,
        },
        // Falda
        leaderHasSkirt,

        leaderSkirtMaterialType,

        leaderSkirtFinishCode,
      });

      return;
    }

    // =========================================
    // PUESTO ESTÁNDAR
    // =========================================
    onCreate({
      layoutType: 'STANDARD',

      puestos,
      tipoPuesto,
      tipoCostado,
      modoEspecial,

      largoRealMm,
      anchoRealMm,
      largoCobroMm,
      anchoCobroMm,

      tipoPasoCable,
      pasacablePosition,
      grommetFinish,

      hasDuct: true,

      finishCode: selectedFinish.finishCode,
      thickMm: selectedFinish.thickMm,
      variant: selectedFinish.variant,
      finishLabel: selectedFinish.label,

      ductModes,

      privacyPanel: {
        enabled: includePrivacyPanel,
        tipo: selectedPrivacyPanelFinish.tipo,
        material: selectedPrivacyPanelFinish.material,
        finishCode: selectedPrivacyPanelFinish.finishCode,
        finishLabel: selectedPrivacyPanelFinish.label,
        heightMm: selectedPrivacyPanelFinish.heightMm,
        hasCanto: selectedPrivacyPanelFinish.hasCanto,
        hasBacker: selectedPrivacyPanelFinish.hasBacker,

        lengthMm: selectedPrivacyPanelFinish.tipo === 'lateral' ? anchoCobroMm : largoCobroMm,
      },

      floorDuct: {
        enabled: includeFloorDuct,
      },

    });

    // TEMPORAL: prueba de pantalla lateral visible
    /*
    window.threeApi?.addKoncisaPrivacyPanel?.({
      tipo: 'lateral',
      material: 'formica',
      lengthMm: width,
      heightMm: 300,
      finishCode: '22008689',
      x: 0,
      y: 900,
      z: 0,
    });*/
  };

  const opcionesLargo = modoEspecial ? opcionesLargoEspecial : opcionesLargoNormal;
  const opcionesAncho = modoEspecial ? opcionesAnchoEspecial : opcionesAnchoNormal;

  const [pasacablePosition, setPasacablePosition] = useState('CENTER');

  useEffect(() => {
    if (tipoPasoCable !== 'pasacable') {
      setPasacablePosition('CENTER');
    }
  }, [tipoPasoCable]);

  const [ductConfigOpen, setDuctConfigOpen] = useState(false);
  const [ductModes, setDuctModes] = useState([]);

  useEffect(() => {
    setDuctModes((prev) => {
      const next = Array.from({ length: puestos }, (_, i) => prev[i] || 'TERMINAL');
      return next;
    });
  }, [puestos]);

  const opcionesCostado =
    tipoPuesto === 'sencillo'
      ? [
          { value: 'RECT', label: 'Rectangular' },
          { value: 'TEK_DER', label: 'Tek derecho' },
          { value: 'TEK_IZQ', label: 'Tek izquierdo' },
          { value: 'ORTOGONAL_DER', label: 'Ortogonal derecho' },
          { value: 'ORTOGONAL_IZQ', label: 'Ortogonal izquierdo' },
          { value: 'O', label: 'O' },
          { value: 'CURVO_DER', label: 'Curvo derecho' },
          { value: 'CURVO_IZQ', label: 'Curvo izquierdo' },
          { value: 'TRAP_DER', label: 'Trapecial derecho' },
          { value: 'TRAP_IZQ', label: 'Trapecial izquierdo' },
        ]
      : [
          { value: 'RECT', label: 'Rectangular' },
          { value: 'TEK', label: 'Tek' },
          { value: 'ORTOGONAL', label: 'Ortogonal' },
          { value: 'O', label: 'O' },
          { value: 'CURVO', label: 'Curvo' },
          { value: 'TRAP', label: 'Trapecial' },
        ];

  //console.log('DUCT MODES PANEL', ductModes);

  // variables y consantes para puestos leader
  const [layoutType, setLayoutType] = useState('STANDARD');

  // =========================
  // PUESTO LÍDER
  // =========================
  const [leaderMainWidthMm, setLeaderMainWidthMm] = useState(1500);
  const [leaderMainDepthMm, setLeaderMainDepthMm] = useState(600);

  const [leaderReturnLengthMm, setLeaderReturnLengthMm] = useState(900);
  const [leaderReturnDepthMm, setLeaderReturnDepthMm] = useState(600);

  const [leaderSide, setLeaderSide] = useState('RIGHT');
  const [leaderCredenzaEnabled, setLeaderCredenzaEnabled] = useState(false);
  const [leaderCredenzaLengthMm, setLeaderCredenzaLengthMm] = useState(1500);
  const [leaderMaterialType, setLeaderMaterialType] = useState('FORMICA');

  const [leaderHasGrommetBox, setLeaderHasGrommetBox] = useState(false);
  const [leaderMainGrommetEnabled, setLeaderMainGrommetEnabled] = useState(false);
  const [leaderMainGrommetPosition, setLeaderMainGrommetPosition] = useState('CENTER');
  const [leaderReturnGrommetPosition, setLeaderReturnGrommetPosition] = useState('CENTER');
  const [leaderMainFloorDuctEnabled, setLeaderMainFloorDuctEnabled] = useState(false);
  const [leaderReturnFloorDuctEnabled, setLeaderReturnFloorDuctEnabled] = useState(false);
  const [leaderMainOutletCouplingEnabled, setLeaderMainOutletCouplingEnabled] = useState(false);
  const [leaderReturnOutletCouplingEnabled, setLeaderReturnOutletCouplingEnabled] = useState(false);
  const [leaderCostadoOutletCouplingEnabled, setLeaderCostadoOutletCouplingEnabled] =
    useState(false);
  // Falda puesto líder
  const [leaderHasSkirt, setLeaderHasSkirt] = useState(false);

  const [leaderSkirtMaterialType, setLeaderSkirtMaterialType] = useState('METALICA');

  const [leaderSkirtFinishCode, setLeaderSkirtFinishCode] = useState(null);
  //---------------

  const [leaderModoEspecial, setLeaderModoEspecial] = useState(false);

  const leaderMainWidthOptionsNormal = [1500, 1650, 1800];

  const leaderMainWidthOptionsSpecial = [1500, 1550, 1600, 1650, 1700, 1750, 1800];

  const leaderMainDepthOptionsNormal = [600, 750];

  const leaderMainDepthOptionsSpecial = [600, 650, 700, 750];

  const leaderReturnLengthOptionsNormal = [900, 1000];

  const leaderReturnLengthOptionsSpecial = [900, 950, 1000];

  const leaderMainWidthOptions = leaderModoEspecial
    ? leaderMainWidthOptionsSpecial
    : leaderMainWidthOptionsNormal;

  const leaderMainDepthOptions = leaderModoEspecial
    ? leaderMainDepthOptionsSpecial
    : leaderMainDepthOptionsNormal;

  const leaderReturnLengthOptions = leaderModoEspecial
    ? leaderReturnLengthOptionsSpecial
    : leaderReturnLengthOptionsNormal;

  const [leaderMainCostadoForma, setLeaderMainCostadoForma] = useState('RECT');

  const [leaderJunctionHasOutletBox, setLeaderJunctionHasOutletBox] = useState(false);

  const leaderCostadoOptions = [
    { value: 'RECT', label: 'Rectangular' },
    { value: 'TEK', label: 'Tek' },
    { value: 'ORTOGONAL', label: 'Ortogonal' },
    { value: 'O', label: 'O' },
    { value: 'CURVO', label: 'Curvo' },
    { value: 'TRAP', label: 'Trapezoidal' },
  ];

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Koncisa Plus</h3>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 10,
          background: '#fafafa',
          display: 'grid',
          gap: 8,
        }}
      >
        <label>Tipo de configuración</label>

        <select
          value={layoutType}
          onChange={(e) => setLayoutType(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="STANDARD">Puesto estándar</option>
          <option value="LEADER">Puesto líder</option>
        </select>
      </div>
      {layoutType === 'LEADER' && (
        <>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Superficie principal</div>

            <div>
              <label>
                <input
                  type="checkbox"
                  checked={leaderModoEspecial}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setLeaderModoEspecial(checked);

                    if (!checked) {
                      setLeaderMainWidthMm(1500);
                      setLeaderMainDepthMm(600);
                      setLeaderReturnLengthMm(900);
                    }
                  }}
                />{' '}
                Puesto líder rematable / medida especial
              </label>
            </div>

            <div>
              <label>Largo principal</label>

              <select
                value={leaderMainWidthMm}
                onChange={(e) => setLeaderMainWidthMm(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                {leaderMainWidthOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} mm
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Profundidad principal</label>

              <select
                value={leaderMainDepthMm}
                onChange={(e) => setLeaderMainDepthMm(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                {leaderMainDepthOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} mm
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Material de superficie</label>

              <select
                value={leaderMaterialType}
                onChange={(e) => setLeaderMaterialType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="FORMICA">Fórmica 30 mm</option>

                <option value="MELAMINA">Melamina 25 mm</option>
              </select>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {leaderCredenzaEnabled ? 'Credenza' : 'Superficie de retorno'}
            </div>

            <label>
              <input
                type="checkbox"
                checked={leaderCredenzaEnabled}
                onChange={(e) => setLeaderCredenzaEnabled(e.target.checked)}
              />{' '}
              Sustituir retorno por credenza
            </label>

            <div>
              <label>{leaderCredenzaEnabled ? 'Lado de la credenza' : 'Lado del retorno'}</label>

              <select
                value={leaderSide}
                onChange={(e) => setLeaderSide(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="LEFT">Izquierda</option>
                <option value="RIGHT">Derecha</option>
              </select>
            </div>

            {leaderCredenzaEnabled ? (
              <div>
                <label>Largo de la credenza</label>
                <select
                  value={leaderCredenzaLengthMm}
                  onChange={(e) => setLeaderCredenzaLengthMm(Number(e.target.value))}
                  style={{ width: '100%' }}
                >
                  <option value={1500}>1500 mm</option>
                  <option value={1800}>1800 mm</option>
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label>Largo del retorno</label>

                  <select
                    value={leaderReturnLengthMm}
                    onChange={(e) => setLeaderReturnLengthMm(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {leaderReturnLengthOptions.map((value) => (
                      <option key={value} value={value}>
                        {value} mm
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Profundidad del retorno</label>

                  <select
                    value={leaderReturnDepthMm}
                    onChange={(e) => setLeaderReturnDepthMm(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    <option value={600}>600 mm</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Grommets</div>

            <label>
              <input
                type="checkbox"
                checked={leaderMainGrommetEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setLeaderMainGrommetEnabled(enabled);
                  if (enabled) {
                    setLeaderHasGrommetBox(false);
                    setLeaderReturnOutletCouplingEnabled(false);
                  }
                }}
              />{' '}
              Incluir en superficie principal
            </label>

            {leaderMainGrommetEnabled && (
              <label>
                <input
                  type="checkbox"
                  checked={leaderMainOutletCouplingEnabled}
                  onChange={(e) => setLeaderMainOutletCouplingEnabled(e.target.checked)}
                />{' '}
                Incluir acople a pared en superficie principal
              </label>
            )}

            <label>
              <input
                type="checkbox"
                checked={leaderMainFloorDuctEnabled}
                onChange={(e) => setLeaderMainFloorDuctEnabled(e.target.checked)}
              />{' '}
              Incluir ducto bajante bajo superficie principal
            </label>

            {(leaderMainGrommetEnabled || leaderMainFloorDuctEnabled) && (
              <div>
                <label>Posición en superficie principal</label>
                <select
                  value={leaderMainGrommetPosition}
                  onChange={(e) => setLeaderMainGrommetPosition(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="LEFT">Izquierda</option>
                  <option value="CENTER">Centro</option>
                  <option value="RIGHT">Derecha</option>
                </select>
              </div>
            )}

            {!leaderCredenzaEnabled && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={leaderHasGrommetBox}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setLeaderHasGrommetBox(enabled);
                      if (enabled) {
                        setLeaderMainGrommetEnabled(false);
                        setLeaderMainOutletCouplingEnabled(false);
                      }
                    }}
                  />{' '}
                  Incluir en superficie de retorno
                </label>

                {leaderHasGrommetBox && (
                  <label>
                    <input
                      type="checkbox"
                      checked={leaderReturnOutletCouplingEnabled}
                      onChange={(e) => setLeaderReturnOutletCouplingEnabled(e.target.checked)}
                    />{' '}
                    Incluir acople a pared en superficie de retorno
                  </label>
                )}

                <label>
                  <input
                    type="checkbox"
                    checked={leaderReturnFloorDuctEnabled}
                    onChange={(e) => setLeaderReturnFloorDuctEnabled(e.target.checked)}
                  />{' '}
                  Incluir ducto bajante bajo superficie de retorno
                </label>

                {(leaderHasGrommetBox || leaderReturnFloorDuctEnabled) && (
                  <div>
                    <label>Posición en superficie de retorno</label>
                    <select
                      value={leaderReturnGrommetPosition}
                      onChange={(e) => setLeaderReturnGrommetPosition(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="LEFT">Izquierda</option>
                      <option value="CENTER">Centro</option>
                      <option value="RIGHT">Derecha</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {(leaderMainGrommetEnabled || (!leaderCredenzaEnabled && leaderHasGrommetBox)) && (
              <div>
                <label>Acabado</label>
                <select
                  value={grommetFinish}
                  onChange={(e) => setGrommetFinish(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="ALUMINIUM">Aluminium</option>
                  <option value="PAINTED">Painted</option>
                  <option value="METALICO">Metálico</option>
                  <option value="ALUMINIUM_PINTADO">Aluminium pintado</option>
                </select>
              </div>
            )}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Costados de la superficie principal</div>

            <div>
              <label>Tipo de costado</label>

              <select
                value={leaderMainCostadoForma}
                onChange={(e) => setLeaderMainCostadoForma(e.target.value)}
                style={{ width: '100%' }}
              >
                {leaderCostadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 12, opacity: 0.75 }}>
              El mismo tipo de costado se utilizará en ambos extremos de la superficie principal.
            </div>

            <label>
              <input
                type="checkbox"
                checked={leaderJunctionHasOutletBox}
                onChange={(e) => setLeaderJunctionHasOutletBox(e.target.checked)}
              />{' '}
              Incluir caja de tomas en el costado junto al retorno
            </label>

            {leaderJunctionHasOutletBox && (
              <label>
                <input
                  type="checkbox"
                  checked={leaderCostadoOutletCouplingEnabled}
                  onChange={(e) => setLeaderCostadoOutletCouplingEnabled(e.target.checked)}
                />{' '}
                Incluir acople a pared para la caja del costado
              </label>
            )}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Falda puesto líder</div>

            <label>
              <input
                type="checkbox"
                checked={leaderHasSkirt}
                onChange={(e) => setLeaderHasSkirt(e.target.checked)}
              />{' '}
              Incluir falda frontal
            </label>

            {leaderHasSkirt && (
              <>
                <div>
                  <label>Acabado</label>

                  <select
                    value={leaderSkirtMaterialType}
                    onChange={(e) => setLeaderSkirtMaterialType(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="METALICA">Metálica</option>

                    <option value="FORMICA">Fórmica</option>

                    <option value="MELAMINA">Melamina</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fafafa',
              fontSize: 13,
            }}
          >
            <div>
              <b>Resumen del puesto líder</b>
            </div>

            <div>
              Superficie principal: {leaderMainWidthMm} × {leaderMainDepthMm} mm
            </div>

            <div>
              {leaderCredenzaEnabled
                ? `Credenza: ${leaderCredenzaLengthMm} × 500 × 640 mm`
                : `Retorno: ${leaderReturnLengthMm} × ${leaderReturnDepthMm} mm`}
            </div>

            <div>Lado: {leaderSide === 'RIGHT' ? 'Derecho' : 'Izquierdo'}</div>

            <div>
              Material: {leaderMaterialType === 'FORMICA' ? 'Fórmica 30 mm' : 'Melamina 25 mm'}
            </div>

            <div>Grommet principal: {leaderMainGrommetEnabled ? 'Sí' : 'No'}</div>
            <div>Ducto a piso principal: {leaderMainFloorDuctEnabled ? 'Sí' : 'No'}</div>
            {!leaderCredenzaEnabled && (
              <>
                <div>Grommet retorno: {leaderHasGrommetBox ? 'Sí' : 'No'}</div>
                <div>Ducto a piso retorno: {leaderReturnFloorDuctEnabled ? 'Sí' : 'No'}</div>
              </>
            )}
          </div>

          <button type="button" onClick={handleCreate}>
            Crear puesto líder
          </button>
        </>
      )}

      {layoutType === 'STANDARD' && (
        <>
          {/* Todo el formulario estándar actual */}
          <div>
            <label>Tipo de puesto</label>
            <select
              value={tipoPuesto}
              onChange={(e) => handleTipoPuestoChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="sencillo">Sencillo</option>
              <option value="doble">Doble</option>
            </select>
          </div>
          <div>
            <label>Puestos</label>
            <select
              value={puestos}
              onChange={(e) => setPuestos(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={1}>1 puesto</option>
              <option value={2}>2 puestos</option>
              <option value={3}>3 puestos</option>
              <option value={4}>4 puestos</option>
              <option value={5}>5 puestos</option>
              <option value={6}>6 puestos</option>
              <option value={7}>7 puestos</option>
              <option value={8}>8 puestos</option>
              <option value={9}>9 puestos</option>
              <option value={10}>10 puestos</option>
              <option value={11}>11 puestos</option>
              <option value={12}>12 puestos</option>
            </select>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={modoEspecial}
                onChange={(e) => setModoEspecial(e.target.checked)}
              />{' '}
              Puesto especial
            </label>
          </div>
          <div>
            <label>Largo real</label>
            <select
              value={largoRealMm}
              onChange={(e) => setLargoRealMm(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              {opcionesLargo.map((v) => (
                <option key={v} value={v}>
                  {v} mm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Ancho real</label>
            <select
              value={anchoRealMm}
              onChange={(e) => setAnchoRealMm(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              {opcionesAncho.map((v) => (
                <option key={v} value={v}>
                  {v} mm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Acabado / tipo de superficie</label>
            <select
              value={selectedFinishId}
              onChange={(e) => setSelectedFinishId(e.target.value)}
              style={{ width: '100%' }}
            >
              {KONCISA_SURFACE_FINISH_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fff',
              display: 'grid',
              gap: 8,
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={includePrivacyPanel}
                onChange={(e) => setIncludePrivacyPanel(e.target.checked)}
              />{' '}
              Incluir pantalla
            </label>

            {includePrivacyPanel && (
              <>
                <div>
                  <label>Acabado / tipo de pantalla</label>
                  <select
                    value={selectedPrivacyPanelFinishId}
                    onChange={(e) => setSelectedPrivacyPanelFinishId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  <div>Tipo: {selectedPrivacyPanelFinish.tipo}</div>
                  <div>Material: {selectedPrivacyPanelFinish.material}</div>
                  <div>Finish code: {selectedPrivacyPanelFinish.finishCode}</div>
                  <div>Canto: {selectedPrivacyPanelFinish.hasCanto ? 'Sí' : 'No'}</div>
                  <div>Backer: {selectedPrivacyPanelFinish.hasBacker ? 'Sí' : 'No'}</div>
                </div>
              </>
            )}
          </div>

          <button type="button" onClick={() => setDuctConfigOpen(true)}>
            Configurar ductos
          </button>

          <DuctConfigModal
            open={ductConfigOpen}
            onClose={() => setDuctConfigOpen(false)}
            puestos={puestos}
            ductModes={ductModes}
            setDuctModes={setDuctModes}
          />

          <div>
            <label>
              <input
                type="checkbox"
                checked={includeFloorDuct}
                onChange={(e) => setIncludeFloorDuct(e.target.checked)}
              />{' '}
              Incluir ducto bajante a piso
            </label>
          </div>

          <div>
            <label>Tipo de costado</label>
            <select
              value={tipoCostado}
              onChange={(e) => setTipoCostado(e.target.value)}
              style={{ width: '100%' }}
            >
              {opcionesCostado.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Acceso para cableado</label>
            <select
              value={tipoPasoCable}
              onChange={(e) => setTipoPasoCable(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="none">Ninguno</option>
              <option value="grommet">Grommet</option>
              <option value="pasacable">Pasacable</option>
            </select>
          </div>
          {/* =========================
    PASACABLE
========================= */}
          {tipoPasoCable === 'pasacable' && (
            <div>
              <label>Posición pasacables</label>

              {tipoPuesto === 'sencillo' && (
                <select
                  value={pasacablePosition}
                  onChange={(e) => setPasacablePosition(e.target.value)}
                >
                  <option value="LEFT">Izquierda</option>
                  <option value="CENTER">Centro</option>
                  <option value="RIGHT">Derecha</option>
                </select>
              )}

              {tipoPuesto === 'doble' && (
                <select
                  value={pasacablePosition}
                  onChange={(e) => setPasacablePosition(e.target.value)}
                >
                  <option value="CENTER">Centro</option>
                  <option value="LEFT_RIGHT">Izq - Der</option>
                  <option value="RIGHT_LEFT">Der - Izq</option>
                  <option value="LEFT_LEFT">Izq - Izq</option>
                  <option value="RIGHT_RIGHT">Der - Der</option>
                </select>
              )}
            </div>
          )}

          {/* =========================
    GROMMET
========================= */}
          {tipoPasoCable === 'grommet' && (
            <div>
              <label>Acabado del grommet</label>
              <select
                value={grommetFinish}
                onChange={(e) => setGrommetFinish(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="ALUMINIUM">Aluminium</option>
                <option value="PAINTED">Painted</option>
                <option value="METALICO">Metálico</option>
                <option value="ALUMINIUM_PINTADO">Aluminium pintado</option>
              </select>
            </div>
          )}

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10,
              background: '#fafafa',
              fontSize: 13,
            }}
          >
            <div>
              <b>Resumen técnico</b>
            </div>
            <div>Largo real: {largoRealMm} mm</div>
            <div>Ancho real: {anchoRealMm} mm</div>
            <div>Largo de cobro/código: {largoCobroMm} mm</div>
            <div>Ancho de cobro/código: {anchoCobroMm} mm</div>
            <div>Acabado: {selectedFinish.label}</div>
            <div>Finish code: {selectedFinish.finishCode}</div>
            <div>Espesor: {selectedFinish.thickMm} mm</div>
            <div>Variante: {selectedFinish.variant || 'base'}</div>
          </div>
          <button onClick={handleCreate}>Crear puesto</button>
        </>
      )}
    </div>
  );
}
