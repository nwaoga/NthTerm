const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const pty = require('node-pty');
const { WorkspaceStore } = require('./workspace-store');

const terminals = new Map();
const workspaceStore = new WorkspaceStore();

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
    const terminal = pty.spawn(shell.file, shell.args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd: options.cwd || os.homedir(),
      env: process.env,
    });

    terminals.set(id, terminal);

    terminal.onData((data) => {
      event.sender.send('terminal:data', { id, data });
    });

    terminal.onExit(({ exitCode }) => {
      terminals.delete(id);
      event.sender.send('terminal:exit', { id, exitCode });
    });

    return { id };
  });

  ipcMain.handle('terminal:write', (_event, id, data) => {
    terminals.get(id)?.write(data);
  });

  ipcMain.handle('terminal:resize', (_event, id, cols, rows) => {
    if (cols > 0 && rows > 0) {
      terminals.get(id)?.resize(cols, rows);
    }
  });

  ipcMain.handle('terminal:dispose', (_event, id) => {
    const terminal = terminals.get(id);
    if (!terminal) {
      return;
    }

    terminals.delete(id);
    terminal.kill();
  });
}

function registerWorkspaceHandlers() {
  ipcMain.handle('workspace:get-default', () => {
    return workspaceStore.getDefaultWorkspace();
  });

  ipcMain.handle('workspace:save-default', (_event, workspace) => {
    return workspaceStore.saveDefaultWorkspace(workspace);
  });
}

app.whenReady().then(async () => {
  await workspaceStore.init(app.getPath('userData'));
  registerTerminalHandlers();
  registerWorkspaceHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
