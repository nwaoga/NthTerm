const { execFile } = require('node:child_process');

function parseWslDistroList(output) {
  return String(output || '')
    .replace(/\0/g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s*/, '').trim())
    .filter(Boolean);
}

function listWslDistros(options = {}) {
  const platform = options.platform || process.platform;
  const execFileFn = options.execFile || execFile;

  if (platform !== 'win32') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    execFileFn('wsl.exe', ['--list', '--quiet'], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      resolve(parseWslDistroList(stdout));
    });
  });
}

module.exports = {
  listWslDistros,
  parseWslDistroList,
};
