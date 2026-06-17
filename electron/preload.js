const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nthTermTerminal', {
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),
  writeTerminal: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
  resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
  disposeTerminal: (id) => ipcRenderer.invoke('terminal:dispose', id),
  onTerminalData: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('terminal:data', wrapped);
    return () => ipcRenderer.removeListener('terminal:data', wrapped);
  },
  onTerminalExit: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('terminal:exit', wrapped);
    return () => ipcRenderer.removeListener('terminal:exit', wrapped);
  },
});
