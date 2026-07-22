const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const pty = require('node-pty');
const { WorkspaceStore } = require('./workspace-store');
const { formatEnvironment, getSystemMetrics } = require('./system-monitor');
const {
  TerminalSpawnCoordinator,
  createWindowsSpawnOptions,
} = require('./terminal-spawn-coordinator');
const { buildTerminalSpawnEnv } = require('./terminal-spawn-env');
const { resolveShell } = require('./resolve-shell');
const { listWslDistros } = require('./wsl-distros');
const {
  TerminalStartRegistry,
  createTerminalStartKey,
  findReusableTerminal,
} = require('./terminal-start-registry');
const {
  DEFAULT_TITLE_BAR_THEME,
  createBrowserWindowOptions,
  createDarwinApplicationMenuTemplate,
} = require('./window-chrome');

const spawnCoordinator = new TerminalSpawnCoordinator({
  spawnFn: (file, args, options) => pty.spawn(file, args, options),
});

const terminals = new Map();
const terminalStarts = new TerminalStartRegistry();
const workspaceStore = new WorkspaceStore();
let isQuitting = false;
let mainWindow = null;

function installApplicationMenu() {
  if (process.platform !== 'darwin') {
    return;
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(createDarwinApplicationMenuTemplate()));
}

function applyTitleBarTheme(window, theme = DEFAULT_TITLE_BAR_THEME) {
  if (!window || window.isDestroyed()) {
    return;
  }

  // Keep the acrylic/glass window clear; opaque backgrounds kill the material.
  window.setBackgroundColor('#00000000');

  if (process.platform === 'win32' && typeof window.setTitleBarOverlay === 'function') {
    window.setTitleBarOverlay({
      color: theme.color,
      symbolColor: theme.symbolColor,
      height: theme.height,
    });
  }
}

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
    void spawnCoordinator.enqueueDispose(async () => {
      entry.terminal?.kill();
    });
  }
}

function createWindow() {
  const window = new BrowserWindow(
    createBrowserWindowOptions({
      preloadPath: path.join(__dirname, 'preload.js'),
      theme: DEFAULT_TITLE_BAR_THEME,
    })
  );

  mainWindow = window;
  applyTitleBarTheme(window, DEFAULT_TITLE_BAR_THEME);

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
    const terminalId = typeof options.terminalId === 'string' ? options.terminalId.trim() : '';
    const startKey = createTerminalStartKey(event.sender.id, terminalId);

    return terminalStarts.run(startKey, async () => {
      const reusable = findReusableTerminal(terminals, event.sender.id, terminalId);
      if (reusable) {
        sendTerminalInfo(event.sender, reusable.entry.info);
        return { id: reusable.id };
      }

    const shell = resolveShell(options.shell);
    const id = crypto.randomUUID();
    const cwd = workspaceStore.resolveLaunchDirectory(options.cwd);
    const startedAt = new Date().toISOString();
    const env = buildTerminalSpawnEnv(process.env, {
      workspaceName: options.workspaceName,
    });
    const spawnOptions = createWindowsSpawnOptions({
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env,
    });

    let terminal;
    try {
      terminal = await spawnCoordinator.enqueueSpawn(shell.file, shell.args, spawnOptions);
    } catch (error) {
      console.error('Failed to spawn terminal session:', error);
      throw error;
    }
    const info = {
      id,
      pid: terminal.pid,
      cwd,
      shell: shell.label || path.basename(shell.file),
      status: 'running',
      startedAt,
      lastActiveAt: startedAt,
      endedAt: null,
      exitCode: null,
      detectedPort: null,
    };

    terminals.set(id, {
      terminal,
      terminalId,
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

  ipcMain.handle('terminal:dispose', async (_event, id) => {
    const entry = terminals.get(id);
    if (!entry) {
      return;
    }

    terminals.delete(id);
    await spawnCoordinator.enqueueDispose(async () => {
      entry.terminal?.kill();
    });
  });

  ipcMain.handle('terminal:list-wsl-distros', async () => {
    return listWslDistros();
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

  ipcMain.handle('app:apply-title-bar-theme', (_event, theme) => {
    applyTitleBarTheme(mainWindow, theme);
  });
}

app.whenReady()
  .then(async () => {
    await workspaceStore.init(app.getPath('userData'));
    installApplicationMenu();
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
