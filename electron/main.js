const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const pty = require('node-pty');
const { WorkspaceStore } = require('./workspace-store');

const terminals = new Map();
const workspaceStore = new WorkspaceStore();

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

function sendTerminalInfo(webContents, info) {
  webContents.send('terminal:info', { ...info });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#05080c',
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
    const shell = getShell();
    const id = crypto.randomUUID();
    const cwd = options.cwd || os.homedir();
    const startedAt = new Date().toISOString();
    const terminal = pty.spawn(shell.file, shell.args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env: process.env,
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

    terminals.set(id, { terminal, info });
    sendTerminalInfo(event.sender, info);

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

      event.sender.send('terminal:data', { id, data });
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
      event.sender.send('terminal:exit', { id, exitCode });
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

function registerWorkspaceHandlers() {
  ipcMain.handle('workspace:list', () => {
    return workspaceStore.listWorkspaces();
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
}

app.whenReady()
  .then(async () => {
    await workspaceStore.init(app.getPath('userData'));
    registerTerminalHandlers();
    registerWorkspaceHandlers();
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
