import { MULTIPLE_HALF_HEIGHTS_CM, MULTIPLE_HALF_WIDTHS_CM } from '../catalog/multipleFrameCatalog.js';
import { MULTIPLE_TILE_TYPE_KEYS } from '../catalog/multipleTileCatalog.js';
import { MULTIPLE_FINISH_CATALOG } from '../catalog/multipleFinishCatalog.js';
import { MULTIPLE_DOOR_HEIGHTS_CM, MULTIPLE_GROWTH_TARGETS_CM, MULTIPLE_COLUMN_TYPES } from '../catalog/multiplePhase2Catalog.js';
export default function MultipleProperties({ part, api }) {
  if (part?.kind !== 'MULTIPLE_PRODUCT') return null; const config = part.config || {}; const component = part.multiple?.component;
  const finishes = MULTIPLE_FINISH_CATALOG[component?.materialRole] || [];
  const field = { display: 'grid', gap: 4, marginTop: 10, fontSize: 12, fontWeight: 700 };
  const update = (patch) => api?.updateSelectedMultiple?.(patch);
  const doorEnabled = config.door?.enabled === true; const growthEnabled = config.growth?.enabled === true;
  return <div style={{ marginTop: 12, borderTop: '1px solid #ddd', paddingTop: 10 }}><b>MULTIPLE · Marco panel</b>
    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800 }}>Configuración del sistema</div>
    <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>Composición: {(config.composition?.slots || []).map((slot) => `${slot.tileType || slot.type} ${Number(slot.heightCm) * 10} mm`).join(' · ')}</div>
    {!!component && <><div style={{ marginTop: 10, fontSize: 12, fontWeight: 800 }}>Configuración del componente</div><div style={{ marginTop: 6, padding: 8, background: '#f5f5f5', fontSize: 12, lineHeight: 1.5 }}>
      <div><b>Componente:</b> {component.description || component.componentRole}</div>
      <div><b>Referencia:</b> {component.reference || 'No documentada'}</div>
      <div><b>Código PT:</b> {component.codigoPT || 'Pendiente'}</div>
      <div><b>Material:</b> {component.materialRole || 'No documentado'}</div>
      <div><b>Acabado:</b> {component.finishId || 'Predeterminado'}</div>
      {component.commercialStatus === 'PENDING' && <div style={{ color: '#8a5a00' }}>Código comercial no documentado para esta configuración.</div>}
    </div></>}
    <label style={field}>Frente<select value={config.widthCm} disabled={doorEnabled} onChange={(e) => update({ widthCm: Number(e.target.value) })}>{MULTIPLE_HALF_WIDTHS_CM.map((v) => <option key={v}>{v}</option>)}</select></label>
    <label style={field}>Altura<select value={config.heightCm} onChange={(e) => { const heightCm = Number(e.target.value); update({ heightCm, frameMode: heightCm > 204 ? 'FLOOR_TO_CEILING' : 'HALF_HEIGHT', composition: null }); }}>{(doorEnabled ? MULTIPLE_DOOR_HEIGHTS_CM : MULTIPLE_HALF_HEIGHTS_CM).map((v) => <option key={v}>{v}</option>)}</select></label>
    <label style={field}><span><input type="checkbox" checked={doorEnabled} onChange={(e) => update(e.target.checked ? { widthCm: 90, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' }, growth: null, composition: null } : { door: null, frameMode: 'HALF_HEIGHT', heightCm: 90, composition: null })}/> Incluir puerta</span></label>
    {doorEnabled && <><label style={field}>Sentido<select value={config.door?.swing || 'RIGHT'} onChange={(e) => update({ door: { ...config.door, swing: e.target.value } })}><option value="RIGHT">Derecha</option><option value="LEFT">Izquierda</option></select></label>
      <label style={field}>Hoja<select value={config.door?.material || 'FORMICA'} onChange={(e) => update({ door: { ...config.door, material: e.target.value } })}><option value="FORMICA">Fórmica</option><option value="GLASS">Vidrio</option></select></label></>}
    {!doorEnabled && config.heightCm === 204 && <label style={field}><span><input type="checkbox" checked={growthEnabled} onChange={(e) => update({ growth: e.target.checked ? { enabled: true, targetHeightCm: 242 } : null })}/> Crecimiento vertical</span></label>}
    {growthEnabled && <label style={field}>Altura final<select value={config.growth.targetHeightCm} onChange={(e) => update({ growth: { ...config.growth, targetHeightCm: Number(e.target.value) } })}>{MULTIPLE_GROWTH_TARGETS_CM.map((v) => <option key={v}>{v}</option>)}</select></label>}
    <label style={field}>Columna<select value={config.columns?.[0]?.type || ''} onChange={(e) => update({ columns: e.target.value ? [{ componentKey: 'column-0', type: e.target.value, side: 'RIGHT' }] : [] })}><option value="">Sin columna</option>{MULTIPLE_COLUMN_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
    {!doorEnabled && config.heightCm === 128 && <label style={field}><span><input type="checkbox" checked={config.cableTray?.enabled === true} onChange={(e) => update({ cableTray: e.target.checked ? { enabled: true, side: 'RIGHT' } : null })}/> Llegada a pared con canaleta</span></label>}
    {component?.componentRole?.startsWith('TILE_') && <label style={field}>Tipo de baldosa<select value={component.tileType} onChange={(e) => api?.updateSelectedMultipleComponent?.(component.componentKey, { tileType: e.target.value })}>{MULTIPLE_TILE_TYPE_KEYS.map((v) => <option key={v}>{v}</option>)}</select></label>}
    {!!component && !!finishes.length && <label style={field}>Acabado<select value={component.finishId || ''} onChange={(e) => api?.updateSelectedMultipleComponent?.(component.componentKey, { finish: e.target.value || null })}><option value="">Predeterminado</option>{finishes.map((finish) => <option key={finish.id} value={finish.id}>{finish.label}</option>)}</select></label>}
  </div>;
}
