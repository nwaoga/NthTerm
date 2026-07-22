const test = require('node:test');
const assert = require('node:assert/strict');

const { listWslDistros, parseWslDistroList } = require('./wsl-distros');

test('parseWslDistroList removes default marker and blank lines', () => {
  assert.deepEqual(parseWslDistroList('* Ubuntu-24.04\r\nDebian\r\n\r\n'), [
    'Ubuntu-24.04',
    'Debian',
  ]);
});

test('listWslDistros returns an empty list off Windows', async () => {
  const distros = await listWslDistros({
    platform: 'linux',
    execFile: () => {
      throw new Error('should not execute');
    },
  });

  assert.deepEqual(distros, []);
});

test('listWslDistros invokes wsl.exe on Windows', async () => {
  const distros = await listWslDistros({
    platform: 'win32',
    execFile: (file, args, _options, callback) => {
      assert.equal(file, 'wsl.exe');
      assert.deepEqual(args, ['--list', '--quiet']);
      callback(null, 'Ubuntu\r\nDebian\r\n');
    },
  });

  assert.deepEqual(distros, ['Ubuntu', 'Debian']);
});
