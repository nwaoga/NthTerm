const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nthTermDesktop', {
  platform: process.platform,
  terminal: {
    createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),
    writeTerminal: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    getTerminalInfo: (id) => ipcRenderer.invoke('terminal:get-info', id),
    listWslDistros: () => ipcRenderer.invoke('terminal:list-wsl-distros'),
    interruptTerminal: (id) => ipcRenderer.invoke('terminal:interrupt', id),
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
    onTerminalInfo: (listener) => {
      const wrapped = (_event, payload) => listener(payload);
      ipcRenderer.on('terminal:info', wrapped);
      return () => ipcRenderer.removeListener('terminal:info', wrapped);
    },
  },
  workspace: {
    listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
    getActiveWorkspace: () => ipcRenderer.invoke('workspace:get-active'),
    getLaunchWorkspace: () => ipcRenderer.invoke('workspace:get-launch'),
    getDirectoryDefaults: () => ipcRenderer.invoke('workspace:get-directory-defaults'),
    createWorkspace: (workspace) => ipcRenderer.invoke('workspace:create', workspace),
    saveWorkspace: (workspace) => ipcRenderer.invoke('workspace:save', workspace),
    setActiveWorkspace: (workspaceId) => ipcRenderer.invoke('workspace:set-active', workspaceId),
    renameWorkspace: (workspaceId, name) => ipcRenderer.invoke('workspace:rename', workspaceId, name),
    deleteWorkspace: (workspaceId) => ipcRenderer.invoke('workspace:delete', workspaceId),
  },
  system: {
    getMetrics: () => ipcRenderer.invoke('system:get-metrics'),
    getSessionEnvironment: (sessionId) => ipcRenderer.invoke('system:get-session-environment', sessionId),
  },
  app: {
    quitReady: () => ipcRenderer.invoke('app:quit-ready'),
    applyTitleBarTheme: (theme) => ipcRenderer.invoke('app:apply-title-bar-theme', theme),
    onBeforeQuit: (listener) => {
      const wrapped = () => listener();
      ipcRenderer.on('app:before-quit', wrapped);
      return () => ipcRenderer.removeListener('app:before-quit', wrapped);
    },
  },
});
