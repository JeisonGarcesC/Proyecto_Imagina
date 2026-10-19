import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { loginSession, logoutSession } from '../src/auth/authApi.js';
import { createSpecialFinish, getSpecialFinishTextureBlob, listSpecialFinishes,
  specialFinishError, uploadSpecialFinishTexture } from '../src/specialFinishes/specialFinishApi.js';
import { parseRgbChannels, validateTextureFile } from '../src/specialFinishes/specialFinishValidation.js';

let vite;
let LeftRail;
let SpecialFinishesPanel;
let SpecialFinishCard;
let SpecialFinishResults;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  LeftRail = (await vite.ssrLoadModule('/src/components/LeftRail.jsx')).default;
  ({ default: SpecialFinishesPanel, SpecialFinishCard, SpecialFinishResults } = await vite.ssrLoadModule('/src/components/SpecialFinishesPanel.jsx'));
});
after(async () => { await vite?.close(); });

const session = { user: { id: 'u1', displayName: 'Designer' }, roles: ['DESIGNER'],
  permissions: ['finishes.view', 'finishes.create'], accessToken: 'finish-token', expiresIn: 900 };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { 'Content-Type': 'application/json' } });

test('rail muestra la sección solo con permiso y el panel inicia en carga', () => {
  const allowed = renderToStaticMarkup(React.createElement(LeftRail,
    { active: 'specialFinishes', onChange: () => {}, canViewSpecialFinishes: true }));
  const denied = renderToStaticMarkup(React.createElement(LeftRail,
    { active: 'catalog', onChange: () => {}, canViewSpecialFinishes: false }));
  assert.match(allowed, /Acabados Especiales/);
  assert.doesNotMatch(denied, /Acabados Especiales/);
  const canCreate = renderToStaticMarkup(React.createElement(SpecialFinishesPanel, { canCreate: true }));
  const cannotCreate = renderToStaticMarkup(React.createElement(SpecialFinishesPanel, { canCreate: false }));
  assert.match(canCreate, /Crear acabado/);
  assert.doesNotMatch(cannotCreate, /Crear acabado/);
  assert.match(cannotCreate, /Cargando acabados/);
});

test('card RGB usa canales de servidor y card TEXTURE no usa asset URL directamente', () => {
  const rgb = renderToStaticMarkup(React.createElement(SpecialFinishCard, { finish: {
    id: '1', name: 'Azul', type: 'RGB', rgb: { r: 4, g: 8, b: 240 }, createdBy: { displayName: 'Ana' },
    createdAt: '2026-10-19T00:00:00Z',
  } }));
  assert.match(rgb, /rgb\(4, 8, 240\)/);
  assert.match(rgb, /Ana/);
  assert.match(rgb, /Activo/);
  const texture = renderToStaticMarkup(React.createElement(SpecialFinishCard, { finish: {
    id: '2', name: 'Nogal', type: 'TEXTURE', asset: { id: 'asset-1', url: 'https://private.example/secret' },
  } }));
  assert.match(texture, /TEXTURA/);
  assert.doesNotMatch(texture, /private.example/);
  assert.match(texture, /Cargando/);
});

test('resultados muestran listado, vacío, error y paginación', () => {
  const props = { page: 2, pageCount: 3, search: '', onRetry: () => {}, onPageChange: () => {} };
  const listed = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false,
    data: { total: 25, items: [{ id: 'f1', name: 'Rojo', type: 'RGB', rgb: { r: 255, g: 0, b: 0 } }] } }));
  assert.match(listed, /Rojo/);
  assert.match(listed, /Página 2 de 3/);
  assert.match(listed, /Anterior/);
  assert.match(listed, /Siguiente/);
  const empty = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false, data: { items: [] } }));
  assert.match(empty, /Todavía no hay acabados/);
  const searched = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false, search: 'x', data: { items: [] } }));
  assert.match(searched, /No hay acabados con ese nombre/);
  const failed = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false, error: 'Error del servidor' }));
  assert.match(failed, /Reintentar/);
  const permitted = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false,
    canApply: true, hasSelection: true, onApply: () => {},
    data: { total: 1, items: [{ id: 'f1', name: 'Rojo', type: 'RGB', rgb: { r: 255, g: 0, b: 0 } }] } }));
  const forbidden = renderToStaticMarkup(React.createElement(SpecialFinishResults, { ...props, loading: false,
    canApply: false, hasSelection: true,
    data: { total: 1, items: [{ id: 'f1', name: 'Rojo', type: 'RGB', rgb: { r: 255, g: 0, b: 0 } }] } }));
  assert.match(permitted, />Aplicar</);
  assert.doesNotMatch(forbidden, />Aplicar</);
});

