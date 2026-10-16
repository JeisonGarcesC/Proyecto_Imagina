import { useState } from 'react';
import Critterium8FrameProperties from './Critterium8FrameProperties.jsx';
import { CRITTERIUM8_TILE_CATALOG, CRITTERIUM8_TILE_COMMERCIAL_CATALOG } from '../catalog/tileCatalog.js';
import { resolveCritterium8TileCommercial } from '../parts/partCatalog.js';

const sectionStyle = { padding: 12, border: '1px solid #e1e1e1', borderRadius: 10, background: '#fff', display: 'grid', gap: 10 };
const selectStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #d8d8d8', borderRadius: 8, background: '#fff' };
const commercialFields = [
  ['gama', 'Gama'], ['fabricType', 'Tipo de tela'], ['subtype', 'Subtipo'],
  ['metalPattern', 'Patrón'], ['glassType', 'Tipo de vidrio'],
  ['glassThicknessMm', 'Espesor del vidrio'], ['glassColor', 'Color del vidrio'], ['film', 'Película'],
];
const commercialValueLabel = (field, value) => {
  if (field === 'gama') return `Gama ${value}`;
  if (field === 'glassThicknessMm') return `${value} mm`;
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
};

export default function Critterium8Properties({ part, api, readOnly = false }) {
  const context = part?.critterium8;
  const sequence = part?.critterium8Sequence;
  const system = part?.critteriumSystem;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!context && !sequence && !system) return null;
  const { config = {}, composition = {}, editablePart = null } = context || {};

  const run = async (operation) => {
    if (readOnly || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await operation();
      if (!result?.success) setMessage(result?.reason || 'No fue posible actualizar Critterium 8.');
      else if (result.diagnostics?.length) setMessage(result.diagnostics.map((item) => item.code).join(', '));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-shell">
      <div className="pp-header"><p className="pp-title">Critterium 8</p></div>
      {readOnly && <div className="pp-readonly-banner">Modo solo lectura.</div>}
      {system && <div style={sectionStyle}>
        <strong>Sistema de oficina</strong>
        <div>ID: {system.systemId}</div>
        <div>Secuencias: {system.sequenceIds.length}</div>
        <div>Posición: {system.position.map((value) => value.toFixed(2)).join(', ')}</div>
        <div>Rotación: {(system.rotationY * 180 / Math.PI).toFixed(1)}°</div>
        <div>Para agregar o retirar secuencias, usa el panel de CRITERIUM.</div>
      </div>}
      {sequence && (
        <div style={sectionStyle}>
          <strong>FrameSequence</strong>
          <div>ID: {sequence.sequenceId}</div>
          <div>Frames: {sequence.frameIds.length}</div>
          <div>Junctions: {sequence.junctionIds.length}</div>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.rebuildSelectedCritterium8Sequence?.())}>Reconectar secuencia</button>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.dissolveSelectedCritterium8Sequence?.())}>Disolver secuencia</button>
        </div>
      )}
      {!sequence && Array.isArray(part?.selectionTargetIds) && part.selectionTargetIds.length > 1 && (
        <div style={sectionStyle}>
          <strong>FrameSequence</strong>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.createCritterium8SequenceFromSelection?.())}>Crear secuencia</button>
        </div>
      )}
      {context && (
        <>
      <div style={sectionStyle}>
        <strong>Configuración del Frame</strong>
        <Critterium8FrameProperties
          config={config}
          disabled={readOnly || busy}
          onChange={(patch) => run(() => api?.updateSelectedCritterium8?.(patch, context.instanceId))}
        />
      </div>

      <div style={sectionStyle}>
        <strong>{config.compositionMode === 'FULL_TILE' ? 'Baldosa plena' : 'Slots modulares'}</strong>
        {(composition?.tileSlots || []).map((slot) => {
          const focused = editablePart?.partType === 'TILE' && editablePart?.slotId === slot.id;
          const tileType = slot.tile?.tileType || '';
          const options = slot.tile?.commercialOptions || {};
          const rows = CRITTERIUM8_TILE_COMMERCIAL_CATALOG.filter((row) =>
            row.tileType === tileType && row.widthCm === Number(slot.widthCm ?? config.widthCm) && row.heightCm === Number(slot.heightCm)
          );
          const commercial = focused && tileType ? resolveCritterium8TileCommercial({
            tileType, widthCm: slot.widthCm ?? config.widthCm, heightCm: slot.heightCm,
            commercialOptions: options,
          }) : null;
          return (
            <div key={slot.id} style={{ display: 'grid', gap: 8, padding: focused ? 8 : 0, border: focused ? '1px solid #16a34a' : 'none', borderRadius: 8, fontSize: 12 }}>
              <label style={{ display: 'grid', gap: 5 }}>Slot {slot.index + 1} — {slot.heightCm} cm
                <select
                  style={selectStyle}
                  value={tileType}
                  disabled={readOnly || busy}
                  onChange={(event) => run(() => api?.updateSelectedCritterium8Tile?.(slot.id, { tileType: event.target.value }, context.instanceId))}
                >
                  <option value="">Ninguno</option>
                  {(slot.allowedTileTypes || []).map((type) => <option key={type} value={type}>{CRITTERIUM8_TILE_CATALOG[type]?.displayName || type}</option>)}
                </select>
              </label>
              {focused && tileType && <div style={{ display: 'grid', gap: 8 }}>
                {commercialFields.map(([field, label]) => {
                  const values = [...new Set(rows.map((row) => row.criteria[field]).filter((value) => value != null))];
                  if (!values.length || (tileType === 'FORMICA' && field === 'subtype' && values.length === 1)) return null;
                  return <label key={field} style={{ display: 'grid', gap: 5 }}>{label}
                    <select
                      style={selectStyle}
                      value={options[field] ?? ''}
                      disabled={readOnly || busy}
                      onChange={(event) => run(() => api?.updateSelectedCritterium8Tile?.(
                        slot.id,
                        { commercialOptions: { [field]: field === 'glassThicknessMm' && event.target.value ? Number(event.target.value) : event.target.value || null } },
                        context.instanceId
                      ))}
                    >
                      <option value="">Seleccionar</option>
                      {values.map((value) => <option key={value} value={value}>{commercialValueLabel(field, value)}</option>)}
                    </select>
                  </label>;
                })}
                <div><strong>Código comercial:</strong> {commercial?.status === 'RESOLVED' ? commercial.code : 'Pendiente'}</div>
                {commercial?.status !== 'RESOLVED' && <div style={{ color: '#92400e' }}>
                  {commercial?.status === 'AMBIGUOUS' ? 'Configuración comercial ambigua' : 'Configuración comercial pendiente'}
                  {commercial?.diagnostics?.map((item, index) => <div key={`${item.code}-${index}`}>{item.message}</div>)}
                </div>}
              </div>}
            </div>
          );
        })}
      </div>

      {editablePart && editablePart.partType !== 'TILE' && (
        <div style={sectionStyle}>
          <strong>Parte seleccionada</strong>
          <div>Tipo: {editablePart.partType}</div>
          <div>Código: {editablePart.code || 'No documentado'}</div>
          {editablePart.provisionalGeometry && <div style={{ color: '#92400e' }}>Representación provisional</div>}
        </div>
      )}
        </>
      )}
      {message && <div style={{ padding: 10, color: '#92400e', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
