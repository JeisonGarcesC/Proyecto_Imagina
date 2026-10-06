import { useEffect, useState } from 'react';
import { CRITTERIUM8_CODED_FRAME_WIDTHS_CM, CRITTERIUM8_HALF_HEIGHTS_CM,
  CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM } from '../mepal/critterium8/catalog/frameCatalog.js';
import { defaultCritteriumSequenceDraft, validateCritteriumSequenceDraft, validateCritteriumSystemDraft } from '../mepal/critterium8/integration/critterium8Configurator.js';
import { CRITTERIUM_OFFICE_TEMPLATES, createCritteriumOfficeSequenceDraft } from '../mepal/critterium8/integration/critteriumOfficeTemplates.js';
import { loadCritteriumPriceCatalog } from '../mepal/critterium8/commercial/critteriumPriceCatalog.js';
import { buildCritteriumQuotation, exportCritteriumQuotationJson } from '../mepal/critterium8/commercial/critteriumQuotation.js';
import { describeCritteriumDiagnostic } from '../mepal/critterium8/ui/critteriumDiagnostics.js';

const field = { width: '100%', boxSizing: 'border-box', padding: '7px', borderRadius: 6, border: '1px solid #cbd5e1' };
const button = { ...field, cursor: 'pointer', background: '#eef3f8', textAlign: 'left', marginTop: 6 };
const clone = (value) => structuredClone(value);

function SequenceDraft({ value, onChange, title }) {
  const updateFrame = (index, patch) => onChange({ ...value, frames: value.frames.map((frame, current) => current === index ? { ...frame, ...patch } : frame) });
  const check = validateCritteriumSequenceDraft(value);
  return <div style={{ display: 'grid', gap: 8 }}>
    <strong>{title}</strong>
    <label>Cantidad de frames
      <select style={field} value={value.frames.length} onChange={(event) => {
        const count = Number(event.target.value);
        onChange({ ...value, frames: Array.from({ length: count }, (_, index) => clone(value.frames[index] || value.frames.at(-1))) });
      }}>{[2, 3, 4, 5, 6].map((count) => <option key={count}>{count}</option>)}</select>
    </label>
    <label>Orientación
      <select style={field} value={value.orientationDeg} onChange={(event) => onChange({ ...value, orientationDeg: Number(event.target.value) })}>
        {[0, 90, 180, 270].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}
      </select>
    </label>
    {value.frames.map((frame, index) => <details key={index} open={index === 0}>
      <summary>Frame {index + 1}: {frame.widthCm} × {frame.heightCm} cm</summary>
      <label>Ancho
        <select style={field} value={frame.widthCm} onChange={(event) => updateFrame(index, { widthCm: Number(event.target.value) })}>
          {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((width) => <option key={width}>{width}</option>)}
        </select>
      </label>
      <label>Altura
        <select style={field} value={frame.heightCm} onChange={(event) => updateFrame(index, { heightCm: Number(event.target.value) })}>
          {CRITTERIUM8_HALF_HEIGHTS_CM.map((height) => <option key={height}>{height}</option>)}
        </select>
      </label>
      <label>Composición
        <select style={field} value={frame.compositionMode} onChange={(event) => updateFrame(index, { compositionMode: event.target.value })}>
          <option value="MODULAR">Modular</option><option value="FULL_TILE">Panel completo</option>
        </select>
      </label>
    </details>)}
    <div style={{ fontSize: 12, color: check.success ? '#166534' : '#b91c1c' }}>
      {check.success ? `Configuración válida · ${check.junctionCount} encuentros previstos` : `${check.field || 'Configuración'}: ${check.reason}`}
    </div>
    {check.success && <div style={{ fontSize: 12, color: '#475569' }}>
      {check.frames.map((frame, index) => <div key={index}>Frame {index + 1}: {frame.widthCm} × {frame.heightCm} cm · {frame.compositionMode}</div>)}
    </div>}
  </div>;
}