test('validación preliminar RGB y textura', () => {
  assert.deepEqual(parseRgbChannels({ r: '0', g: '128', b: '255' }), { r: 0, g: 128, b: 255 });
  assert.equal(parseRgbChannels({ r: '256', g: '0', b: '0' }), null);
  assert.equal(parseRgbChannels({ r: '2.5', g: '0', b: '0' }), null);
  assert.equal(parseRgbChannels({ r: '', g: '0', b: '0' }), null);
  assert.equal(validateTextureFile({ name: 'wood.jpg', type: 'image/jpeg', size: 100 }), null);
  assert.match(validateTextureFile({ name: 'wood.svg', type: 'image/svg+xml', size: 100 }), /JPG/);
  assert.match(validateTextureFile({ name: 'wood.jpg', type: 'image/png', size: 100 }), /formato/);
  assert.match(validateTextureFile({ name: 'wood.png', type: 'image/png', size: 6 * 1024 * 1024 }), /5 MiB/);
});

test('API autenticada lista, busca, pagina, crea RGB y textura y descarga preview', async (t) => {
  const previousFetch = globalThis.fetch;
  const PreviousRequest = globalThis.Request;
  globalThis.Request = class extends PreviousRequest {
    constructor(input, init) {
      super(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init);
    }
  };
  t.after(() => { globalThis.fetch = previousFetch; globalThis.Request = PreviousRequest; });
  const requests = [];
  globalThis.fetch = async (input) => {
    if (input === '/api/auth/login') return json(session);
    if (input === '/api/auth/logout') return new Response(null, { status: 204 });
    const request = input;
    requests.push(request);
    if (request.url.endsWith('/textures/asset-1')) return new Response(new Blob(['preview'], { type: 'image/png' }));
    if (request.method === 'POST' && request.url.endsWith('/textures')) return json({ id: 'asset-1' }, 201);
    if (request.method === 'POST') return json({ id: 'finish-1' }, 201);
    return json({ items: [{ id: 'finish-1', name: 'Nogal' }], total: 1, page: 2, pageSize: 12 });
  };
  await loginSession('designer', 'secret');
  const list = await listSpecialFinishes({ page: 2, search: 'Nogal' });
  assert.equal(list.total, 1);
  assert.match(requests[0].url, /page=2/);
  assert.match(requests[0].url, /search=Nogal/);
  await createSpecialFinish({ name: 'Azul', type: 'RGB', rgb: { r: 1, g: 2, b: 3 } });
  const file = Object.assign(new Blob(['image'], { type: 'image/png' }), { name: 'wood.png' });
  assert.equal((await uploadSpecialFinishTexture(file)).id, 'asset-1');
  await createSpecialFinish({ name: 'Nogal', type: 'TEXTURE', assetId: 'asset-1' });
  assert.equal((await getSpecialFinishTextureBlob('asset-1')).size, 7);
  assert.ok(requests.every((request) => request.headers.get('Authorization') === 'Bearer finish-token'));
  const upload = requests.find((request) => request.url.endsWith('/textures') && request.method === 'POST');
  assert.equal(upload.headers.get('Content-Type'), 'image/png');
  assert.equal(upload.headers.get('X-File-Name'), 'wood.png');
  await logoutSession();
});

test('errores comunes se presentan sin mensajes técnicos', () => {
  for (const status of [401, 403, 404, 409, 413, 415, 422, 500]) {
    const message = specialFinishError({ status });
    assert.ok(message.length > 10);
    assert.doesNotMatch(message, /stack|prisma|sql/i);
  }
  assert.match(specialFinishError(new Error('network')), /conectar/);
});
