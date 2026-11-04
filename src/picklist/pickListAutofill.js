import { resolveCatalogCommercialFields } from '../catalog/resolveCatalogCommercialFields.js';

export function initialPickListEditorState(item = null) {
  return {
    form: item
      ? { codigo: item.codigo, descripcion: item.descripcion, cantidad: String(item.cantidad), precio: item.precio == null ? '' : String(item.precio), tipologia: item.tipologiaKey || '' }
      : { codigo: '', descripcion: '', cantidad: '1', precio: '', tipologia: '' },
    origin: { descripcion: item?.descripcion ? 'manual' : null, precio: item?.precio != null ? 'manual' : null },
  };
}

export function changePickListEditorField(state, field, value, catalogByCode, country) {
  if (field !== 'codigo') {
    return {
      form: { ...state.form, [field]: value },
      origin: field === 'descripcion' || field === 'precio'
        ? { ...state.origin, [field]: 'manual' } : state.origin,
    };
  }
  if (value === state.form.codigo) return state;
  const commercial = resolveCatalogCommercialFields(value, catalogByCode, country);
  const form = { ...state.form, codigo: value };
  const origin = { ...state.origin };
  for (const name of ['descripcion', 'precio']) {
    const catalogValue = name === 'descripcion' ? commercial.description : commercial.price;
    form[name] = commercial.found && catalogValue != null ? String(catalogValue) : '';
    origin[name] = commercial.found && form[name] ? 'catalog' : null;
  }
  return { form, origin };
}
