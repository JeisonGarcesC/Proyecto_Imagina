const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBomXlsx: ({ bytes, suggestedName }) =>
    ipcRenderer.invoke('bom:save-xlsx', { bytes, suggestedName }),
  importModelAsset: (file) => {
    const sourcePath = webUtils.getPathForFile(file);
    if (!sourcePath) throw new Error('Selecciona un archivo GLB del equipo.');
    return ipcRenderer.invoke('model-asset:import', { sourcePath, fileName: file.name });
  },
  getModelAssetUrl: (assetRef) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(assetRef)))
      throw new Error('Referencia de modelo inválida.');
    return `imagina-asset://model/${assetRef}.glb`;
  },
  saveCompleteProject: (project) => ipcRenderer.invoke('project:save-complete', project),
  openCompleteProject: () => ipcRenderer.invoke('project:open-complete'),
  clearProjectAssets: () => ipcRenderer.invoke('model-asset:clear-project'),
});
