const test = require('node:test');
const assert = require('node:assert/strict');

const { getWindowsPowerShell, resolveShell } = require('./resolve-shell');

test('getWindowsPowerShell returns a PowerShell launch profile', () => {
  const shell = getWindowsPowerShell();

  assert.ok(shell.file.endsWith('powershell.exe') || shell.file.endsWith('pwsh.exe'));
  assert.deepEqual(shell.args, ['-NoLogo']);
});

test('resolveShell maps WSL distro preferences to wsl.exe launch arguments', () => {
  const shell = resolveShell('wsl:Ubuntu-24.04', { platform: 'win32' });

  assert.equal(shell.file, 'wsl.exe');
  assert.deepEqual(shell.args, ['-d', 'Ubuntu-24.04']);
  assert.equal(shell.label, 'WSL: Ubuntu-24.04');
});

test('resolveShell preserves named shell preferences', () => {
  assert.deepEqual(resolveShell('cmd', { platform: 'win32' }), { file: 'cmd.exe', args: [] });
  assert.deepEqual(resolveShell('bash', { platform: 'linux' }), { file: '/bin/bash', args: [] });
  assert.deepEqual(resolveShell('zsh', { platform: 'darwin' }), { file: '/bin/zsh', args: [] });
});

test('resolveShell defaults to zsh on macOS', () => {
  const previousShell = process.env.SHELL;
  process.env.SHELL = '/bin/zsh';

  try {
    assert.deepEqual(resolveShell('', { platform: 'darwin' }), {
      file: '/bin/zsh',
      args: [],
    });
    assert.deepEqual(resolveShell(undefined, { platform: 'darwin' }), {
      file: '/bin/zsh',
      args: [],
    });
  } finally {
    if (previousShell === undefined) {
      delete process.env.SHELL;
    } else {
      process.env.SHELL = previousShell;
    }
  }
});
