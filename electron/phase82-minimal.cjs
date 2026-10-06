// Reproducción aislada: node_modules/electron/dist/electron.exe electron/phase82-minimal.cjs A
// Antes de lanzar Electron, desactivar ELECTRON_RUN_AS_NODE solo en el proceso hijo.
const { app, BrowserWindow } = require('electron');
const { appendFileSync } = require('node:fs');
const { join } = require('node:path');

const stage = process.argv[2] || 'A';
const logPath = join(__dirname, 'phase82-minimal.log');
const log = (message) => {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`);
};

log(`START stage=${stage} pid=${process.pid} electron=${process.versions.electron} node=${process.versions.node}`);
log(`exe=${process.execPath} argv=${JSON.stringify(process.argv)}`);
log(`ELECTRON_RUN_AS_NODE=${process.env.ELECTRON_RUN_AS_NODE ?? '<unset>'}`);
log(`userData=${app.getPath('userData')} cache=${app.getPath('cache')}`);
for (const event of ['will-finish-launching', 'ready', 'browser-window-created', 'before-quit', 'quit']) {
  app.on(event, () => log(`EVENT ${event}`));
}
app.on('child-process-gone', (_, details) => log(`CHILD_GONE ${JSON.stringify(details)}`));
setTimeout(() => {
  log(`TIMEOUT ready=${app.isReady()}`);
  app.exit(2);
}, 45000);

app.whenReady().then(async () => {
  log('ELECTRON_READY');
  log(`GPU_STATUS ${JSON.stringify(app.getGPUFeatureStatus())}`);
  log(`PROCESSES ${JSON.stringify(app.getAppMetrics().map(({ pid, type, serviceName }) => ({ pid, type, serviceName })))}`);
  if (stage === 'A') return app.exit(0);
  const win = new BrowserWindow({ width: 1200, height: 800, show: false });
  log('BROWSER_WINDOW_CREATED');
  if (stage === 'B') return app.exit(0);
  win.webContents.on('did-fail-load', (_, code, description, url) => log(`LOAD_FAILED ${code} ${description} ${url}`));
  win.webContents.on('console-message', (details) => log(`CONSOLE ${details.level}: ${details.message}`));
  win.webContents.on('render-process-gone', (_, details) => log(`RENDER_GONE ${JSON.stringify(details)}`));
  const url = stage === 'D' ? 'http://localhost:5173/@vite/client'
    : ['E', 'F', 'G', 'H'].includes(stage) ? 'http://localhost:5173/'
      : 'data:text/html,<html><body>Electron minimal</body></html>';
  await win.loadURL(url);
  log(`PAGE_LOADED ${win.webContents.getURL()} title=${win.webContents.getTitle()}`);
  if (['E', 'F', 'G', 'H'].includes(stage)) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (['F', 'G', 'H'].includes(stage)) {
      const clicked = await win.webContents.executeJavaScript(`(() => { const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Administrador'); if (!button) return false; button.click(); return true; })()`);
      log(`DEV_ADMIN_CLICKED ${clicked}`);
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
    if (['G', 'H'].includes(stage)) {
      const clicked = await win.webContents.executeJavaScript(`(() => { const button = [...document.querySelectorAll('button')].find(el => el.getAttribute('title')?.includes('Critterium') || el.getAttribute('aria-label')?.includes('Critterium') || el.textContent.includes('Critterium')); if (!button) return { found: false, sample: [...document.querySelectorAll('button')].slice(0, 30).map(el => ({ text: el.textContent, title: el.title, aria: el.getAttribute('aria-label') })) }; button.click(); return { found: true, text: button.textContent }; })()`);
      log(`CRITERIUM_RAIL ${JSON.stringify(clicked)}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (stage === 'H') {
      const click = async (label) => {
        const result = await win.webContents.executeJavaScript(`(() => { const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === ${JSON.stringify(label)} && !el.disabled); if (!button) return false; button.click(); return true; })()`);
        log(`UI_CLICK ${label} ${result}`);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      };
      await click('Crear oficina vacía');
      log(`UI_AFTER_OFFICE ${JSON.stringify(await win.webContents.executeJavaScript(`document.body.innerText.slice(-1200)`) )}`);
      await click('Crear y agregar al sistema');
      log(`UI_AFTER_SEQUENCE ${JSON.stringify(await win.webContents.executeJavaScript(`document.body.innerText.slice(-1400)`) )}`);
      await click('Ver BOM del sistema');
      log(`UI_AFTER_BOM ${JSON.stringify(await win.webContents.executeJavaScript(`document.body.innerText.slice(-1600)`) )}`);
      const opened = await win.webContents.executeJavaScript(`(() => { const summary = [...document.querySelectorAll('summary')].find(el => el.textContent.trim() === 'Comercial · BOM y cotización'); if (!summary) return false; summary.click(); return true; })()`);
      log(`UI_COMMERCIAL_SECTION ${opened}`);
      await click('Cotización');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      log(`UI_AFTER_QUOTE ${JSON.stringify(await win.webContents.executeJavaScript(`document.body.innerText.slice(-2300)`) )}`);
    }
    const state = await win.webContents.executeJavaScript(`({ root: !!document.querySelector('#root'), text: document.body.innerText.slice(0, 800), canvas: document.querySelectorAll('canvas').length, webgl2Available: Boolean(document.createElement('canvas').getContext('webgl2')), webglAvailable: Boolean(document.createElement('canvas').getContext('webgl')) })`);
    log(`REACT_STATE ${JSON.stringify(state)}`);
  }
  app.exit(0);
}).catch((error) => {
  log(`ERROR ${error?.stack || error}`);
  app.exit(1);
});
