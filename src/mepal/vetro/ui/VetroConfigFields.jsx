import { VETRO_PANEL_HEIGHTS_CM, VETRO_PANEL_MATERIALS, VETRO_PANEL_WIDTHS } from '../catalog/panelCatalog.js';
import { VETRO_DOOR_LEAF_HEIGHTS_CM, VETRO_DOOR_LEAF_VARIANTS } from '../catalog/doorLeafCatalog.js';
import { VETRO_DOOR_FRAME_VARIANTS, VETRO_PROFILE_FINISHES } from '../catalog/doorFrameCatalog.js';
import { VETRO_JUNCTION_KIT_CATALOG } from '../catalog/junctionKitCatalog.js';
import { VETRO_PROFILE_CODE_CATALOG } from '../catalog/profileCatalog.js';
import { VETRO_ACCESSORY_CATALOG } from '../catalog/accessoryCatalog.js';

const SECTIONS = [
  ['PANEL', 'PANELES'],
  ['DOOR_LEAF', 'PUERTAS - NAVE PUERTA'],
  ['DOOR_FRAME', 'PUERTAS - MARCO PUERTA'],
  ['JUNCTION_KIT', 'KITS DE UNION'],
  ['PROFILE_VERTICAL', 'PERFILES - VERTICALES'],
  ['PROFILE_HORIZONTAL', 'PERFILES - HORIZONTALES'],
  ['ACCESSORY', 'ACCESORIOS'],
];
const unique = (values) => [...new Set(values)];
const options = (values, suffix = ' cm') => values.map((value) => ({ value, label: String(value) + suffix }));

function Select({ label, value, items, onChange, disabled }) {
  return <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
    <b>{label}</b>
    <select value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {items.map((item) => {
        const option = typeof item === 'object' ? item : { value: item, label: String(item) };
        return <option key={String(option.value)} value={option.value}>{option.label}</option>;
      })}
    </select>
  </label>;
}

export default function VetroConfigFields({ section, config, onSectionChange, onChange, disabled = false }) {
  const patch = (next) => onChange?.({ ...config, ...next });
  let fields;

  if (section === 'PANEL') {
    fields = <>
      <Select label="Material del panel" value={config.material} disabled={disabled}
        items={Object.entries(VETRO_PANEL_MATERIALS).map(([value, item]) => ({ value, label: item.label }))}
        onChange={(material) => patch({ material })} />
      <Select label="Ancho nominal" value={config.nominalWidthCm} disabled={disabled}
        items={VETRO_PANEL_WIDTHS.map((item) => ({ value: item.nominalCm, label: item.nominalCm + ' cm (real ' + item.realCm + ' cm)' }))}
        onChange={(value) => patch({ nominalWidthCm: Number(value) })} />
      <Select label="Altura comercial" value={config.nominalHeightCm} disabled={disabled}
        items={options(VETRO_PANEL_HEIGHTS_CM)}
        onChange={(value) => patch({ nominalHeightCm: Number(value) })} />
    </>;
  } else if (section === 'DOOR_LEAF') {
    fields = <>
      <Select label="Tipo de nave" value={config.variant} disabled={disabled}
        items={Object.entries(VETRO_DOOR_LEAF_VARIANTS).map(([value, item]) => ({ value, label: item.label }))}
        onChange={(variant) => patch({ variant })} />
      <Select label="Altura comercial" value={config.nominalHeightCm} disabled={disabled}
        items={options(VETRO_DOOR_LEAF_HEIGHTS_CM)}
        onChange={(value) => patch({ nominalHeightCm: Number(value) })} />
    </>;
  } else if (section === 'DOOR_FRAME') {
    fields = <>
      <Select label="Tipo de marco" value={config.variant} disabled={disabled}
        items={Object.entries(VETRO_DOOR_FRAME_VARIANTS).map(([value, item]) => ({ value, label: item.label }))}
        onChange={(variant) => patch({ variant })} />
      <Select label="Altura comercial" value={config.nominalHeightCm} disabled={disabled}
        items={options(VETRO_DOOR_LEAF_HEIGHTS_CM)}
        onChange={(value) => patch({ nominalHeightCm: Number(value) })} />
      <Select label="Acabado de perfileria" value={config.finish} disabled={disabled}
        items={Object.entries(VETRO_PROFILE_FINISHES).map(([value, label]) => ({ value, label }))}
        onChange={(finish) => patch({ finish })} />
    </>;
  } else if (section === 'JUNCTION_KIT' || section === 'ACCESSORY') {
    const catalog = section === 'JUNCTION_KIT' ? VETRO_JUNCTION_KIT_CATALOG : VETRO_ACCESSORY_CATALOG;
    fields = <Select label={section === 'JUNCTION_KIT' ? 'Kit' : 'Accesorio'} value={config.variant} disabled={disabled}
      items={catalog.map((item) => ({ value: item.variant, label: item.label }))}
      onChange={(variant) => patch({ variant })} />;
  } else {
    const subcategory = section === 'PROFILE_VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
    const catalog = VETRO_PROFILE_CODE_CATALOG.filter((item) => item.subcategory === subcategory);
    const variants = unique(catalog.map((item) => item.variant));
    const variantRows = catalog.filter((item) => item.variant === config.variant);
    const lengths = unique(variantRows.map((item) => item.nominalLengthCm));
    const lengthRows = variantRows.filter((item) => item.nominalLengthCm === Number(config.nominalLengthCm));
    const finishes = unique(lengthRows.map((item) => item.finish)).filter(Boolean);
    fields = <>
      <Select label="Perfil" value={config.variant} disabled={disabled}
        items={variants.map((variant) => ({ value: variant, label: catalog.find((item) => item.variant === variant)?.label || variant }))}
        onChange={(variant) => {
          const first = catalog.find((item) => item.variant === variant);
          patch({ variant, nominalLengthCm: first.nominalLengthCm, finish: first.finish });
        }} />
      <Select label="Longitud nominal" value={config.nominalLengthCm} disabled={disabled}
        items={options(lengths)}
        onChange={(value) => {
          const nominalLengthCm = Number(value);
          const rows = variantRows.filter((item) => item.nominalLengthCm === nominalLengthCm);
          patch({ nominalLengthCm, finish: rows.some((item) => item.finish === config.finish) ? config.finish : rows[0]?.finish ?? null });
        }} />
      {finishes.length > 0 && <Select label="Acabado de perfileria" value={config.finish} disabled={disabled}
        items={finishes.map((finish) => ({ value: finish, label: VETRO_PROFILE_FINISHES[finish] }))}
        onChange={(finish) => patch({ finish })} />}
    </>;
  }

  return <div style={{ display: 'grid', gap: 10 }}>
    <Select label="Categoria VETRO" value={section} disabled={disabled}
      items={SECTIONS.map(([value, label]) => ({ value, label }))} onChange={onSectionChange} />
    {fields}
  </div>;
}
