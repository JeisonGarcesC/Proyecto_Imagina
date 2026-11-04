import { useEffect, useState } from 'react';
import { changePickListEditorField, initialPickListEditorState } from './pickListAutofill.js';

export default function PickListEditor({ item = null, onSave, onCancel, tipologias = [], catalogByCode, country = 'CO', title = 'Agregar código manual' }) {
  const [state, setState] = useState(() => initialPickListEditorState(item));
  const { form } = state;
  const [error, setError] = useState('');
  useEffect(() => {
    setState(initialPickListEditorState(item));
    setError('');
  }, [item]);
  const change = (key) => (event) => setState((current) => changePickListEditorField(current, key, event.target.value, catalogByCode, country));
  const submit = (event) => {
    event.preventDefault();
    try {
      onSave(form);
      setError('');
    } catch (cause) { setError(cause.message); }
  };
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 9, padding: 12, border: '1px solid #d8dee8', borderRadius: 9, background: '#fff' }}>
      <strong>{title}</strong>
      <label>Código *<input autoFocus value={form.codigo} onChange={change('codigo')} required style={{ width: '100%' }} /></label>
      <label>Descripción *<input value={form.descripcion} onChange={change('descripcion')} required style={{ width: '100%' }} /></label>
      <label>Cantidad<input type="number" min="0.000001" step="any" value={form.cantidad} onChange={change('cantidad')} style={{ width: '100%' }} /></label>
      <label>Precio<input type="number" min="0" step="any" value={form.precio} onChange={change('precio')} placeholder="Precio no disponible" style={{ width: '100%' }} /></label>
      <label>Tipología<select value={form.tipologia} onChange={change('tipologia')} style={{ width: '100%' }}>
        <option value="">Sin tipología</option>
        {tipologias.map((key) => <option key={key} value={key}>Tipología - {key}</option>)}
      </select></label>
      {error && <div role="alert" style={{ color: '#a62020', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit">{item ? 'Guardar' : 'Agregar'}</button>
      </div>
    </form>
  );
}
