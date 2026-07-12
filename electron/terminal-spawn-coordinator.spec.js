const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TerminalSpawnCoordinator,
  DEFAULT_WINDOWS_DISPOSE_DELAY_MS,
  DEFAULT_WINDOWS_SPAWN_DELAY_MS,
  isRetryableSpawnError,
} = require('./terminal-spawn-coordinator');

test('isRetryableSpawnError matches Windows PTY spawn failures', () => {
  assert.equal(isRetryableSpawnError(new Error('AttachConsole failed')), true);
  assert.equal(isRetryableSpawnError(new Error('conpty init failed')), true);
  assert.equal(isRetryableSpawnError(Object.assign(new Error('read failed'), { code: 'EIO' })), true);
  assert.equal(isRetryableSpawnError(new Error('Access is denied')), true);
  assert.equal(isRetryableSpawnError(new Error('cannot create process under load')), true);
  assert.equal(isRetryableSpawnError(new Error('permission denied')), false);
});

test('enqueueSpawn serializes concurrent spawn requests', async () => {
  const spawnTimes = [];
  let spawnCount = 0;
  const delays = [];

  const coordinator = new TerminalSpawnCoordinator({
    platform: 'win32',
    spawnFn: async () => {
      spawnCount += 1;
      spawnTimes.push(Date.now());
      return { pid: spawnCount };
    },
    delay: (ms) => {
      delays.push(ms);
      return Promise.resolve();
    },
  });

  const [first, second] = await Promise.all([
    coordinator.enqueueSpawn('powershell.exe', [], {}),
    coordinator.enqueueSpawn('powershell.exe', [], {}),
  ]);

  assert.equal(first.pid, 1);
  assert.equal(second.pid, 2);
  assert.equal(spawnCount, 2);
  assert.ok(delays.length > 0);
  assert.ok(delays.some((ms) => ms >= DEFAULT_WINDOWS_SPAWN_DELAY_MS - 5));
  assert.ok(spawnTimes[1] >= spawnTimes[0]);
});

test('enqueueOperation serializes dispose and spawn work', async () => {
  const events = [];
  const coordinator = new TerminalSpawnCoordinator({
    platform: 'win32',
    spawnFn: async () => {
      events.push('spawn');
      return { pid: 1 };
    },
    delay: async (ms) => {
      events.push(`delay:${ms}`);
    },
  });

  await Promise.all([
    coordinator.enqueueDispose(async () => {
      events.push('dispose');
    }),
    coordinator.enqueueSpawn('powershell.exe', [], {}),
  ]);

  assert.deepEqual(events, ['dispose', `delay:${DEFAULT_WINDOWS_DISPOSE_DELAY_MS}`, 'spawn']);
});

test('enqueueDispose preserves Windows cooldown when dispose fails', async () => {
  const events = [];
  const coordinator = new TerminalSpawnCoordinator({
    platform: 'win32',
    spawnFn: async () => {
      events.push('spawn');
      return { pid: 1 };
    },
    delay: async (ms) => {
      events.push(`delay:${ms}`);
    },
  });

  await assert.rejects(
    coordinator.enqueueDispose(async () => {
      events.push('dispose');
      throw new Error('kill failed');
    }),
    /kill failed/
  );

  await coordinator.enqueueSpawn('powershell.exe', [], {});

  assert.deepEqual(events, ['dispose', `delay:${DEFAULT_WINDOWS_DISPOSE_DELAY_MS}`, 'spawn']);
});

test('spawnWithRetry retries retryable Windows spawn failures', async () => {
  let attempts = 0;
  const coordinator = new TerminalSpawnCoordinator({
    platform: 'linux',
    spawnFn: () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('AttachConsole failed');
      }

      return { pid: 42 };
    },
    delay: async () => undefined,
  });

  const terminal = await coordinator.enqueueSpawn('bash', [], {});
  assert.equal(terminal.pid, 42);
  assert.equal(attempts, 2);
});
