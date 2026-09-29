import { MULTIPLE_TILE_TYPES, MULTIPLE_TILE_TYPE_KEYS } from '../catalog/multipleTileCatalog.js';
import { MULTIPLE_FINISH_CATALOG, isMultipleFinishAllowed } from '../catalog/multipleFinishCatalog.js';
import { validateMultipleComposition } from '../rules/multipleCompositionRules.js';
import { removeMultipleConfigurationSlot } from '../configurator/multipleConfigurationState.js';

export default function MultipleCompositionEditor({ config, onChange, disabled = false }) {
  const composition = config.composition; const slots = composition?.slots || [];
  const validation = validateMultipleComposition(config, composition);
  const updateSlots = (next) => { const normalized = next.map((slot, index) => ({ ...slot, index, slotKey: slot.slotKey || `slot-${Date.now()}-${index}`, componentKey: slot.componentKey || `tile-${Date.now()}-${index}` }));
    const retained = new Set(normalized.map((slot) => slot.componentKey)); const removed = new Set(slots.filter((slot) => !retained.has(slot.componentKey)).map((slot) => slot.componentKey));
    const components = Object.fromEntries(Object.entries(config.components || {}).filter(([key]) => !removed.has(key)));
    onChange({ ...config, components, composition: { ...composition, slots: normalized } }); };
  const updateSlot = (index, patch) => updateSlots(slots.map((slot, i) => i === index ? { ...slot, ...patch, codigoPT: null, reference: null, commercialStatus: 'PENDING' } : slot));
  const changeMaterial = (index, slot, tileType) => { const nextTile = MULTIPLE_TILE_TYPES[tileType]; const componentKey = slot.componentKey || `tile-${index}`;
    const currentFinish = config.components?.[componentKey]?.finish || null; const compatible = isMultipleFinishAllowed(nextTile.materialRole, currentFinish);
    const finish = compatible ? currentFinish : (MULTIPLE_FINISH_CATALOG[nextTile.materialRole]?.[0]?.id || null);
    const diagnostics = compatible ? (config.diagnostics || []) : [...(config.diagnostics || []), { code: 'MULTIPLE_FINISH_RESET_FOR_MATERIAL', level: 'INFO', componentKey, previousFinish: currentFinish, finish }];
    const nextSlots = slots.map((item, i) => i === index ? { ...item, tileType, variant: nextTile.variants?.[0] || null, codigoPT: null, reference: null, commercialStatus: 'PENDING' } : item);
    const normalized = nextSlots.map((item, i) => ({ ...item, index: i }));
    onChange({ ...config, diagnostics, components: { ...(config.components || {}), [componentKey]: { ...(config.components?.[componentKey] || {}), finish } }, composition: { ...composition, slots: normalized } }); };
  const field = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'center' };
  return <div style={{ display: 'grid', gap: 8 }}>
    <b>Composición vertical</b>
    {[...slots].reverse().map((slot, reverseIndex) => { const index = slots.length - reverseIndex - 1; const tile = MULTIPLE_TILE_TYPES[slot.tileType] || MULTIPLE_TILE_TYPES.FORMICA;
      const finishKey = tile.materialRole; const componentKey = slot.componentKey || `tile-${index}`; const finish = config.components?.[componentKey]?.finish || '';
      return <div key={slot.slotKey} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
        <div style={field}><select disabled={disabled} value={slot.tileType} onChange={(e) => changeMaterial(index, slot, e.target.value)}>{MULTIPLE_TILE_TYPE_KEYS.map((value) => <option key={value}>{value}</option>)}</select>
          <select disabled={disabled} value={slot.heightCm} onChange={(e) => updateSlot(index, { heightCm: Number(e.target.value) })}>{tile.heightsCm.map((value) => <option key={value} value={value}>{value * 10} mm</option>)}</select></div>
        {!!tile.variants?.length && <label style={{ ...field, marginTop: 6 }}>Gama / variante<select disabled={disabled} value={slot.variant || tile.variants[0]} onChange={(e) => updateSlot(index, { variant: e.target.value })}>{tile.variants.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></label>}
        <div style={{ ...field, marginTop: 6 }}><select disabled={disabled} value={finish} onChange={(e) => onChange({ ...config, components: { ...(config.components || {}), [componentKey]: { ...(config.components?.[componentKey] || {}), finish: e.target.value || null } } })}><option value="">Acabado predeterminado</option>{(MULTIPLE_FINISH_CATALOG[finishKey] || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          <button type="button" disabled={disabled || slots.length <= 1} onClick={() => onChange(removeMultipleConfigurationSlot(config, componentKey))}>Eliminar</button></div>
      </div>; })}
    <button type="button" disabled={disabled} onClick={() => updateSlots([...slots, { slotKey: `slot-${Date.now()}`, type: 'TILE', tileType: 'FORMICA', heightCm: 20 }])}>+ Agregar módulo</button>
    <div style={{ color: validation.valid ? '#18794e' : '#9a6700', fontSize: 12 }}>{validation.valid ? '✓ Configuración disponible' : `⚠ ${validation.diagnostics[0]?.code || 'MULTIPLE_CONFIGURATION_NOT_SUPPORTED'}`}</div>
    <div style={{ fontSize: 11, opacity: 0.7 }}>{validation.occupiedCm * 10} / {validation.availableCm * 10} mm</div>
  </div>;
}
