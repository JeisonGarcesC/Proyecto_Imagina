import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.whenReady().then(createWindow);
