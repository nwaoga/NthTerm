const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const pty = require('node-pty');
const { WorkspaceStore } = require('./workspace-store');
const { formatEnvironment, getSystemMetrics } = require('./system-monitor');

const terminals = new Map();
const workspaceStore = new WorkspaceStore();
let isQuitting = false;

function parseDetectedPort(data) {
  const patterns = [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})/i,
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})\b/i,
    /\bport(?:\s+is|\s*=|\s+)?\s*(\d{2,5})\b/i,
  ];

  for (const pattern of patterns) {
    const match = data.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function getShell() {
  if (process.platform === 'win32') {
    return {
      file: 'powershell.exe',
      args: ['-NoLogo'],
    };
  }

  if (process.platform === 'darwin') {
    return {
      file: process.env.SHELL || '/bin/zsh',
      args: [],
    };
  }

  return {
    file: process.env.SHELL || '/bin/bash',
    args: [],
  };
}

function resolveShell(preference) {
  const normalized = (preference || '').trim().toLowerCase();
  if (!normalized) {
    return getShell();
  }

  if (normalized === 'powershell' || normalized === 'powershell.exe') {
    return { file: 'powershell.exe', args: ['-NoLogo'] };
  }

  if (normalized === 'cmd' || normalized === 'cmd.exe') {
    return { file: 'cmd.exe', args: [] };
  }

  if (normalized === 'bash' || normalized === 'bash.exe') {
    return process.platform === 'win32'
      ? { file: 'bash.exe', args: [] }
      : { file: '/bin/bash', args: [] };
  }

  if (normalized === 'zsh' || normalized === 'zsh.exe') {
    return process.platform === 'win32'
      ? { file: 'zsh.exe', args: [] }
      : { file: '/bin/zsh', args: [] };
  }

  return getShell();
}

function sendTerminalInfo(webContents, info) {
  safeSend(webContents, 'terminal:info', { ...info });
}

function safeSend(webContents, channel, payload) {
  if (!webContents || webContents.isDestroyed()) {
    return false;
  }

  webContents.send(channel, payload);
  return true;
}

function disposeTerminalsForWebContents(webContentsId) {
  for (const [id, entry] of terminals.entries()) {
    if (entry.ownerWebContentsId !== webContentsId) {
      continue;
    }

    terminals.delete(id);
    entry.terminal?.kill();
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#05080c',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1624',
      symbolColor: '#dbe7f5',
      height: 40,
    },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererUrl = process.env.NTH_TERM_RENDERER_URL;

  if (rendererUrl) {
    window.loadURL(rendererUrl);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'nthterm', 'browser', 'index.html'));
}

function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', (event, options = {}) => {
    const shell = resolveShell(options.shell);
    const id = crypto.randomUUID();
    const cwd = workspaceStore.resolveLaunchDirectory(options.cwd);
    const startedAt = new Date().toISOString();
    const env = {
      ...process.env,
      ...(options.workspaceName ? { NTH_TERM_WORKSPACE: options.workspaceName } : {}),
    };
    const terminal = pty.spawn(shell.file, shell.args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env,
    });
    const info = {
      id,
      pid: terminal.pid,
      cwd,
      shell: path.basename(shell.file),
      status: 'running',
      startedAt,
      lastActiveAt: startedAt,
      endedAt: null,
      exitCode: null,
      detectedPort: null,
    };

    terminals.set(id, {
      terminal,
      info,
      env,
      ownerWebContentsId: event.sender.id,
    });
    sendTerminalInfo(event.sender, info);

    event.sender.once('destroyed', () => {
      disposeTerminalsForWebContents(event.sender.id);
    });

    terminal.onData((data) => {
      const entry = terminals.get(id);
      if (!entry) {
        return;
      }

      entry.info.lastActiveAt = new Date().toISOString();
      const detectedPort = parseDetectedPort(data);
      if (detectedPort && entry.info.detectedPort !== detectedPort) {
        entry.info.detectedPort = detectedPort;
        sendTerminalInfo(event.sender, entry.info);
      }

      safeSend(event.sender, 'terminal:data', { id, data });
    });

    terminal.onExit(({ exitCode }) => {
      const entry = terminals.get(id);
      if (!entry) {
        return;
      }

      entry.info.status = 'stopped';
      entry.info.exitCode = exitCode;
      entry.info.endedAt = new Date().toISOString();
      entry.terminal = null;
      sendTerminalInfo(event.sender, entry.info);
      safeSend(event.sender, 'terminal:exit', { id, exitCode });
    });

    return { id };
  });

  ipcMain.handle('terminal:write', (_event, id, data) => {
    terminals.get(id)?.terminal?.write(data);
  });

  ipcMain.handle('terminal:resize', (_event, id, cols, rows) => {
    if (cols > 0 && rows > 0) {
      terminals.get(id)?.terminal?.resize(cols, rows);
    }
  });

  ipcMain.handle('terminal:get-info', (_event, id) => {
    return terminals.get(id)?.info ?? null;
  });

  ipcMain.handle('terminal:interrupt', (_event, id) => {
    terminals.get(id)?.terminal?.write('\u0003');
  });

  ipcMain.handle('terminal:dispose', (_event, id) => {
    const entry = terminals.get(id);
    if (!entry) {
      return;
    }

    terminals.delete(id);
    entry.terminal?.kill();
  });
}

function registerSystemHandlers() {
  ipcMain.handle('system:get-metrics', async () => {
    return getSystemMetrics();
  });

  ipcMain.handle('system:get-session-environment', (_event, sessionId) => {
    const entry = terminals.get(sessionId);
    if (!entry?.env) {
      return [];
    }

    return formatEnvironment(entry.env);
  });
}

function registerWorkspaceHandlers() {
  ipcMain.handle('workspace:list', () => {
    return workspaceStore.listWorkspaces();
  });

  ipcMain.handle('workspace:get-launch', () => {
    return workspaceStore.getLaunchWorkspace();
  });

  ipcMain.handle('workspace:get-directory-defaults', () => {
    return workspaceStore.getDirectoryDefaults();
  });

  ipcMain.handle('workspace:get-active', () => {
    return workspaceStore.getActiveWorkspace();
  });

  ipcMain.handle('workspace:create', (_event, workspace) => {
    const created = workspaceStore.createWorkspace(workspace);
    return workspaceStore.setActiveWorkspace(created.id);
  });

  ipcMain.handle('workspace:save', (_event, workspace) => {
    return workspaceStore.saveWorkspace(workspace);
  });

  ipcMain.handle('workspace:set-active', (_event, workspaceId) => {
    return workspaceStore.setActiveWorkspace(workspaceId);
  });

  ipcMain.handle('workspace:rename', (_event, workspaceId, name) => {
    return workspaceStore.renameWorkspace(workspaceId, name);
  });

  ipcMain.handle('workspace:delete', (_event, workspaceId) => {
    return workspaceStore.deleteWorkspace(workspaceId);
  });
}

function registerAppHandlers() {
  ipcMain.handle('app:quit-ready', () => {
    isQuitting = true;
    app.quit();
  });
}

app.whenReady()
  .then(async () => {
    await workspaceStore.init(app.getPath('userData'));
    registerTerminalHandlers();
    registerWorkspaceHandlers();
    registerSystemHandlers();
    registerAppHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    console.error('Failed to initialize NthTerm:', error);
  });

app.on('before-quit', (event) => {
  if (isQuitting) {
    return;
  }

  event.preventDefault();

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('app:before-quit');
    }
  }

  setTimeout(() => {
    if (!isQuitting) {
      isQuitting = true;
      app.quit();
    }
  }, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
