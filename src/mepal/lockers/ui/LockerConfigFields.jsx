import { commercialOptions, LOCKER_COLUMNS, lockerCategories } from '../catalog/lockerCatalog.js';
import { getLockerFinishOptionsForMaterial } from '../catalog/lockerFinishCatalog.js';

export default function LockerConfigFields({
  config: c,
  onChange,
  category,
  onCategoryChange,
  disabled,
}) {
  const change = (key, value) => onChange({ ...c, [key]: value });
  const changeLockerType = (value) => {
    const validWidths = commercialOptions.widthsMm[value] || [];
    const widthMm = validWidths.includes(c.widthMm) ? c.widthMm : (validWidths[0] ?? c.widthMm);
    onChange({ ...c, lockerType: value, widthMm });
  };
  const select = (label, key, values, numeric = false) => (
    <label style={{ display: 'grid', gap: 4 }} key={key}>
      {label}
      <select
        value={c[key]}
        disabled={disabled}
        onChange={(e) => change(key, numeric ? Number(e.target.value) : e.target.value)}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {String(v).replaceAll('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
  const toggle = (label, key) => (
    <label>
      <input
        type="checkbox"
        checked={c[key]}
        disabled={disabled}
        onChange={(e) => change(key, e.target.checked)}
      />{' '}
      {label}
    </label>
  );
  const finishOptions = getLockerFinishOptionsForMaterial(c.material);
  const updateFinishSelection = (key, finishId) => {
    const next = { ...c, [key]: finishId };
    if (key === 'bodyFinishId') {
      next.bodyFinishId = finishId;
      next.bodyFinishCode = finishId ? `${finishId}`.replace(/_/g, '_') : '';
      next.bodyFinish = c.bodyFinish || '#9ca3af';
    }
    if (key === 'bayFinishIds') {
      const nextIds = [...(c.bayFinishIds || [])];
      nextIds[0] = finishId;
      next.bayFinishIds = nextIds;
      next.bayFinishCodes = nextIds.map((id) => (id ? `${id}`.replace(/_/g, '_') : ''));
    }
    onChange(next);
  };
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label>
        Categoría{' '}
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {lockerCategories.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {category === 'BODY' && (
        <>
          {/*select('Calibre', 'calibre', [22, 24], true)*/}
          {select('Calibre', 'calibre', [22], true)}
          <label style={{ display: 'grid', gap: 4 }}>
            Coraza
            <select
              value={c.lockerType}
              disabled={disabled}
              onChange={(e) => changeLockerType(e.target.value)}
            >
              {Object.keys(LOCKER_COLUMNS).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {select('Altura nominal (mm)', 'heightMm', commercialOptions.heightsMm, true)}
          {select(
            'Ancho nominal (mm)',
            'widthMm',
            [...new Set([c.widthMm, ...commercialOptions.widthsMm[c.lockerType]])],
            true
          )}
          {select('Profundidad nominal (mm)', 'depthMm', commercialOptions.depthsMm, true)}
          {select(
            'Acabado de coraza',
            'bodyFinishId',
            finishOptions.map((option) => option.id)
          )}
          <small>
            El acabado se resuelve por catálogo y código del proyecto, no por color aislado.
          </small>
        </>
      )}
      {category === 'BAYS' && (
        <>
          {select('Naves en altura por columna', 'bayCount', [1, 2, 3, 4], true)}
          {select('Material / modalidad', 'material', [
            'METALICA',
            'METALICA_EMBEBIDA',
            'FORMICA',
            'MELAMINA',
          ])}
          {select('Troquelado', 'punchingType', [
            'LISO',
            'TIPO_1',
            'TIPO_2',
            'TIPO_3',
            'TIPO_4',
            'NO_APLICA',
          ])}
          {select('Posición del troquelado', 'punchingPosition', [
            'NO_APLICA',
            'ARRIBA',
            'ABAJO',
            'ARRIBA_Y_ABAJO',
          ])}
          {Array.from({ length: LOCKER_COLUMNS[c.lockerType] * c.bayCount }, (_, i) => (
            <label key={i}>
              Nave {i + 1} · acabado
              <select
                value={c.bayFinishIds?.[i] || c.bodyFinishId || finishOptions[0]?.id}
                disabled={disabled}
                onChange={(e) => {
                  const nextIds = [...(c.bayFinishIds || [])];
                  nextIds[i] = e.target.value;
                  const next = {
                    ...c,
                    bayFinishIds: nextIds,
                    bayFinishCodes: nextIds.map((id) => (id ? `${id}`.replace(/_/g, '_') : '')),
                  };
                  onChange(next);
                }}
              >
                {finishOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <small>
            Numeración: de abajo hacia arriba, columna izquierda primero. Los acabados se resuelven
            con catálogo y finishCode del proyecto.
          </small>
        </>
      )}
      {category === 'SHELVES' && (
        <>
          <div>
            Incluidos en el kit: {(c.bayCount - 1) * LOCKER_COLUMNS[c.lockerType]} entrepaños
            separadores.
          </div>
          {toggle('Entrepaño interno adicional por nave (según Excel)', 'extraShelves')}
        </>
      )}
      {category === 'PLINTH' && (
        <>
          {toggle('Zócalo de 100 mm', 'plinth')}
          <small>Se agrega bajo la coraza, conservando su altura comercial.</small>
        </>
      )}
      {category === 'HANDLES' &&
        select('Manija', 'handleType', ['EMBEBIDA', 'BOTON', 'SCHWINN', 'INCRUSTAR', 'SIN_MANIJA'])}
      {category === 'SECURITY' &&
        select('Seguridad', 'securityType', [
          'CERRADURA',
          'PORTACANDADO',
          'CLAVE_4_DIGITOS',
          'NO_APLICA',
          'ARMSTRONG',
          'TIMBERLINE',
        ])}
      {category === 'ACCESSORIES' && (
        <>
          {toggle('Visor acrílico', 'viewer')}
          {toggle('Kit anclaje (código pendiente)', 'anchor')}
        </>
      )}
    </div>
  );
}
