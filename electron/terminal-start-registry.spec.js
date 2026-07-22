const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TerminalStartRegistry,
  createTerminalStartKey,
  findReusableTerminal,
} = require('./terminal-start-registry');

test('coalesces concurrent starts for the same stable terminal', async () => {
  const registry = new TerminalStartRegistry();
  let starts = 0;
  let release;
  const start = () => {
    starts += 1;
    return new Promise((resolve) => {
      release = resolve;
    });
  };

  const first = registry.run('7:terminal-1', start);
  const second = registry.run('7:terminal-1', start);

  assert.equal(starts, 0);
  await Promise.resolve();
  assert.equal(starts, 1);
  release({ id: 'session-1' });
  assert.deepEqual(await Promise.all([first, second]), [
    { id: 'session-1' },
    { id: 'session-1' },
  ]);
});

test('reuses a running session owned by the same renderer and terminal', () => {
  const terminals = new Map([
    ['session-1', {
      ownerWebContentsId: 7,
      terminalId: 'terminal-1',
      terminal: {},
      info: { status: 'running' },
    }],
  ]);

  assert.equal(createTerminalStartKey(7, ' terminal-1 '), '7:terminal-1');
  assert.equal(findReusableTerminal(terminals, 7, 'terminal-1')?.id, 'session-1');
  assert.equal(findReusableTerminal(terminals, 8, 'terminal-1'), null);
});
