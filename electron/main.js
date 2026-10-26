import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { access, writeFile } from 'fs/promises';
import { pathToFileURL } from 'node:url';
import { ModelAssetStore } from './modelAssetStore.js';
import { parseModelAssetRequestUrl } from './modelAssetRequest.js';
import { registerModelAssetIpcHandlers } from './modelAssetIpc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelAssets = new ModelAssetStore(path.join(app.getPath('userData'), 'model-assets'));

protocol.registerSchemesAsPrivileged([{
  scheme: 'imagina-asset',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

registerModelAssetIpcHandlers(ipcMain, modelAssets);
ipcMain.handle('project:save-complete', async (_event, project) => {
  const result = await dialog.showOpenDialog({ title: 'Carpeta del proyecto completo',
    properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { saved: false, canceled: true };
  const manifestPath = path.join(result.filePaths[0], 'proyecto.json');
  const exists = await access(manifestPath).then(() => true, () => false);
  if (exists) {
    const response = await dialog.showMessageBox({ type: 'question', buttons: ['Cancelar', 'Reemplazar'],
      defaultId: 0, cancelId: 0, message: 'Esta carpeta ya contiene un proyecto.json. ¿Reemplazarlo?' });
    if (response.response !== 1) return { saved: false, canceled: true };
  }
  const saved = await modelAssets.saveComplete(project, manifestPath);
  return { saved: true, ...saved };
});
ipcMain.handle('project:open-complete', async () => {
  const result = await dialog.showOpenDialog({ title: 'Abrir proyecto completo',
    filters: [{ name: 'Proyecto Imagina', extensions: ['json'] }], properties: ['openFile'] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, project: await modelAssets.openComplete(result.filePaths[0]) };
});

function sanitizeXlsxFilename(value) {
  const safeBase = String(value || 'Cotizacion_Proyecto')
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
    .replace(/[. ]+$/g, '')
    .trim();
  return `${safeBase || 'Cotizacion_Proyecto'}.xlsx`.replace(/\.xlsx\.xlsx$/i, '.xlsx');
}

ipcMain.handle('bom:save-xlsx', async (_event, { bytes, suggestedName } = {}) => {
  const contents = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!contents.byteLength) throw new Error('El archivo Excel está vacío.');
  if (contents.byteLength > 100 * 1024 * 1024) throw new Error('El archivo Excel excede 100 MB.');

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar cotización BOM',
    defaultPath: sanitizeXlsxFilename(suggestedName),
    filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  });
  if (canceled || !filePath) return { saved: false, canceled: true };

  await writeFile(filePath, contents);
  return { saved: true, canceled: false, filePath };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Desarrollo: Vite
  win.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  protocol.handle('imagina-asset', async (request) => {
    const asset = parseModelAssetRequestUrl(request.url);
    if (!asset)
      return new Response('Asset inválido.', { status: 400 });
    if (!asset.prepared && modelAssets.isPrepared(asset.assetRef))
      return new Response('Usa la representación preparada.', { status: 409 });
    try {
      const filePath = asset.prepared
        ? await modelAssets.resolvePreparedPath(asset.assetRef, asset.fileName)
        : await modelAssets.resolvePath(asset.assetRef);
      return net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return new Response('Asset no disponible.', { status: 404 });
    }
  });
  createWindow();
});
