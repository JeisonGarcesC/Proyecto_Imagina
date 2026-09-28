import { useMemo, useState } from 'react';
import { MULTIPLE_HALF_HEIGHTS_CM, MULTIPLE_HALF_WIDTHS_CM } from '../mepal/multiple/catalog/multipleFrameCatalog.js';
import { MultipleComposition } from '../mepal/multiple/definitions/MultipleComposition.js';
import { configureMultiple } from '../mepal/multiple/configurator/multipleConfigurator.js';
import MultipleCompositionEditor from '../mepal/multiple/ui/MultipleCompositionEditor.jsx';
import MultipleQuotationPanel from '../mepal/multiple/ui/MultipleQuotationPanel.jsx';
import { buildMultiple } from '../mepal/multiple/builders/MultipleBuilder.js';
import MultipleSystemEditor from '../mepal/multiple/system/MultipleSystemEditor.jsx';

const initial = () => ({ widthCm: 90, heightCm: 90, thicknessCm: 8, frameMode: 'HALF_HEIGHT', components: {}, composition: MultipleComposition.documented(90).toJSON() });
export default function MultiplePanel({ threeApiRef, readOnly }) {
  const [config, setConfig] = useState(initial); const [mode, setMode] = useState('STANDARD');
  const [section, setSection] = useState('CONFIGURE');
  const result = useMemo(() => configureMultiple(config), [config]);
  const product = useMemo(() => { if (!result.success) return null; try { return buildMultiple(result.config); } catch { return null; } }, [result]);
  const selectedSystem = threeApiRef.current?.getActivePart?.()?.userData?.kind === 'MULTIPLE_SYSTEM' ? threeApiRef.current.getActivePart() : null;
  const setDimension = (patch) => { const next = { ...config, ...patch };
    if (!Number.isFinite(next.widthCm) || !Number.isFinite(next.heightCm)) return;
    next.composition = MultipleComposition.documented(next.heightCm).toJSON(); next.door = null; next.growth = null; setMode('STANDARD'); setConfig(next); };
  const preset = (nextMode) => { setMode(nextMode); if (nextMode === 'DOOR') setConfig({ ...config, widthCm: 90, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' }, growth: null, composition: null });
    else if (nextMode === 'GROWTH') setConfig({ ...config, heightCm: 204, door: null, growth: { enabled: true, targetHeightCm: 242 }, composition: MultipleComposition.documented(204).toJSON() });
    else if (nextMode === 'CUSTOM') setConfig({ ...config, door: null, growth: null, composition: config.door?.enabled ? MultipleComposition.documented(config.heightCm).toJSON() : config.composition });
    else setConfig({ ...config, door: null, growth: null, composition: MultipleComposition.documented(config.heightCm).toJSON() }); };
  const create = () => { const resolved = configureMultiple(config); if (resolved.success) threeApiRef.current?.addMultiple?.(resolved.config); };
  const button = (active) => ({ padding: 8, borderRadius: 7, border: '1px solid #ddd', background: active ? '#273444' : '#fff', color: active ? '#fff' : '#222' });
  return <div style={{ padding: 12, display: 'grid', gap: 10 }}><h3 style={{ margin: 0 }}>MULTIPLE</h3>
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><button onClick={() => setSection('CONFIGURE')}>Configurar solución</button><button onClick={() => setSection('SYSTEM')}>Sistema de oficina</button><button onClick={() => setSection('SUMMARY')}>Ver resumen comercial</button><button onClick={() => setSection('QUOTATION')}>Generar cotización</button></div>
    {section === 'SYSTEM' ? <MultipleSystemEditor disabled={readOnly} initialValue={selectedSystem ? { kind: 'MULTIPLE_SYSTEM', systemId: selectedSystem.userData.systemId, modules: selectedSystem.userData.modules, connections: selectedSystem.userData.connections } : null} onCreate={(system) => selectedSystem ? threeApiRef.current?.updateSelectedMultipleSystem?.(system) : threeApiRef.current?.addMultipleSystem?.(system)}/>
    : section !== 'CONFIGURE' ? <MultipleQuotationPanel product={product} mode={section}/> : <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}><button style={button(mode === 'STANDARD')} onClick={() => preset('STANDARD')}>Panel estándar</button><button style={button(mode === 'DOOR')} onClick={() => preset('DOOR')}>Panel con puerta</button><button style={button(mode === 'GROWTH')} onClick={() => preset('GROWTH')}>Panel con crecimiento</button><button style={button(mode === 'CUSTOM')} onClick={() => preset('CUSTOM')}>Configurar composición</button></div>
    <label>Frente <select value={config.widthCm} disabled={mode === 'DOOR'} onChange={(e) => setDimension({ widthCm: Number(e.target.value) })}>{MULTIPLE_HALF_WIDTHS_CM.map((v) => <option key={v} value={v}>{v} cm</option>)}</select></label>
    <label>Altura <select value={config.heightCm} disabled={mode === 'GROWTH'} onChange={(e) => setDimension({ heightCm: Number(e.target.value) })}>{MULTIPLE_HALF_HEIGHTS_CM.map((v) => <option key={v} value={v}>{v} cm</option>)}</select></label>
    {mode === 'CUSTOM' && <MultipleCompositionEditor config={config} onChange={setConfig} disabled={readOnly}/>} 
    {mode !== 'CUSTOM' && <div style={{ color: result.success ? '#18794e' : '#9a6700', fontSize: 12 }}>{result.success ? '✓ Configuración disponible' : `⚠ ${result.diagnostics[0]?.code || 'MULTIPLE_CONFIGURATION_NOT_SUPPORTED'}`}</div>}
    <button disabled={readOnly || !result.success} onClick={create}>Crear solución MULTIPLE</button></>}
  </div>;
}
