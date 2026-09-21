import { commercialOptions, LOCKER_COLUMNS, lockerCategories } from '../catalog/lockerCatalog.js';

export default function LockerConfigFields({ config: c, onChange, category, onCategoryChange, disabled }) {
  const change = (key, value) => onChange({ ...c, [key]: value });
  const select = (label, key, values, numeric = false) => <label style={{ display: 'grid', gap: 4 }} key={key}>{label}
    <select value={c[key]} disabled={disabled} onChange={e => change(key, numeric ? Number(e.target.value) : e.target.value)}>
      {values.map(v => <option key={v} value={v}>{String(v).replaceAll('_', ' ')}</option>)}
    </select></label>;
  const toggle = (label, key) => <label><input type="checkbox" checked={c[key]} disabled={disabled} onChange={e => change(key, e.target.checked)} /> {label}</label>;
  return <div style={{ display: 'grid', gap: 10 }}>
    <label>Categoría <select value={category} onChange={e => onCategoryChange(e.target.value)}>{lockerCategories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {category === 'BODY' && <>
      {select('Calibre', 'calibre', [22, 24], true)}
      {select('Coraza', 'lockerType', Object.keys(LOCKER_COLUMNS))}
      {select('Altura nominal (mm)', 'heightMm', commercialOptions.heightsMm, true)}
      {select('Ancho nominal (mm)', 'widthMm', [...new Set([c.widthMm, ...commercialOptions.widthsMm[c.lockerType]])], true)}
      {select('Profundidad nominal (mm)', 'depthMm', commercialOptions.depthsMm, true)}
      <label>Acabado visual de coraza <input type="color" value={c.bodyFinish} disabled={disabled} onChange={e => change('bodyFinish', e.target.value)} /></label>
      <small>Las medidas rematadas requieren validar su resolución comercial. No se asignan códigos por proximidad.</small>
    </>}
    {category === 'BAYS' && <>
      {select('Naves en altura por columna', 'bayCount', [1, 2, 3, 4], true)}
      {select('Material / modalidad', 'material', ['METALICA', 'METALICA_EMBEBIDA', 'FORMICA', 'MELAMINA'])}
      {select('Troquelado', 'punchingType', ['LISO', 'TIPO_1', 'TIPO_2', 'TIPO_3', 'TIPO_4', 'NO_APLICA'])}
      {select('Posición del troquelado', 'punchingPosition', ['NO_APLICA', 'ARRIBA', 'ABAJO', 'ARRIBA_Y_ABAJO'])}
      {Array.from({ length: LOCKER_COLUMNS[c.lockerType] * c.bayCount }, (_, i) => <label key={i}>Nave {i + 1} · color visual <input type="color" disabled={disabled} value={c.bayFinishes[i] || (c.material === 'FORMICA' ? '#d6c1a0' : c.material === 'MELAMINA' ? '#eee9e0' : '#9ca3af')} onChange={e => { const finishes = [...c.bayFinishes]; finishes[i] = e.target.value; change('bayFinishes', finishes); }} /></label>)}
      <small>Numeración: de abajo hacia arriba, columna izquierda primero. Los colores son visuales, no códigos de acabado comercial.</small>
    </>}
    {category === 'SHELVES' && <><div>Incluidos en el kit: {(c.bayCount - 1) * LOCKER_COLUMNS[c.lockerType]} entrepaños separadores.</div>{toggle('Entrepaño interno adicional por nave (según Excel)', 'extraShelves')}</>}
    {category === 'PLINTH' && <>{toggle('Zócalo de 100 mm', 'plinth')}<small>Se agrega bajo la coraza, conservando su altura comercial.</small></>}
    {category === 'HANDLES' && select('Manija', 'handleType', ['EMBEBIDA', 'BOTON', 'SCHWINN', 'INCRUSTAR', 'SIN_MANIJA'])}
    {category === 'SECURITY' && select('Seguridad', 'securityType', ['CERRADURA', 'PORTACANDADO', 'CLAVE_4_DIGITOS', 'NO_APLICA', 'ARMSTRONG', 'TIMBERLINE'])}
    {category === 'ACCESSORIES' && <>{toggle('Visor acrílico', 'viewer')}{toggle('Kit anclaje (código pendiente)', 'anchor')}</>}
  </div>;
}
