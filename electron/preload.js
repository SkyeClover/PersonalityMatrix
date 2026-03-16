const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchOura: (token, startDate, endDate) =>
    ipcRenderer.invoke('oura-fetch', { token, startDate, endDate }),
});
