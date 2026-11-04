// src/components/properties/compendioProperties/CompendioProperties.jsx
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
  COMPENDIO_ORGANICA_CURVA_2_DEPTHS_FOR_1500,
  COMPENDIO_ORGANICA_CURVA_2_DEPTHS_DEFAULT,
  COMPENDIO_SPECIAL_WIDTHS,
  COMPENDIO_DEPTHS,
  isCompendioCurva2,
  isCompendioCurva60a75,
} from '../../../mepal/compendio/definitions/compendioDefaults.js';
import { inputStyle, labelStyle, sectionStyle } from '../shared/PropertyStyles.js';

export default function CompendioProperties({ part, api, readOnly = false }) {
  if (part?.kind !== 'COMPENDIO_PRODUCT') return null;

  const currentConfig = part.config || {};
  const [surfaceCategory, setSurfaceCategory] = useState(
    currentConfig.surfaceCategory || 'Superficies principales'
  );
  const [surfaceType, setSurfaceType] = useState(currentConfig.surfaceType || 'Rectangular');
  const [modoEspecial, setModoEspecial] = useState(Boolean(currentConfig.modoEspecial));
  const [inverted, setInverted] = useState(Boolean(currentConfig.inverted));
  const [widthMm, setWidthMm] = useState(currentConfig.widthMm || 600);
  const [depthMm, setDepthMm] = useState(currentConfig.depthMm || 600);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const c = part?.config || {};
    setSurfaceCategory(c.surfaceCategory || 'Superficies principales');
    setSurfaceType(c.surfaceType || 'Rectangular');
    setModoEspecial(Boolean(c.modoEspecial));
    setInverted(Boolean(c.inverted));
    setWidthMm(c.widthMm || 600);
    setDepthMm(c.depthMm || 600);
  }, [part?.config]);

  const isPrincipales = surfaceCategory === 'Superficies principales';
  const isOrganicas = surfaceCategory === 'Superficies orgánicas';
  const isEsquineras = surfaceCategory === 'Superficies esquineras';

  const isRectangular = isPrincipales && surfaceType === 'Rectangular';
  const isEnP = isPrincipales && surfaceType === 'En P';
  const isEnD = isPrincipales && surfaceType === 'En D';
  const isCurva60a75 = isCompendioCurva60a75(surfaceType);
  const isCurva2 = isCompendioCurva2(surfaceType);

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

  async function applyChange(patch) {
    if (readOnly || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api?.updateSelectedCompendio?.(patch);
      if (!result?.success) {
        throw new Error(result?.reason || 'No se pudo actualizar la superficie.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleCategoryChange = (newCat) => {
    setSurfaceCategory(newCat);
    if (newCat === 'Superficies principales') {
      setSurfaceType('Rectangular');
      setModoEspecial(false);
      setWidthMm(600);
      setDepthMm(600);
      applyChange({
        surfaceCategory: newCat,
        surfaceType: 'Rectangular',
        modoEspecial: false,
        widthMm: 600,
        depthMm: 600,
      });
    } else if (newCat === 'Superficies orgánicas') {
      setSurfaceType('Curva de 60 a 75');
      setModoEspecial(false);
      setWidthMm(600);
      setDepthMm(750);
      applyChange({
        surfaceCategory: newCat,
        surfaceType: 'Curva de 60 a 75',
        modoEspecial: false,
        widthMm: 600,
        depthMm: 750,
      });
    } else {
      applyChange({ surfaceCategory: newCat });
    }
  };

  const handleModoEspecialToggle = (checked) => {
    setModoEspecial(checked);
    let nextWidth = widthMm;
    if (!checked) {
      nextWidth =
        COMPENDIO_STANDARD_WIDTHS.find((w) => w >= widthMm) || COMPENDIO_STANDARD_WIDTHS[0];
      setWidthMm(nextWidth);
    }
    applyChange({ modoEspecial: checked, widthMm: nextWidth });
  };

  const handleInvertedToggle = (checked) => {
    setInverted(checked);
    applyChange({ inverted: checked });
  };

  const handleWidthChange = (val) => {
    const num = Number(val);
    setWidthMm(num);
    if (isCurva2 && num !== 1500 && depthMm === 1200) {
      setDepthMm(900);
      applyChange({ widthMm: num, depthMm: 900 });
    } else {
      applyChange({ widthMm: num });
    }
  };

  const handleDepthChange = (val) => {
    const num = Number(val);
    setDepthMm(num);
    applyChange({ depthMm: num });
  };

  const handleTypeChange = (val) => {
    setSurfaceType(val);
    if (isCompendioCurva2(val)) {
      setSurfaceCategory('Superficies orgánicas');
      setModoEspecial(false);
      const nextW = COMPENDIO_ORGANICA_CURVA_2_WIDTHS.includes(widthMm) ? widthMm : 1500;
      const nextD = nextW === 1500 && depthMm === 1200 ? 1200 : 900;
      setWidthMm(nextW);
      setDepthMm(nextD);
      applyChange({
        surfaceCategory: 'Superficies orgánicas',
        surfaceType: 'Curva de 60 a 75 - 2',
        modoEspecial: false,
        widthMm: nextW,
        depthMm: nextD,
      });
    } else if (isCompendioCurva60a75(val)) {
      setSurfaceCategory('Superficies orgánicas');
      setModoEspecial(false);
      const nextW = COMPENDIO_ORGANICA_CURVA_60_75_WIDTHS.includes(widthMm) ? widthMm : 600;
      setWidthMm(nextW);
      setDepthMm(750);
      applyChange({
        surfaceCategory: 'Superficies orgánicas',
        surfaceType: 'Curva de 60 a 75',
        modoEspecial: false,
        widthMm: nextW,
        depthMm: 750,
      });
    } else if (val === 'En D') {
      setSurfaceCategory('Superficies principales');
      setModoEspecial(false);
      const nextW = COMPENDIO_EN_D_WIDTHS.includes(widthMm) ? widthMm : 900;
      setWidthMm(nextW);
      applyChange({ surfaceCategory: 'Superficies principales', surfaceType: val, modoEspecial: false, widthMm: nextW });
    } else if (val === 'En P') {
      setSurfaceCategory('Superficies principales');
      setModoEspecial(false);
      const nextW = COMPENDIO_EN_P_WIDTHS.includes(widthMm) ? widthMm : 1200;
      setWidthMm(nextW);
      applyChange({ surfaceCategory: 'Superficies principales', surfaceType: val, modoEspecial: false, widthMm: nextW });
    } else if (val === 'Rectangular') {
      setSurfaceCategory('Superficies principales');
      const nextW = COMPENDIO_STANDARD_WIDTHS.includes(widthMm) ? widthMm : 600;
      setWidthMm(nextW);
      applyChange({ surfaceCategory: 'Superficies principales', surfaceType: val, widthMm: nextW });
    } else {
      applyChange({ surfaceType: val });
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1f2937' }}>
        Superficies · Compendio
      </div>

      {/* Tipo de superficie (Categorías) */}
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
          {/* Figura dentro de Superficies principales */}
          <label style={labelStyle}>
            Figura
            <select
              style={inputStyle}
              disabled={readOnly || busy}
              value={surfaceType}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {COMPENDIO_PRINCIPAL_SURFACE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {isRectangular && (
            <label style={labelStyle}>
              <input
                type="checkbox"
                disabled={readOnly || busy}
                checked={modoEspecial}
                onChange={(e) => handleModoEspecialToggle(e.target.checked)}
              />{' '}
              Medida especial
            </label>
          )}

          <label style={labelStyle}>
            Largo
            <select
              style={inputStyle}
              disabled={readOnly || busy}
              value={widthMm}
              onChange={(e) => handleWidthChange(e.target.value)}
            >
              {widthOptions.map((w) => (
                <option key={w} value={w}>
                  {modoEspecial ? `${w} mm` : `${w / 10} cm`}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Ancho
            <select
              style={inputStyle}
              disabled={readOnly || busy}
              value={depthMm}
              onChange={(e) => handleDepthChange(e.target.value)}
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
          {/* Figura dentro de Superficies orgánicas */}
          <label style={labelStyle}>
            Figura
            <select
              style={inputStyle}
              disabled={readOnly || busy}
              value={surfaceType}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {COMPENDIO_ORGANICAS_SURFACE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Largo
            <select
              style={inputStyle}
              disabled={readOnly || busy}
              value={widthMm}
              onChange={(e) => handleWidthChange(e.target.value)}
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
              disabled={readOnly || busy}
              checked={inverted}
              onChange={(e) => handleInvertedToggle(e.target.checked)}
            />{' '}
            Invertir figura
          </label>

          {/* Ancho para Curva 2 */}
          {isCurva2 && (
            <label style={labelStyle}>
              Ancho
              <select
                style={inputStyle}
                disabled={readOnly || busy || widthMm !== 1500}
                value={depthMm}
                onChange={(e) => handleDepthChange(e.target.value)}
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

      {error && (
        <div role="alert" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
