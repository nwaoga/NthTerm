class TerminalStartRegistry {
  constructor() {
    this.pendingStarts = new Map();
  }

  run(key, start) {
    if (!key) {
      return start();
    }

    const pending = this.pendingStarts.get(key);
    if (pending) {
      return pending;
    }

    const started = Promise.resolve().then(start);
    const guarded = started.finally(() => {
      if (this.pendingStarts.get(key) === guarded) {
        this.pendingStarts.delete(key);
      }
    });
    this.pendingStarts.set(key, guarded);
    return guarded;
  }
}

function createTerminalStartKey(webContentsId, terminalId) {
  const normalizedTerminalId = typeof terminalId === 'string' ? terminalId.trim() : '';
  return normalizedTerminalId ? `${webContentsId}:${normalizedTerminalId}` : '';
}

function findReusableTerminal(terminals, webContentsId, terminalId) {
  if (!terminalId) {
    return null;
  }

  for (const [id, entry] of terminals.entries()) {
    if (
      entry.ownerWebContentsId === webContentsId &&
      entry.terminalId === terminalId &&
      entry.terminal &&
      entry.info?.status === 'running'
    ) {
      return { id, entry };
    }
  }

  return null;
}

module.exports = {
  TerminalStartRegistry,
  createTerminalStartKey,
  findReusableTerminal,
};
