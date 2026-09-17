'use strict';

const { BrowserWindow, ipcMain, app } = require('electron');

/**
 * @typedef {'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'} UpdateStatusPhase
 */

/**
 * @typedef {{
 *   phase: UpdateStatusPhase;
 *   version?: string | null;
 *   currentVersion?: string;
 *   percent?: number | null;
 *   message?: string | null;
 * }} UpdateStatusPayload
 */

/**
 * @param {object} [options]
 * @param {boolean} [options.isPackaged]
 * @param {() => string} [options.getVersion]
 * @param {(channel: string, payload: UpdateStatusPayload) => void} [options.broadcast]
 * @param {object} [options.autoUpdater]
 * @param {typeof ipcMain} [options.ipc]
 */
function createAutoUpdateController(options = {}) {
  const isPackaged = options.isPackaged ?? app.isPackaged;
  const getVersion = options.getVersion ?? (() => app.getVersion());
  const ipc = options.ipc ?? ipcMain;
  const autoUpdater = options.autoUpdater ?? null;

  let handlersRegistered = false;
  let checkStarted = false;
  /** @type {UpdateStatusPayload} */
  let lastStatus = {
    phase: 'idle',
    currentVersion: getVersion(),
    version: null,
    percent: null,
    message: null,
  };

  function broadcast(payload) {
    lastStatus = {
      ...lastStatus,
      ...payload,
      currentVersion: getVersion(),
    };

    if (typeof options.broadcast === 'function') {
      options.broadcast('updates:status', lastStatus);
      return;
    }

    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('updates:status', lastStatus);
      }
    }
  }

  function ensureConfigured() {
    if (!isPackaged || !autoUpdater) {
      return false;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.allowPrerelease = true;
    autoUpdater.autoInstallOnAppQuit = true;
    return true;
  }

  function wireUpdaterEvents() {
    if (!autoUpdater || autoUpdater.__nthTermWired) {
      return;
    }

    autoUpdater.__nthTermWired = true;

    autoUpdater.on('checking-for-update', () => {
      broadcast({ phase: 'checking', message: null, percent: null });
    });

    autoUpdater.on('update-available', (info) => {
      broadcast({
        phase: 'available',
        version: info?.version ?? null,
        message: null,
        percent: null,
      });
    });

    autoUpdater.on('update-not-available', () => {
      broadcast({
        phase: 'not-available',
        version: null,
        message: null,
        percent: null,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      broadcast({
        phase: 'downloading',
        percent: typeof progress?.percent === 'number' ? progress.percent : null,
        message: null,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      broadcast({
        phase: 'ready',
        version: info?.version ?? lastStatus.version,
        percent: 100,
        message: null,
      });
    });

    autoUpdater.on('error', (error) => {
      broadcast({
        phase: 'error',
        message: error?.message || String(error),
        percent: null,
      });
    });
  }

  async function checkForUpdates() {
    if (!ensureConfigured()) {
      broadcast({
        phase: 'not-available',
        message: 'Updates are only available in packaged builds.',
      });
      return { ok: false, reason: 'not-packaged' };
    }

    wireUpdaterEvents();
    broadcast({ phase: 'checking', message: null, percent: null });

    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, updateInfo: result?.updateInfo ?? null };
    } catch (error) {
      broadcast({
        phase: 'error',
        message: error?.message || String(error),
      });
      return { ok: false, reason: 'check-failed', message: error?.message || String(error) };
    }
  }

  function quitAndInstall() {
    if (!ensureConfigured()) {
      return { ok: false, reason: 'not-packaged' };
    }

    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  }

  function registerHandlers() {
    if (handlersRegistered) {
      return;
    }

    handlersRegistered = true;

    ipc.handle('updates:get-version', () => getVersion());
    ipc.handle('updates:get-status', () => lastStatus);
    ipc.handle('updates:check', () => checkForUpdates());
    ipc.handle('updates:quit-and-install', () => quitAndInstall());
  }

  function startLaunchCheck() {
    if (!isPackaged || checkStarted) {
      return;
    }

    checkStarted = true;
    setTimeout(() => {
      void checkForUpdates();
    }, 2500);
  }

  return {
    registerHandlers,
    startLaunchCheck,
    checkForUpdates,
    quitAndInstall,
    getLastStatus: () => lastStatus,
  };
}

module.exports = {
  createAutoUpdateController,
};
