const test = require('node:test');
const assert = require('node:assert/strict');

const { getWindowsPowerShell } = require('./resolve-shell');

test('getWindowsPowerShell returns a PowerShell launch profile', () => {
  const shell = getWindowsPowerShell();

  assert.ok(shell.file.endsWith('powershell.exe') || shell.file.endsWith('pwsh.exe'));
  assert.deepEqual(shell.args, ['-NoLogo']);
});
