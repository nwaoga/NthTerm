const DEFAULT_WINDOWS_SPAWN_DELAY_MS = 350;
const DEFAULT_WINDOWS_DISPOSE_DELAY_MS = 200;
const MAX_SPAWN_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 200;

function isRetryableSpawnError(error) {
  const parts = [
    error?.message,
    error?.code,
    error?.errno,
    error?.cause?.message,
    error,
  ];
  const message = parts.filter(Boolean).map(String).join(' ');
  return /attachconsole|conpty|winpty|pseudo|pty|spawn|eio|ebusy|eacces|eperm|access is denied|operation not permitted|cannot create process|failed to launch/i.test(message);
}

class TerminalSpawnCoordinator {
  constructor(options = {}) {
    this.platform = options.platform ?? process.platform;
    this.spawnFn = options.spawnFn;
    this.delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.chain = Promise.resolve();
    this.lastWindowsSpawnAt = 0;
  }

  enqueueSpawn(file, args, spawnOptions) {
    const task = () => this.spawnWithRetry(file, args, spawnOptions);
    return this.enqueueOperation(task);
  }

  enqueueOperation(operation) {
    const result = this.chain.then(operation, operation);
    this.chain = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async enqueueDispose(disposeFn) {
    return this.enqueueOperation(async () => {
      try {
        await disposeFn();
      } finally {
        await this.waitForWindowsDisposeSpacing();
      }
    });
  }

  async spawnWithRetry(file, args, spawnOptions) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_SPAWN_ATTEMPTS; attempt += 1) {
      try {
        await this.waitForWindowsSpacing();
        return this.spawnFn(file, args, spawnOptions);
      } catch (error) {
        lastError = error;
        if (!isRetryableSpawnError(error) || attempt >= MAX_SPAWN_ATTEMPTS) {
          throw error;
        }

        await this.delay(RETRY_BASE_DELAY_MS * attempt);
      }
    }

    throw lastError;
  }

  async waitForWindowsSpacing() {
    if (this.platform !== 'win32') {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastWindowsSpawnAt;
    if (this.lastWindowsSpawnAt > 0 && elapsed < DEFAULT_WINDOWS_SPAWN_DELAY_MS) {
      await this.delay(DEFAULT_WINDOWS_SPAWN_DELAY_MS - elapsed);
    }

    this.lastWindowsSpawnAt = Date.now();
  }

  async waitForWindowsDisposeSpacing() {
    if (this.platform !== 'win32') {
      return;
    }

    await this.delay(DEFAULT_WINDOWS_DISPOSE_DELAY_MS);
  }
}

function createWindowsSpawnOptions(baseOptions) {
  if (process.platform !== 'win32') {
    return baseOptions;
  }

  return {
    ...baseOptions,
    useConpty: true,
    conptyInheritCursor: false,
  };
}

module.exports = {
  TerminalSpawnCoordinator,
  createWindowsSpawnOptions,
  DEFAULT_WINDOWS_SPAWN_DELAY_MS,
  DEFAULT_WINDOWS_DISPOSE_DELAY_MS,
  MAX_SPAWN_ATTEMPTS,
  isRetryableSpawnError,
};
