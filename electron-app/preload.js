const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onNoInternet: (callback) => ipcRenderer.on('no-internet', callback),
    retryConnection: () => ipcRenderer.send('retry-connection')
});
