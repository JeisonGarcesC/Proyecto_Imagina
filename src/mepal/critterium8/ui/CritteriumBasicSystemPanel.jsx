import { useState } from 'react';
import { CRITTERIUM8_HALF_HEIGHTS_CM } from '../catalog/frameCatalog.js';
import { findCritteriumBasicOptions } from '../integration/critteriumBasicSystemPlanner.js';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: 7, border: '1px solid #cbd5e1', borderRadius: 6 };
const labels = { LINE: 'Línea', L: 'L', U: 'U', RECTANGLE: 'Rectángulo' };

export default function CritteriumBasicSystemPanel({ threeApiRef, readOnly, onCreated }) {
  const [shape, setShape] = useState('LINE');
  const [widthMm, setWidthMm] = useState(1800);
  const [depthMm, setDepthMm] = useState(1800);
  const [returnMm, setReturnMm] = useState(1800);
  const [heightCm, setHeightCm] = useState(90);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const invalidate = () => { setOptions([]); setSelected(0); setMessage(''); };
  const dimensions = () => shape === 'LINE' ? [Number(widthMm)]
    : shape === 'U' ? [Number(widthMm), Number(depthMm), Number(returnMm)]
      : [Number(widthMm), Number(depthMm)];
  const calculate = async () => {
    setBusy(true);
    setMessage('');
    setOptions([]);
    try {
      const found = await findCritteriumBasicOptions({ shape, lengthsMm: dimensions(), heightCm });
      setOptions(found);
      setSelected(found.findIndex((option) => option.exact));
      if (!found.length) setMessage('No hay una composición válida con estos módulos y conexiones.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const create = async () => {
    const choice = options[selected];
    if (!choice) return;
    setBusy(true);
    try {
      const result = await threeApiRef.current?.createBasicCritteriumSystem?.(choice.plan);
      if (!result?.success) throw new Error(result?.reason || 'No se pudo crear el sistema.');
      setMessage('Sistema creado.');
      onCreated?.();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const choice = options[selected];
  return (
    <section style={{ display: 'grid', gap: 8, border: '1px solid #cbd5e1', padding: 10, borderRadius: 6 }}>
      <strong>Crear sistema por medidas exteriores</strong>
      <div style={{ fontSize: 12 }}>Indica las medidas exteriores del sistema terminado. Se calcularán los frames y conexiones automáticamente.</div>
      <label>Forma
        <select style={inputStyle} value={shape} onChange={(event) => { setShape(event.target.value); invalidate(); }}>
          {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label>{shape === 'LINE' ? 'Longitud exterior total' : shape === 'L' || shape === 'U' ? 'Longitud exterior del tramo A' : 'Ancho exterior total'} (mm)
        <input style={inputStyle} type="number" min="600" step="1" value={widthMm} onChange={(event) => { setWidthMm(event.target.value); invalidate(); }} />
      </label>
      {shape !== 'LINE' && <label>{shape === 'L' ? 'Longitud exterior del tramo B' : 'Profundidad exterior'} (mm)
        <input style={inputStyle} type="number" min="600" step="1" value={depthMm} onChange={(event) => { setDepthMm(event.target.value); invalidate(); }} />
      </label>}
      {shape === 'U' && <label>Longitud exterior del tramo B (mm)
        <input style={inputStyle} type="number" min="600" step="1" value={returnMm} onChange={(event) => { setReturnMm(event.target.value); invalidate(); }} />
      </label>}
      <label>Altura de frame (cm)
        <select style={inputStyle} value={heightCm} onChange={(event) => { setHeightCm(Number(event.target.value)); invalidate(); }}>
          {CRITTERIUM8_HALF_HEIGHTS_CM.map((height) => <option key={height} value={height}>{height}</option>)}
        </select>
      </label>
      <button type="button" style={inputStyle} disabled={busy || readOnly || Number(widthMm) <= 0 || (shape !== 'LINE' && Number(depthMm) <= 0) || (shape === 'U' && Number(returnMm) <= 0)} onClick={calculate}>
        {busy ? 'Calculando geometría…' : 'Buscar composiciones'}
      </button>
      {options.length > 0 && <div style={{ display: 'grid', gap: 6 }}>
        <strong>{options.some((option) => option.exact) ? 'Medida exacta disponible' : 'No existe coincidencia exacta entre las opciones evaluadas'}</strong>
        {options.map((option, index) => <label key={index} style={{ border: selected === index ? '2px solid #2563eb' : '1px solid #cbd5e1', padding: 6, fontSize: 12 }}>
          <input type="radio" name="critterium-basic-option" checked={selected === index} onChange={() => setSelected(index)} />
          {' '}{option.exact ? 'Exacta' : 'Alternativa'} · exterior real {option.exteriorMm.width.toFixed(1)} × {option.exteriorMm.depth.toFixed(1)} mm
          {(shape === 'L' || shape === 'U') && <div>Tramos exteriores: {option.sideExteriorMm.map((value) => value.toFixed(1)).join(' / ')} mm</div>}
          <div>{option.plan.sides.map((side, sideIndex) => `Lado ${sideIndex + 1}: ${side.draft.frames.map((frame) => frame.widthCm).join(' + ')} cm`).join(' · ')}</div>
          <div>{option.plan.sides.length} secuencia(s) · {option.connectionCount} esquina(s) · {option.closedLoop ? 'Cierre validado' : 'Abierto'}</div>
        </label>)}
      </div>}
      {choice?.commercialCornerWarning && <div role="note" style={{ color: '#92400e', fontSize: 12 }}>
        Advertencia comercial: las conexiones a 90° se registran espacialmente, pero no incorporan una pieza de esquina al BOM. Validar el kit de esquina antes de cotizar.
      </div>}
      {options.length > 0 && !choice && <div style={{ fontSize: 12 }}>Selecciona una alternativa para continuar.</div>}
      {choice && <button type="button" style={inputStyle} disabled={busy || readOnly} onClick={create}>Crear composición seleccionada</button>}
      {options.length > 0 && <button type="button" style={inputStyle} disabled={busy} onClick={invalidate}>Cancelar vista previa</button>}
      {message && <div role="status" style={{ fontSize: 12 }}>{message}</div>}
    </section>
  );
}
