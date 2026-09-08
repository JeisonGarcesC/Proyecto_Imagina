const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBomXlsx: ({ bytes, suggestedName }) =>
    ipcRenderer.invoke('bom:save-xlsx', { bytes, suggestedName }),
});
