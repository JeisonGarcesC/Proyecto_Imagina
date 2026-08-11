// src/components/PropertiesPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import './PropertiesPanel.css';

import {
  KONCISA_PRIVACY_PANEL_FINISH_OPTIONS,
  getKoncisaPrivacyPanelFinishById,
} from '../mepal/koncisaPlus/rules/koncisaPrivacyPanelFinishOptions';

export default function PropertiesPanel({
  part,
  partAcabado,
  allowedFinishCodes = null, // ✅ NUEVO: array de códigos permitidos o null
  byCode,
  api,
  materials = [],
  materialsByCode,
  readOnly = false,
}) {
  const [applyScope, setApplyScope] = useState('PART'); // PART | GROUP | ALL
  const [finishQuery, setFinishQuery] = useState(''); // 🔎 buscar por código o nombre

  //
  const hasFinishRestriction = Array.isArray(allowedFinishCodes);

  const allowedSet = useMemo(() => {
    if (!hasFinishRestriction) return null;
    return new Set((allowedFinishCodes || []).map((x) => String(x)));
  }, [allowedFinishCodes, hasFinishRestriction]);

  // 1) primero restringe por allowedSet (si existe)
  const scopedMaterials = useMemo(() => {
    const list = materials || [];

    // null/undefined = sin restricción
    if (!hasFinishRestriction) return list;

    // [] = restricción activa pero sin coincidencias => lista vacía
    return list.filter((m) => allowedSet.has(String(m?.code)));
  }, [materials, allowedSet, hasFinishRestriction]);

  // 2) luego aplica búsqueda dentro de ese scope
  const filteredMaterialsAcabado = useMemo(() => {
    const q = (finishQuery || '').trim().toLowerCase();
    if (!q) return scopedMaterials;

    return scopedMaterials.filter((m) => {
      const code = String(m?.code ?? '').toLowerCase();
      const name = String(m?.name ?? '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [scopedMaterials, finishQuery]);

  //

  // (opcional) limpiar búsqueda cuando cambias de parte/subparte
  useEffect(() => {
    // eslint-disable-next-line
    setFinishQuery('');
  }, [part?.code, part?.subKey, part?.activeSubKey, part?.subName]);

  function normalizeGenericos(source, byCodeMap) {
    const code = String(source?.code || '').trim();
    const item = code ? byCodeMap?.get?.(code) || null : null;

    const values = [
      ...(Array.isArray(source?.raw?.genericos) ? source.raw.genericos : []),
      ...(Array.isArray(source?.genericos) ? source.genericos : []),
      source?.raw?.generico ?? null,
      source?.generico ?? null,

      ...(Array.isArray(item?.raw?.genericos) ? item.raw.genericos : []),
      ...(Array.isArray(item?.genericos) ? item.genericos : []),
      item?.raw?.generico ?? null,
      item?.generico ?? null,
    ]
      .map((g) => String(g ?? '').trim())
      .filter(Boolean);

    return [...new Set(values)];
  }

  const partGenericos = useMemo(() => normalizeGenericos(part, byCode), [part, byCode]);
  const partAcabadoGenericos = useMemo(
    () => normalizeGenericos(partAcabado, byCode),
    [partAcabado, byCode]
  );

  const partGenericoText = partGenericos.length ? partGenericos.join(', ') : 'Sin genérico';
  const partAcabadoGenericoText = partAcabadoGenericos.length
    ? partAcabadoGenericos.join(', ')
    : 'Sin genérico Acabado';

  //para poner el acabado por grupos
  const canApplyGroup = !!part?.groupId;

  return (
    <div className="pp-shell">

      <div className="pp-header">
        <p className="pp-title">Propiedades</p>
      </div>

      {readOnly && (
        <div className="pp-readonly-banner">
          Modo solo lectura (Comercial): puedes revisar propiedades y BOM, pero no editar acabados.
        </div>
      )}

      {!part && (
        <div className="pp-empty">Selecciona una pieza para ver y editar sus propiedades.</div>
      )}

      {part && (
        <div className="pp-section">
          {/* Código */}
          <div className="pp-field">
            <span className="pp-field-label">Código:</span> {part.code || '—'}
          </div>

          {/* Genérico */}
          <div className="pp-field">
            <span className="pp-field-label">Genérico:</span>{' '}
            <span style={{ opacity: partGenericos.length ? 1 : 0.5 }}>{partGenericoText}</span>
          </div>
          <div className="pp-field">
            <span className="pp-field-label">Genérico (Acabado):</span>{' '}
            <span style={{ opacity: partAcabadoGenericos.length ? 1 : 0.5 }}>{partAcabadoGenericoText}</span>
          </div>

          {part?.kind === 'EDUK' && part?.edukWidth && (
            <div className="pp-field">
              <span className="pp-field-label">Ancho:</span> {part.edukWidth}
            </div>
          )}

          {part?.kind === 'EDUK' && (
            <div className="pp-field">
              <span className="pp-field-label">Toma:</span>{' '}
              {part.edukToma === 'si' ? 'Si' : part.edukToma === 'no' ? 'No' : '—'}
            </div>
          )}

          {/* Dimensiones */}
          {(part.dimMm || part.dimM) && (
            <div className="pp-field" style={{ marginTop: 8, lineHeight: 1.7 }}>
              <span className="pp-field-label">Dimensiones</span>
              <div>Ancho: {part.dimMm ? part.dimMm.widthMm : Math.round((part.dimM?.widthM || 0) * 1000)} mm</div>
              <div>Fondo: {part.dimMm ? part.dimMm.depthMm : Math.round((part.dimM?.depthM || 0) * 1000)} mm</div>
              <div>Espesor: {part.dimMm ? part.dimMm.thickMm : Math.round((part.dimM?.thicknessM || 0) * 1000)} mm</div>
            </div>
          )}

          <div className="pp-divider" />

          {/* Acabado */}
          <div className="pp-field-label" style={{ marginBottom: 6 }}>Acabado</div>

          <div className="pp-scope-group">
            <button type="button" title="Aplicar a la parte seleccionada"
              onClick={() => setApplyScope('PART')} disabled={readOnly}
              className={`pp-scope-btn${applyScope === 'PART' ? ' is-active' : ''}`}
            >◧ Parte</button>
            <button type="button" title="Aplicar a piezas similares del mismo conjunto"
              onClick={() => setApplyScope('GROUP')} disabled={readOnly || !canApplyGroup}
              className={`pp-scope-btn${applyScope === 'GROUP' ? ' is-active' : ''}`}
              style={{ opacity: !canApplyGroup ? 0.4 : 1 }}
            >◫ Grupo</button>
            <button type="button" title="Aplicar al objeto completo"
              onClick={() => setApplyScope('ALL')} disabled={readOnly}
              className={`pp-scope-btn${applyScope === 'ALL' ? ' is-active' : ''}`}
            >⬚ Todo</button>
          </div>

          {applyScope === 'GROUP' && (
            <div className="pp-hint">Mismo grupo y misma familia.</div>
          )}

          {part.subName && (
            <div className="pp-hint">Editando parte: <strong>{part.subName}</strong></div>
          )}

          <input className="pp-search" value={finishQuery}
            onChange={(e) => setFinishQuery(e.target.value)}
            placeholder="código o nombre"
            disabled={readOnly}
          />

          <div className="pp-count">Acabados permitidos: <strong>{filteredMaterialsAcabado.length}</strong></div>

          <select className="pp-select"
            value={part.subMaterialCode ?? part.materialCode ?? ''}
            onChange={(e) => {
              const code = e.target.value || null;
              const def = code ? (materialsByCode?.get?.(code) ?? null) : null;
              api?.applyFinishToActivePart?.(code, def, applyScope ?? 'PART');
            }}
            disabled={readOnly || !api?.applyFinishToActivePart}
          >
            <option value="">Sin acabado</option>
            {filteredMaterialsAcabado.map((m) => (
              <option key={m.code} value={m.code}>{m.code} — {m.name}</option>
            ))}
          </select>

          {part.materialBase && (
            <div className="pp-hint" style={{ marginTop: 6 }}>Material base: {part.materialBase}</div>
          )}
        </div>
      )}

      {part?.type === 'pantalla' && (
        <div className="pp-section">
          <div className="pp-field-label" style={{ marginBottom: 6 }}>Acabado de pantalla</div>
          <select className="pp-select"
            value={part?.privacyPanelFinishId || ''}
            onChange={(e) => {
              const selected = getKoncisaPrivacyPanelFinishById(e.target.value);
              api?.updateActivePrivacyPanelFinish?.({
                ...selected,
                privacyPanelFinishId: selected.id,
              });
            }}
            disabled={readOnly}
          >
            <option value="">Seleccionar acabado de pantalla</option>
            {KONCISA_PRIVACY_PANEL_FINISH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
