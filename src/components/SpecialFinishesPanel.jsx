import { useEffect, useState } from 'react';
import { createSpecialFinish, getSpecialFinishTextureBlob, listSpecialFinishes,
  specialFinishError, uploadSpecialFinishTexture } from '../specialFinishes/specialFinishApi.js';
import { parseRgbChannels, validateTextureFile } from '../specialFinishes/specialFinishValidation.js';
import './SpecialFinishesPanel.css';

const PAGE_SIZE = 12;
const EMPTY_RGB = { r: '', g: '', b: '' };

function rgbCss(rgb) {
  const channels = parseRgbChannels(rgb);
  return channels ? `rgb(${channels.r}, ${channels.g}, ${channels.b})` : '#dedede';
}

function TexturePreview({ assetId, label }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!assetId) return undefined;
    const controller = new AbortController();
    let objectUrl = null;
    getSpecialFinishTextureBlob(assetId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setError(false);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  if (error) return <span className="sf-preview sf-preview-error" role="img" aria-label="Imagen no disponible">Imagen no disponible</span>;
  return src ? <img className="sf-preview" src={src} alt={`Textura de ${label}`} />
    : <span className="sf-preview sf-preview-loading" aria-label="Cargando textura">Cargando…</span>;
}

export function SpecialFinishCard({ finish, canApply = false, hasSelection = false,
  applying = false, onApply }) {
  const date = finish.createdAt ? new Date(finish.createdAt).toLocaleDateString('es-CO') : '—';
  return <article className="sf-card">
    {finish.type === 'RGB'
      ? <span className="sf-preview sf-rgb-preview" role="img" aria-label={`Color de ${finish.name}`}
          style={{ backgroundColor: rgbCss(finish.rgb) }} />
      : <TexturePreview assetId={finish.asset?.id} label={finish.name} />}
    <div className="sf-card-info">
      <strong title={finish.name}>{finish.name}</strong>
      <span className="sf-type">{finish.type === 'RGB' ? 'RGB' : 'TEXTURA'}</span>
      <small>{finish.createdBy?.displayName || 'Usuario anterior'} · {date}</small>
      <small className="sf-active">Activo</small>
      {canApply && <button type="button" disabled={!hasSelection || applying} onClick={() => onApply?.(finish)}
        title={hasSelection ? 'Aplicar al objetivo seleccionado' : 'Selecciona primero una parte u objeto'}>
        {applying ? 'Aplicando…' : 'Aplicar'}
      </button>}
    </div>
  </article>;
}

