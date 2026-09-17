'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createAutoUpdateController } = require('./auto-update');

function createFakeIpc() {
  const handlers = new Map();
  return {
    handlers,
    handle(channel, listener) {
      handlers.set(channel, listener);
    },
    async invoke(channel, ...args) {
      const listener = handlers.get(channel);
      return listener({}, ...args);
    },
  };
}

function createFakeUpdater() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    autoDownload: false,
    allowPrerelease: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: async () => ({ updateInfo: { version: '0.1.0-rc.7' } }),
    quitAndInstallCalls: [],
    quitAndInstall(isSilent, isForceRunAfter) {
      this.quitAndInstallCalls.push({ isSilent, isForceRunAfter });
    },
  });
}

test('auto-update is a no-op check outside packaged builds', async () => {
  const broadcasts = [];
  const controller = createAutoUpdateController({
    isPackaged: false,
    getVersion: () => '0.1.0-rc.6',
    broadcast: (_channel, payload) => broadcasts.push(payload),
    autoUpdater: createFakeUpdater(),
  });

  const result = await controller.checkForUpdates();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not-packaged');
  assert.equal(broadcasts.at(-1)?.phase, 'not-available');
});

test('packaged launch check configures updater and forwards ready status', async () => {
  const broadcasts = [];
  const updater = createFakeUpdater();
  const ipc = createFakeIpc();
  const controller = createAutoUpdateController({
    isPackaged: true,
    getVersion: () => '0.1.0-rc.6',
    broadcast: (_channel, payload) => broadcasts.push(payload),
    autoUpdater: updater,
    ipc,
  });

  controller.registerHandlers();
  const result = await ipc.invoke('updates:check');

  assert.equal(result.ok, true);
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.allowPrerelease, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal(broadcasts.some((entry) => entry.phase === 'checking'), true);

  updater.emit('update-available', { version: '0.1.0-rc.7' });
  updater.emit('download-progress', { percent: 42 });
  updater.emit('update-downloaded', { version: '0.1.0-rc.7' });

  assert.equal(broadcasts.at(-1)?.phase, 'ready');
  assert.equal(broadcasts.at(-1)?.version, '0.1.0-rc.7');
  assert.equal(broadcasts.at(-1)?.percent, 100);
  assert.equal(await ipc.invoke('updates:get-version'), '0.1.0-rc.6');
});

test('quitAndInstall forwards to electron-updater when packaged', async () => {
  const updater = createFakeUpdater();
  const ipc = createFakeIpc();
  const controller = createAutoUpdateController({
    isPackaged: true,
    getVersion: () => '0.1.0-rc.6',
    autoUpdater: updater,
    ipc,
  });

  controller.registerHandlers();
  const result = await ipc.invoke('updates:quit-and-install');
  assert.equal(result.ok, true);
  assert.deepEqual(updater.quitAndInstallCalls, [{ isSilent: false, isForceRunAfter: true }]);
});