export default function CriteriumPanel({ threeApiRef, onCreateFrame, readOnly, selectedPart, historyRevision, catalogItems = [], country = 'CO' }) {
  const [mode, setMode] = useState('SYSTEM');
  const [frameWidth, setFrameWidth] = useState(90);
  const [frameHeight, setFrameHeight] = useState(128);
  const [draft, setDraft] = useState(defaultCritteriumSequenceDraft);
  const [systemDrafts, setSystemDrafts] = useState([defaultCritteriumSequenceDraft()]);
  const [newSequenceDraft, setNewSequenceDraft] = useState(defaultCritteriumSequenceDraft);
  const [templateKey, setTemplateKey] = useState('TWO_MODULES');
  const [officeSummary, setOfficeSummary] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [quotationBusy, setQuotationBusy] = useState(false);
  const [spatialTopology, setSpatialTopology] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [structure, setStructure] = useState({ sequences: [], systems: [] });
  const [selectedExisting, setSelectedExisting] = useState([]);
  const [systemId, setSystemId] = useState('');
  const [sourceSequenceId, setSourceSequenceId] = useState('');
  const [targetSequenceId, setTargetSequenceId] = useState('');
  const [layoutGapCm, setLayoutGapCm] = useState(5);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => setStructure(threeApiRef.current?.getCritteriumStructure?.() || { sequences: [], systems: [] });
  useEffect(() => {
    const selectedSystemId = selectedPart?.critteriumSystem?.systemId;
    const selectedSequenceId = selectedPart?.critterium8Sequence?.sequenceId;
    if (!selectedSystemId && !selectedSequenceId) return;
    const next = threeApiRef.current?.getCritteriumStructure?.();
    if (!next) return;
    setStructure(next);
    const parentSystemId = next.sequences.find((item) => item.sequenceId === selectedSequenceId)?.parentSystemId;
    if (selectedSystemId || parentSystemId) setSystemId(selectedSystemId || parentSystemId);
  }, [selectedPart, threeApiRef]);
  useEffect(() => {
    if (!historyRevision) return;
    setStructure(threeApiRef.current?.getCritteriumStructure?.() || { sequences: [], systems: [] });
    setOfficeSummary(null);
    setQuotation(null);
  }, [historyRevision, threeApiRef]);
  useEffect(() => { setQuotation(null); }, [country, catalogItems]);
  useEffect(() => { setQuotation(null); }, [selectedPart]);
  const run = async (callback) => {
    if (readOnly || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await callback();
      setMessage(result?.success === false ? `${result.field || 'Configuración'}: ${describeCritteriumDiagnostic(result.reason)}` : 'Operación realizada.');
      if (result?.system?.userData?.systemId) setSystemId(result.system.userData.systemId);
      setOfficeSummary(null);
      setQuotation(null);
      refresh();
    } catch (error) { setMessage(describeCritteriumDiagnostic(error.message)); }
    finally { setBusy(false); }
  };
  const currentSystem = structure.systems.find((item) => item.systemId === systemId);
  useEffect(() => {
    setSpatialTopology(systemId && currentSystem
      ? threeApiRef.current?.getCritteriumSpatialTopology?.(systemId) || null : null);
  }, [systemId, currentSystem, threeApiRef]);
  const selectedConnection = spatialTopology?.spatialConnections?.find((item) => item.connectionId === selectedConnectionId);
  const showQuotation = async () => {
    if (!systemId || quotationBusy) return;
    setQuotationBusy(true);
    try {
      const summary = threeApiRef.current?.getCritteriumOfficeSummary?.(systemId);
      if (!summary?.success) throw new Error(summary?.reason || 'CRITERIUM_SYSTEM_NOT_FOUND');
      const topology = threeApiRef.current?.getCritteriumSpatialTopology?.(systemId);
      let priceCatalog;
      let catalogError = null;
      try { priceCatalog = await loadCritteriumPriceCatalog(country); }
      catch (error) { catalogError = error.message; priceCatalog = null; }
      const quote = buildCritteriumQuotation({ systemId, bom: summary,
        catalogByCode: new Map(catalogItems.map((item) => [String(item.codigoPT), item])),
        priceCatalog, previousSnapshot: summary.commercialSnapshot,
        generatedAt: new Date().toISOString(),
        office: { ...summary, lengthM: topology?.totalLengthM ?? null,
          closedLoopCount: topology?.closedLoops?.length || 0,
          doorCount: summary.rows.filter((row) => /puerta/i.test(row.description || '')).reduce((sum, row) => sum + Number(row.qty || 0), 0) } });
      if (catalogError) quote.diagnostics.push({ code: 'PRICE_SOURCE_UNAVAILABLE', cause: catalogError });
      threeApiRef.current?.recordCritteriumCommercialSnapshot?.(systemId, quote.snapshot);
      setQuotation(quote);
      setOfficeSummary(summary);
      setMessage('');
    } catch (error) { setMessage(error.message); }
    finally { setQuotationBusy(false); }
  };
  const exportQuotation = () => {
    if (!quotation || quotation.systemId !== systemId) return;
    const blob = new Blob([exportCritteriumQuotationJson(quotation)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `critterium-cotizacion-${systemId}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
    <h3 style={{ margin: 0 }}>CRITERIUM 8</h3>
    <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
      {['FRAME', 'SEQUENCE', 'SYSTEM'].map((value) => <button key={value} type="button" style={{ ...button, textAlign: 'center', background: mode === value ? '#dbeafe' : '#eef3f8' }} onClick={() => { setMode(value); refresh(); }}>
        {value === 'FRAME' ? 'Frame' : value === 'SEQUENCE' ? 'Secuencia' : 'Sistema'}
      </button>)}
    </nav>
    {mode === 'FRAME' && <section style={{ display: 'grid', gap: 8 }}>
      <label>Ancho (cm)<select style={field} value={frameWidth} onChange={(event) => setFrameWidth(Number(event.target.value))}>
        {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Altura (cm)<select style={field} value={frameHeight} onChange={(event) => setFrameHeight(Number(event.target.value))}>
        {CRITTERIUM8_HALF_HEIGHTS_CM.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(async () => ({ success: Boolean(await onCreateFrame?.({ widthCm: frameWidth, heightCm: frameHeight, compositionMode: 'MODULAR' })) }))}>Crear frame</button>
    </section>}
    {mode === 'SEQUENCE' && <section>
      <SequenceDraft value={draft} onChange={setDraft} title="Configurar secuencia" />
      <button type="button" style={button} disabled={readOnly || busy || !validateCritteriumSequenceDraft(draft).success} onClick={() => run(() => threeApiRef.current?.createConfiguredCritteriumSequence?.(draft))}>Crear secuencia</button>
    </section>}
    {mode === 'SYSTEM' && <section style={{ display: 'grid', gap: 8 }}>
      <strong>Nuevo sistema de oficina</strong>
      <label>Plantilla
        <select style={field} value={templateKey} onChange={(event) => {
          const key = event.target.value;
          setTemplateKey(key);
          if (key === 'TWO_MODULES' || key === 'THREE_MODULES') {
            setSystemDrafts([createCritteriumOfficeSequenceDraft(key === 'TWO_MODULES' ? 2 : 3)]);
            setActiveIndex(0);
          }
        }}>
          {CRITTERIUM_OFFICE_TEMPLATES.map((template) => <option key={template.key} value={template.key} disabled={!template.available}>
            {template.label}{template.available ? '' : ' (no disponible)'}
          </option>)}
        </select>
      </label>
      {templateKey === 'EMPTY_SYSTEM' && <div style={{ fontSize: 12 }}>Esta plantilla crea una oficina sin secuencias. Usa «Crear oficina vacía».</div>}
      <div style={{ fontSize: 12, color: '#475569' }}>Un módulo aislado puede crearse como frame; una secuencia requiere al menos dos frames conectados.</div>
      <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.createCritteriumSystemFromSequenceIds?.([]))}>Crear oficina vacía</button>
      <strong>Sistema con secuencias configuradas</strong>
      <select style={field} value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>
        {systemDrafts.map((_, index) => <option key={index} value={index}>Secuencia {index + 1}</option>)}
      </select>
      <SequenceDraft value={systemDrafts[activeIndex]} onChange={(next) => setSystemDrafts((items) => items.map((item, index) => index === activeIndex ? next : item))} title={`Secuencia ${activeIndex + 1}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        <button type="button" style={button} onClick={() => { setSystemDrafts((items) => [...items, defaultCritteriumSequenceDraft()]); setActiveIndex(systemDrafts.length); }}>Agregar</button>
        <button type="button" style={button} onClick={() => { setSystemDrafts((items) => [...items, clone(items[activeIndex])]); setActiveIndex(systemDrafts.length); }}>Duplicar</button>
        <button type="button" style={button} disabled={systemDrafts.length === 1} onClick={() => { setSystemDrafts((items) => items.filter((_, index) => index !== activeIndex)); setActiveIndex(0); }}>Eliminar</button>
      </div>
      <div style={{ fontSize: 12 }}>{systemDrafts.length} secuencias · disposición en filas separadas</div>
      <button type="button" style={button} disabled={readOnly || busy || !validateCritteriumSystemDraft(systemDrafts).success} onClick={() => run(() => threeApiRef.current?.createConfiguredCritteriumSystem?.(systemDrafts))}>Crear sistema con {systemDrafts.length} secuencia(s)</button>
      <details onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
        <summary>Crear desde secuencias existentes</summary>
        {structure.sequences.filter((item) => !item.parentSystemId).map((item) => <label key={item.sequenceId} style={{ display: 'block', fontSize: 12 }}>
          <input type="checkbox" checked={selectedExisting.includes(item.sequenceId)} onChange={(event) => setSelectedExisting((ids) => event.target.checked ? [...ids, item.sequenceId] : ids.filter((id) => id !== item.sequenceId))} /> {item.sequenceId} · {item.frameCount} frames
        </label>)}
        <button type="button" style={button} disabled={readOnly || busy || !selectedExisting.length} onClick={() => run(() => threeApiRef.current?.createCritteriumSystemFromSequenceIds?.(selectedExisting))}>Crear desde selección</button>
      </details>
    </section>}
    <details onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
      <summary>Elementos existentes</summary>
      {structure.sequences.map((item) => <button key={item.sequenceId} type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSequenceById?.(item.sequenceId)}>
        Secuencia {item.sequenceId} · {item.frameCount} frames
      </button>)}
      {structure.systems.map((item) => <button key={item.systemId} type="button" style={button} onClick={() => { setSystemId(item.systemId); threeApiRef.current?.selectCritteriumSystemById?.(item.systemId); }}>
        Sistema {item.systemId} · {item.sequenceIds.length} secuencias
      </button>)}
    </details>
    <details onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
      <summary>Slots / módulos</summary>
      {structure.sequences.map((sequence) => <section key={sequence.sequenceId} style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        <strong>Secuencia {sequence.sequenceId} · {sequence.slots?.length || 0} módulos</strong>
        {(sequence.diagnostics || []).map((diagnostic, index) =>
          <div key={`${diagnostic.code}-${index}`} style={{ color: '#b91c1c', fontSize: 12 }}>
            {describeCritteriumDiagnostic(diagnostic)}: {diagnostic.frameId}
          </div>)}
        {(sequence.slots || []).map((slot, index) => <div key={slot.slotId} style={{ border: '1px solid #d7dee8', padding: 6, fontSize: 12,
          background: selectedPart?.critterium8?.instanceId === slot.frameInstanceId ? '#dbeafe' : 'transparent' }}>
          <div>Slot {index + 1} · {slot.status === 'MISSING_FRAME' ? 'Frame faltante' : `Frame ${slot.widthCm} cm`}</div>
          <button type="button" style={button} disabled={!slot.frameInstanceId} onClick={() => threeApiRef.current?.selectCritteriumFrameByInstanceId?.(slot.frameInstanceId)}>Seleccionar frame del módulo</button>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button type="button" style={button} disabled={readOnly || busy || index === 0} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'REORDER', { slotId: slot.slotId, index: index - 1 }))}>↑</button>
            <button type="button" style={button} disabled={readOnly || busy || index === sequence.slots.length - 1} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'REORDER', { slotId: slot.slotId, index: index + 1 }))}>↓</button>
            <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'INSERT', { index, slotId: slot.slotId }))}>Insertar</button>
            <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'DUPLICATE', { slotId: slot.slotId }))}>Duplicar</button>
            <button type="button" style={button} disabled={readOnly || busy || sequence.slots.length <= 2} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'REMOVE', { slotId: slot.slotId }))}>Reducir: eliminar</button>
          </div>
          <label>Ancho comercial (cm)
            <select style={field} value={slot.widthCm} disabled={readOnly || busy} onChange={(event) => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'CONFIGURE', { slotId: slot.slotId, widthCm: Number(event.target.value) }))}>
              {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>Tipo de frame
            <select style={field} value={slot.frameMode || 'HALF_HEIGHT'} disabled={readOnly || busy} onChange={(event) => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'CONFIGURE', { slotId: slot.slotId, configPatch: event.target.value === 'FLOOR_TO_CEILING'
              ? { frameMode: 'FLOOR_TO_CEILING', heightCm: 204, projectHeightCm: CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM[0] }
              : { frameMode: 'HALF_HEIGHT', heightCm: 128, projectHeightCm: 128 } }))}>
              <option value="HALF_HEIGHT">Media altura</option>
              <option value="FLOOR_TO_CEILING">Piso a techo</option>
            </select>
          </label>
          <label>Altura comercial (cm)
            <select style={field} value={slot.heightCm} disabled={readOnly || busy} onChange={(event) => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'CONFIGURE', { slotId: slot.slotId,
              configPatch: slot.frameMode === 'FLOOR_TO_CEILING'
                ? { projectHeightCm: Number(event.target.value) }
                : { heightCm: Number(event.target.value), projectHeightCm: Number(event.target.value) } }))}>
              {(slot.frameMode === 'FLOOR_TO_CEILING' ? CRITTERIUM8_FLOOR_TO_CEILING_HEIGHTS_CM : CRITTERIUM8_HALF_HEIGHTS_CM)
                .map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>)}
        <button type="button" style={button} disabled={readOnly || busy || !sequence.slots?.length} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'ADD'))}>Crecer: agregar módulo</button>
        <button type="button" style={button} disabled={readOnly || busy || !sequence.slots?.length} onClick={() => run(() => threeApiRef.current?.editCritteriumSequenceSlot?.(sequence.sequenceId, 'ORGANIZE'))}>Organizar módulos</button>
      </section>)}
    </details>
    {currentSystem && <details open>
      <summary>Editar sistema seleccionado</summary>
      <details>
        <summary>Comercial · BOM y cotización</summary>
        <button type="button" style={button} onClick={() => setOfficeSummary(threeApiRef.current?.getCritteriumOfficeSummary?.(systemId) || null)}>Ver BOM</button>
        <button type="button" style={button} onClick={() => {
          setOfficeSummary(threeApiRef.current?.getCritteriumOfficeSummary?.(systemId) || null);
          setSpatialTopology(threeApiRef.current?.getCritteriumSpatialTopology?.(systemId) || null);
        }}>Ver resumen</button>
        <button type="button" style={button} disabled={quotationBusy} onClick={showQuotation}>{quotationBusy ? 'Calculando cotización...' : 'Cotización'}</button>
        <button type="button" style={button} disabled={!quotation || quotation.systemId !== systemId} onClick={exportQuotation}>Exportar JSON comercial</button>
        {officeSummary?.systemId === systemId && <div style={{ fontSize: 12 }}>
          <div>Secuencias: {officeSummary.sequenceCount} · Módulos/frames: {officeSummary.moduleCount} · Puertas en BOM: {officeSummary.rows.filter((row) => /puerta/i.test(row.description || '')).reduce((sum, row) => sum + Number(row.qty || 0), 0)} · Conexiones: {officeSummary.connectionCount}</div>
          <div>Longitud: {spatialTopology?.totalLengthM?.toFixed(2) ?? '—'} m · Recintos: {spatialTopology?.closedLoops?.length || 0}</div>
          <details><summary>Vista previa de composición</summary>
            {currentSystem.sequenceIds.map((id) => <div key={id}>Secuencia {id} · {structure.sequences.find((item) => item.sequenceId === id)?.slots?.length || 0} módulos</div>)}
            {(currentSystem.connections || []).map((item) => <div key={item.connectionId}>Conexión {item.type}: {item.sourceSequenceId} ↔ {item.targetSequenceId}</div>)}
          </details>
        </div>}
        {quotation?.systemId === systemId && <div style={{ fontSize: 12, overflowX: 'auto' }}>
          <strong>{quotation.status === 'CONFIGURATION_COMPLETE' ? 'Precios de componentes completos' : 'Cotización parcial'}</strong>
          <div>Referencias: {quotation.office.referenceCount} · Componentes: {quotation.office.componentCount} · Con precio: {quotation.office.pricedCount} · Sin precio: {quotation.office.unpricedCount}</div>
          <table style={{ width: '100%', fontSize: 11 }}><thead><tr>
            <th>Código</th><th>Referencia</th><th>Descripción</th><th>Cant.</th><th>Material</th><th>Acabado</th><th>Precio unit.</th><th>Subtotal</th>
          </tr></thead><tbody>{quotation.items.map((item, index) => <tr key={`${item.code || 'none'}-${index}`}>
            <td>{item.code || 'Sin código'}</td><td>{item.reference || '—'}</td>
            <td>{item.description}</td><td>{item.quantity}</td>
            <td>{item.materialCommercial || 'No documentado'}</td>
            <td>{item.finishCommercial ? `${item.finishCommercial} (SIN VALIDAR)` : 'SIN DATOS DE ACABADO'}</td>
            <td>{item.unitPrice == null ? item.commercialStatus : item.unitPrice}</td>
            <td>{item.subtotal == null ? '—' : item.subtotal}</td>
          </tr>)}</tbody></table>
          <div>Subtotal: {quotation.subtotal} {quotation.currency || 'CURRENCY_UNCONFIRMED'}</div>
          <div>Total {quotation.isPartial ? 'parcial' : ''}: {quotation.total} {quotation.currency || 'CURRENCY_UNCONFIRMED'}</div>
          {quotation.diagnostics.map((item, index) => <div key={index} style={{ color: item.level === 'INFO' ? '#475569' : '#b91c1c' }}>{describeCritteriumDiagnostic(item)}</div>)}
        </div>}
      </details>
      <button type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSystemById?.(systemId)}>Seleccionar sistema</button>
      <strong>Agregar secuencia nueva</strong>
      <SequenceDraft value={newSequenceDraft} onChange={setNewSequenceDraft} title="Nueva secuencia" />
      <button type="button" style={button} disabled={readOnly || busy || !validateCritteriumSequenceDraft(newSequenceDraft).success} onClick={() => run(() => threeApiRef.current?.createCritteriumSequenceInSystem?.(systemId, newSequenceDraft))}>Crear y agregar al sistema</button>
      <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.duplicateCritteriumSystemById?.(systemId))}>Duplicar sistema completo</button>
      <button type="button" style={button} onClick={() => setOfficeSummary(threeApiRef.current?.getCritteriumOfficeSummary?.(systemId) || null)}>Ver BOM del sistema</button>
      {officeSummary?.systemId === systemId && <div style={{ fontSize: 12, border: '1px solid #cbd5e1', padding: 8 }}>
        <strong>BOM · {officeSummary.sequenceCount} secuencias · {officeSummary.moduleCount} módulos</strong>
        {(officeSummary.rows || []).map((row, index) => <div key={`${row.code || row.reference || index}-${index}`}>{row.code || row.reference || 'Sin código'} · {row.qty || 0}</div>)}
        {(officeSummary.diagnostics || []).map((item, index) => <div key={index} style={{ color: '#b91c1c' }}>{describeCritteriumDiagnostic(item)}</div>)}
        <div>Códigos y cantidades: disponibles en este BOM. Precios y acabados cotizados: información comercial no disponible en esta vista.</div>
      </div>}
      {currentSystem.sequenceIds.map((id) => <div key={id} style={{ display: 'flex', gap: 4 }}>
        <button type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSequenceById?.(id)}>Secuencia {id}</button>
        <button type="button" style={{ ...button, width: 'auto' }} onClick={() => {
          const frameId = structure.sequences.find((item) => item.sequenceId === id)?.frameInstanceIds?.[0];
          if (frameId) threeApiRef.current?.selectCritteriumFrameByInstanceId?.(frameId);
          setMessage('Edita el frame seleccionado en Properties.');
        }}>Editar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.duplicateCritteriumSystemSequence?.(systemId, id))}>Duplicar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.removeSequenceFromCritteriumSystem?.(systemId, id))}>Quitar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.deleteCritteriumSystemSequence?.(systemId, id))}>Eliminar</button>
      </div>)}
      {structure.sequences.filter((item) => !item.parentSystemId).map((item) => <button key={item.sequenceId} type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.addSequenceToCritteriumSystem?.(systemId, item.sequenceId))}>Agregar {item.sequenceId}</button>)}
      {currentSystem.sequenceIds.length > 1 && <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        <strong>Organización espacial</strong>
        <details>
          <summary>Herramientas espaciales</summary>
          <button type="button" style={button} onClick={() => setSpatialTopology(threeApiRef.current?.getCritteriumSpatialTopology?.(systemId) || null)}>Detectar recinto y medir</button>
          {spatialTopology && <div style={{ fontSize: 12 }}>
            <div>Nodos: {spatialTopology.spatialNodes.length} · Conexiones: {spatialTopology.spatialConnections.length}</div>
            <div>Longitud total aproximada: {spatialTopology.totalLengthM.toFixed(2)} m</div>
            <div>Recinto cerrado: {spatialTopology.closedLoop ? 'Sí' : 'No'}</div>
            {spatialTopology.closedLoops.map((loop, index) => <div key={index}>
              Recinto {index + 1}: {loop.sequenceIds.length} secuencias · área aproximada {loop.areaApproxM2 == null ? 'no calculable' : `${loop.areaApproxM2.toFixed(2)} m²`}
            </div>)}
            {spatialTopology.lengths.map((item) => <div key={item.sequenceId}>
              Secuencia {item.sequenceId}: {item.lengthM == null ? 'sin medida' : `${item.lengthM.toFixed(2)} m`}
            </div>)}
            {spatialTopology.diagnostics.map((item, index) => <div key={index} style={{ color: '#b91c1c' }}>
              {describeCritteriumDiagnostic(item)}: {item.topology || item.nodeId || item.connectionId || `${item.frameAId} ↔ ${item.frameBId}`}
            </div>)}
          </div>}
          <button type="button" style={button} disabled title="Falta un anclaje físico lateral o intermedio documentado en CRITERIUM">T-Junction — No disponible</button>
          <button type="button" style={button} disabled title="Falta un anclaje físico lateral o intermedio documentado en CRITERIUM">Cruce — No disponible</button>
          <div style={{ fontSize: 12, color: '#92400e' }}>UNSUPPORTED_SPATIAL_TOPOLOGY: ninguna pieza CRITERIUM actual documenta el anclaje lateral o intermedio necesario.</div>
        </details>
        <label>Secuencia origen
          <select style={field} value={sourceSequenceId} onChange={(event) => setSourceSequenceId(event.target.value)}>
            <option value="">Seleccionar</option>
            {currentSystem.sequenceIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label>Secuencia destino
          <select style={field} value={targetSequenceId} onChange={(event) => setTargetSequenceId(event.target.value)}>
            <option value="">Seleccionar</option>
            {currentSystem.sequenceIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <button type="button" style={button} disabled={readOnly || busy || !sourceSequenceId || !targetSequenceId || sourceSequenceId === targetSequenceId} onClick={() => run(() => threeApiRef.current?.connectCritteriumSequencesById?.(systemId, sourceSequenceId, targetSequenceId))}>Conectar extremos cercanos</button>
        <button type="button" style={button} disabled={readOnly || busy || !sourceSequenceId || !targetSequenceId || sourceSequenceId === targetSequenceId} onClick={() => run(() => threeApiRef.current?.connectCritteriumSequencesById?.(systemId, sourceSequenceId, targetSequenceId, 'DEG_90'))}>Conectar esquina 90°</button>
        {(spatialTopology?.spatialConnections || []).map((connection) => <button key={connection.connectionId} type="button" style={{ ...button, background: selectedConnectionId === connection.connectionId ? '#dbeafe' : button.background }} onClick={() => setSelectedConnectionId(connection.connectionId)}>
          Seleccionar conexión {connection.source} ↔ {connection.target} ({connection.connectionType})
        </button>)}
        {selectedConnection && <div style={{ border: '1px solid #cbd5e1', padding: 8, fontSize: 12 }}>
          <div>Conexión {selectedConnection.connectionId}</div>
          <div>Tipo: {selectedConnection.connectionType}</div>
          <div>Origen: {selectedConnection.source} · destino: {selectedConnection.target}</div>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.disconnectCritteriumSequencesById?.(systemId, selectedConnection.connectionId))}>Eliminar conexión seleccionada</button>
        </div>}
        {(currentSystem.connections || []).map((connection) => <button key={connection.connectionId} type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.disconnectCritteriumSequencesById?.(systemId, connection.connectionId))}>
          Desconectar {connection.sourceSequenceId} ↔ {connection.targetSequenceId} ({connection.type})
        </button>)}
        {(currentSystem.spatialDiagnostics || []).map((diagnostic) => <div key={diagnostic.connectionId} style={{ fontSize: 12, color: '#b91c1c' }}>
          Conexión {diagnostic.connectionId}: {describeCritteriumDiagnostic(diagnostic)}
        </div>)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'HORIZONTAL'))}>Alinear horizontal</button>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'VERTICAL'))}>Alinear vertical</button>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'ENDPOINT'))}>Alinear extremos</button>
          <button type="button" style={button} disabled={readOnly || busy || currentSystem.sequenceIds.length < 3} onClick={() => run(() => threeApiRef.current?.distributeCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'X'))}>Distribuir</button>
        </div>
        <button type="button" style={button} disabled={readOnly || busy || !sourceSequenceId} onClick={() => run(() => threeApiRef.current?.rotateCritteriumSystemSequence?.(systemId, sourceSequenceId, true))}>Rotar origen 90°</button>
        <label>Separación para organizar (cm)
          <input style={field} type="number" min="0" step="1" value={layoutGapCm} onChange={(event) => setLayoutGapCm(Number(event.target.value))} />
        </label>
        <button type="button" style={button} disabled={readOnly || busy || layoutGapCm < 0} onClick={() => run(() => threeApiRef.current?.organizeCritteriumSystem?.(systemId, layoutGapCm / 100))}>Organizar oficina</button>
      </div>}
    </details>}
    {message && <div role="status" style={{ fontSize: 12, color: message.startsWith('Operación') ? '#166534' : '#b91c1c' }}>{message}</div>}
  </div>;
}
