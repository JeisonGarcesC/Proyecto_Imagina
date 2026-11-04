// src/components/CompendioPanel.jsx
import React, { useState } from 'react';
import {
  COMPENDIO_SURFACE_CATEGORIES,
  COMPENDIO_PRINCIPAL_SURFACE_TYPES,
  COMPENDIO_ORGANICAS_SURFACE_TYPES,
  COMPENDIO_STANDARD_WIDTHS,
  COMPENDIO_EN_P_WIDTHS,
  COMPENDIO_EN_D_WIDTHS,
  COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS,
  COMPENDIO_ORGANICA_CURVA_2_WIDTHS,
  COMPENDIO_SPECIAL_WIDTHS,
  COMPENDIO_DEPTHS,
  COMPENDIO_DEFAULT_CONFIG,
  COMPENDIO_DIMENSIONS,
  isCompendioCurva2,
  isCompendioCurva60a75,
} from '../mepal/compendio/definitions/compendioDefaults.js';
import {
  inputStyle,
  labelStyle,
  sectionStyle,
  btnStyle,
} from './properties/shared/PropertyStyles.js';

export function CompendioPanel({ threeApiRef, readOnly = false }) {
  const [surfaceCategory, setSurfaceCategory] = useState('Superficies principales');
  const [surfaceType, setSurfaceType] = useState('Rectangular');
  const [modoEspecial, setModoEspecial] = useState(false);
  const [inverted, setInverted] = useState(false);
  const [widthMm, setWidthMm] = useState(600);
  const [depthMm, setDepthMm] = useState(600);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isPrincipales = surfaceCategory === 'Superficies principales';
  const isOrganicas = surfaceCategory === 'Superficies orgánicas';
  const isEsquineras = surfaceCategory === 'Superficies esquineras';

  const isRectangular = isPrincipales && surfaceType === 'Rectangular';
  const isEnP = isPrincipales && surfaceType === 'En P';
  const isEnD = isPrincipales && surfaceType === 'En D';
  const isCurva60a75 = isCompendioCurva60a75(surfaceType);
  const isCurva2 = isCompendioCurva2(surfaceType);

  const canCreate = isPrincipales || isCurva60a75 || isCurva2;

  const widthOptions = isCurva2
    ? COMPENDIO_ORGANICA_CURVA_2_WIDTHS
    : isCurva60a75
      ? COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS
      : isEnD
        ? COMPENDIO_EN_D_WIDTHS
        : isEnP
          ? COMPENDIO_EN_P_WIDTHS
          : modoEspecial
            ? COMPENDIO_SPECIAL_WIDTHS
            : COMPENDIO_STANDARD_WIDTHS;
  const depthOptions = COMPENDIO_DEPTHS;

  const handleCategoryChange = (newCat) => {
    setSurfaceCategory(newCat);
    setInverted(false);
    setMessage('');
    setError('');
    if (newCat === 'Superficies principales') {
      setSurfaceType('Rectangular');
      setModoEspecial(false);
      setWidthMm(600);
      setDepthMm(600);
    } else if (newCat === 'Superficies orgánicas') {
      setSurfaceType('Curva de 60 a 75');
      setModoEspecial(false);
      setWidthMm(600);
      setDepthMm(750);
    }
  };

  const handleSurfaceTypeChange = (newType) => {
    setSurfaceType(newType);
    setInverted(false);
    setMessage('');
    setError('');
    if (isCompendioCurva2(newType)) {
      setSurfaceCategory('Superficies orgánicas');
      setModoEspecial(false);
      setWidthMm(1500);
      setDepthMm(900);
    } else if (isCompendioCurva60a75(newType)) {
      setSurfaceCategory('Superficies orgánicas');
      setModoEspecial(false);
      setWidthMm(600);
      setDepthMm(750);
    } else if (newType === 'En D') {
      setSurfaceCategory('Superficies principales');
      setModoEspecial(false);
      setWidthMm(900);
      setDepthMm(600);
    } else if (newType === 'En P') {
      setSurfaceCategory('Superficies principales');
      setModoEspecial(false);
      setWidthMm(1200);
      setDepthMm(600);
    } else if (newType === 'Rectangular') {
      setSurfaceCategory('Superficies principales');
      setWidthMm(600);
      setDepthMm(600);
    }
  };

  const handleWidthChange = (newW) => {
    setWidthMm(newW);
    if (isCurva2 && newW !== 1500 && depthMm === 1200) {
      setDepthMm(900);
    }
  };

  const handleModoEspecialToggle = (checked) => {
    setModoEspecial(checked);
    if (!checked) {
      const closestW =
        COMPENDIO_STANDARD_WIDTHS.find((w) => w >= widthMm) || COMPENDIO_STANDARD_WIDTHS[0];
      setWidthMm(closestW);
    }
  };

  const handleCreate = async () => {
    if (readOnly || busy || !canCreate) return;
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const config = {
        ...COMPENDIO_DEFAULT_CONFIG,
        surfaceCategory: isCurva2 || isCurva60a75 ? 'Superficies orgánicas' : surfaceCategory,
        surfaceType: isCurva2 ? 'Curva de 60 a 75 - 2' : isCurva60a75 ? 'Curva de 60 a 75' : surfaceType,
        modoEspecial,
        inverted: isCurva60a75 || isCurva2 ? inverted : false,
        widthMm,
        depthMm: isCurva2 ? depthMm : isCurva60a75 ? 750 : depthMm,
        thickMm: COMPENDIO_DIMENSIONS.surfaceThicknessMm,
        supportHeightMm: COMPENDIO_DIMENSIONS.supportHeightMm,
      };

      const result = await threeApiRef.current?.addCompendio?.(config);
      if (result && result.success === false) {
        throw new Error(result.reason || 'No se pudo crear la superficie Compendio.');
      }
      setMessage(`Superficie ${surfaceType} creada.`);
    } catch (err) {
      setError(err.message || 'Error al crear la superficie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Compendio · superficies</h3>

      <div style={sectionStyle}>
        {/* Selector de Tipo de superficie (Categorías principales, orgánicas, esquineras) */}
        <label style={labelStyle}>
          Tipo de superficie
          <select
            style={inputStyle}
            disabled={readOnly || busy}
            value={surfaceCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {COMPENDIO_SURFACE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>

        {isPrincipales && (
          <>
            {/* Selector de Figura dentro de Superficies principales */}
            <label style={labelStyle}>
              Figura
              <select
                style={inputStyle}
                disabled={readOnly || busy}
                value={surfaceType}
                onChange={(e) => handleSurfaceTypeChange(e.target.value)}
              >
                {COMPENDIO_PRINCIPAL_SURFACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Checkbox Medida Especial (solo para Rectangular) */}
            {isRectangular && (
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={modoEspecial}
                  onChange={(e) => handleModoEspecialToggle(e.target.checked)}
                  disabled={readOnly || busy}
                />
                {' '}Medida especial
              </label>
            )}

            {/* Largo */}
            <label style={labelStyle}>
              Largo
              <select
                style={inputStyle}
                disabled={readOnly || busy}
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value))}
              >
                {widthOptions.map((w) => (
                  <option key={w} value={w}>
                    {modoEspecial ? `${w} mm` : `${w / 10} cm`}
                  </option>
                ))}
              </select>
            </label>

            {/* Ancho */}
            <label style={labelStyle}>
              Ancho
              <select
                style={inputStyle}
                disabled={readOnly || busy}
                value={depthMm}
                onChange={(e) => setDepthMm(Number(e.target.value))}
              >
                {depthOptions.map((d) => (
                  <option key={d} value={d}>
                    {d / 10} cm
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {isOrganicas && (
          <>
            {/* Selector de Figura dentro de Superficies orgánicas */}
            <label style={labelStyle}>
              Figura
              <select
                style={inputStyle}
                disabled={readOnly || busy}
                value={surfaceType}
                onChange={(e) => handleSurfaceTypeChange(e.target.value)}
              >
                {COMPENDIO_ORGANICAS_SURFACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Largo para superficies orgánicas */}
            <label style={labelStyle}>
              Largo
              <select
                style={inputStyle}
                disabled={readOnly || busy}
                value={widthMm}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
              >
                {widthOptions.map((w) => (
                  <option key={w} value={w}>
                    {w / 10} cm
                  </option>
                ))}
              </select>
            </label>

            {/* Checkbox Invertir figura */}
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={inverted}
                onChange={(e) => setInverted(e.target.checked)}
                disabled={readOnly || busy}
              />
              {' '}Invertir figura
            </label>

            {/* Ancho para Curva 2 */}
            {isCurva2 && (
              <label style={labelStyle}>
                Ancho
                <select
                  style={inputStyle}
                  disabled={readOnly || busy || widthMm !== 1500}
                  value={depthMm}
                  onChange={(e) => setDepthMm(Number(e.target.value))}
                >
                  <option value={900}>
                    {inverted ? '75 a 90 cm (Izq. 75 / Der. 90)' : '90 a 75 cm (Izq. 90 / Der. 75)'}
                  </option>
                  {widthMm === 1500 && (
                    <option value={1200}>
                      {inverted ? '75 a 120 cm (Izq. 75 / Der. 120)' : '120 a 75 cm (Izq. 120 / Der. 75)'}
                    </option>
                  )}
                </select>
              </label>
            )}

            {/* Ancho para Curva 60 a 75 */}
            {isCurva60a75 && (
              <label style={labelStyle}>
                Ancho
                <select
                  style={inputStyle}
                  disabled
                  value={inverted ? '60_75' : '75_60'}
                  onChange={() => {}}
                >
                  <option value={inverted ? '60_75' : '75_60'}>
                    {inverted ? '60 a 75 cm (Izq. 60 / Der. 75)' : '75 a 60 cm (Izq. 75 / Der. 60)'}
                  </option>
                </select>
              </label>
            )}
          </>
        )}

        {isEsquineras && (
          <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>
            Superficies esquineras Compendio (en preparación).
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Selecciona una pieza en el puesto para aplicar sus acabados desde Propiedades.
      </div>

      {/* Botón de creación con el estilo exacto de Link */}
      <button
        type="button"
        disabled={readOnly || busy || !canCreate}
        onClick={handleCreate}
        style={{
          ...btnStyle,
          opacity: readOnly || busy || !canCreate ? 0.6 : 1,
          cursor: readOnly || busy || !canCreate ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? 'Creando…' : 'Crear superficie Compendio'}
      </button>

      {message && <div role="status" style={{ fontSize: 12, color: '#065f46' }}>{message}</div>}
      {error && <div role="alert" style={{ fontSize: 12, color: '#b91c1c' }}>{error}</div>}
    </div>
  );
}

export default CompendioPanel;