export function SpecialFinishResults({ loading, error, data, search, page, pageCount, onRetry, onPageChange,
  canApply = false, hasSelection = false, applyingId = null, onApply }) {
  if (loading) return <p role="status">Cargando acabados…</p>;
  if (error) return <div className="sf-error" role="alert">{error} <button type="button" onClick={onRetry}>Reintentar</button></div>;
  if (!data?.items?.length) return <p className="sf-empty">{search ? 'No hay acabados con ese nombre.' : 'Todavía no hay acabados especiales.'}</p>;
  return <><div className="sf-list">{data.items.map((finish) => <SpecialFinishCard key={finish.id} finish={finish}
    canApply={canApply} hasSelection={hasSelection} applying={applyingId === finish.id} onApply={onApply} />)}</div>
    <div className="sf-pagination"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>Página {page} de {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Siguiente</button></div></>;
}

function NewFinishForm({ onCancel, onCreated }) {
  const [type, setType] = useState('RGB');
  const [name, setName] = useState('');
  const [rgb, setRgb] = useState(EMPTY_RGB);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const channels = parseRgbChannels(rgb);
  const fileError = type === 'TEXTURE' ? validateTextureFile(file) : null;
  const canSave = Boolean(name.trim() && name.trim().length <= 160
    && (type === 'RGB' ? channels : file && !fileError) && !saving);

  const save = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      if (type === 'RGB') {
        await createSpecialFinish({ name: name.trim(), type, rgb: channels });
      } else {
        const asset = await uploadSpecialFinishTexture(file);
        await createSpecialFinish({ name: name.trim(), type, assetId: asset.id });
      }
      onCreated();
    } catch (failure) {
      setError(specialFinishError(failure));
    } finally {
      setSaving(false);
    }
  };

  return <form className="sf-form" onSubmit={save} aria-label="Crear acabado especial">
    <h4>Nuevo acabado especial</h4>
    <fieldset disabled={saving}>
      <legend>Tipo de acabado</legend>
      <label><input type="radio" name="specialFinishType" checked={type === 'RGB'} onChange={() => { setType('RGB'); setError(''); }} /> RGB</label>
      <label><input type="radio" name="specialFinishType" checked={type === 'TEXTURE'} onChange={() => { setType('TEXTURE'); setError(''); }} /> Textura</label>
    </fieldset>
    <label className="sf-field">Nombre del acabado
      <input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} placeholder="Ej. Nogal especial" disabled={saving} />
    </label>
    {type === 'RGB' ? <>
      <div className="sf-rgb-fields">
        {['r', 'g', 'b'].map((channel) => <label key={channel} className="sf-field">{channel.toUpperCase()}
          <input type="number" min="0" max="255" step="1" value={rgb[channel]} disabled={saving}
            onChange={(event) => setRgb((current) => ({ ...current, [channel]: event.target.value }))} />
        </label>)}
      </div>
      <div className="sf-live-preview"><span className="sf-preview sf-rgb-preview" role="img" aria-label="Vista previa RGB"
        style={{ backgroundColor: rgbCss(rgb) }} />{channels ? rgbCss(rgb) : 'Introduce R, G y B'}</div>
    </> : <>
      <label className="sf-field">Imagen JPG, JPEG o PNG (máximo 5 MiB)
        <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={saving}
          onChange={(event) => { setFile(event.target.files?.[0] || null); setPreviewUrl(null); setError(''); }} />
      </label>
      {file && <div className="sf-file-detail">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MiB</div>}
      {fileError && file && <p className="sf-error" role="alert">{fileError}</p>}
      {previewUrl && !fileError && <img className="sf-upload-preview" src={previewUrl} alt="Vista previa de textura" />}
    </>}
    {error && <p className="sf-error" role="alert">{error}</p>}
    <div className="sf-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
      <button type="submit" className="sf-primary" disabled={!canSave}>{saving ? 'Guardando…' : 'Guardar acabado'}</button></div>
  </form>;
}

export default function SpecialFinishesPanel({ canCreate = false, canApply = false, selectedPart = null, onApply }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState('PART');
  const [applyingId, setApplyingId] = useState(null);
  const [applyError, setApplyError] = useState('');
  const requestKey = `${page}:${search}:${revision}`;
  const loading = result.key !== requestKey;
  const data = loading ? null : result.data;
  const error = loading ? '' : result.error;

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setSearch(query); }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    listSpecialFinishes({ page, pageSize: PAGE_SIZE, search, signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setResult({ key: requestKey, data: response, error: '' }); })
      .catch((failure) => { if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: specialFinishError(failure) }); });
    return () => controller.abort();
  }, [page, search, revision, requestKey]);

  const created = () => {
    setCreating(false);
    setQuery('');
    setSearch('');
    setPage(1);
    setRevision((current) => current + 1);
  };
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));
  const apply = async (finish) => {
    if (!canApply || !selectedPart || !onApply) return;
    setApplyingId(finish.id);
    setApplyError('');
    try { await onApply(finish, scope); }
    catch (failure) { setApplyError(failure?.status ? specialFinishError(failure)
      : failure?.message || 'No se pudo aplicar el acabado.'); }
    finally { setApplyingId(null); }
  };

  return <section className="sf-panel" aria-label="Acabados Especiales">
    <header className="sf-header"><h3>Acabados Especiales</h3>
      {canCreate && !creating && <button className="sf-primary" type="button" onClick={() => setCreating(true)}>+ Crear acabado</button>}
    </header>
    {creating && <NewFinishForm onCancel={() => setCreating(false)} onCreated={created} />}
    <label className="sf-field">Buscar por nombre
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar acabado" />
    </label>
    {canApply && selectedPart && <div className="sf-scope" role="group" aria-label="Alcance del acabado">
      <button type="button" aria-pressed={scope === 'PART'} onClick={() => setScope('PART')}>Parte</button>
      <button type="button" aria-pressed={scope === 'ALL'} onClick={() => setScope('ALL')}>Objeto</button>
    </div>}
    {applyError && <p className="sf-error" role="alert">{applyError}</p>}
    <SpecialFinishResults loading={loading} error={error} data={data} search={search} page={page}
      pageCount={pageCount} onRetry={() => setRevision((value) => value + 1)} onPageChange={setPage}
      canApply={canApply} hasSelection={Boolean(selectedPart)} applyingId={applyingId} onApply={apply} />
  </section>;
}
