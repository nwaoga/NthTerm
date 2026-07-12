const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredAssets = [
  'build/icon.png',
  'build/icon.ico',
  'build/installerIcon.ico',
  'build/uninstallerIcon.ico',
  'build/installerHeader.bmp',
  'build/installerSidebar.bmp',
  'build/uninstallerSidebar.bmp',
  'public/favicon.ico',
];

test('release branding assets exist for Electron Builder', () => {
  for (const relativePath of requiredAssets) {
    const absolutePath = path.join(root, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, `missing ${relativePath}`);
    assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} is empty`);
  }
});

test('electron-builder config wires Windows branding without signing secrets', () => {
  const build = packageJson.build;

  assert.equal(build.directories.buildResources, 'build');
  assert.equal(build.win.icon, 'build/icon.ico');
  assert.equal(build.nsis.installerIcon, 'build/installerIcon.ico');
  assert.equal(build.nsis.uninstallerIcon, 'build/uninstallerIcon.ico');
  assert.equal(build.nsis.installerHeader, 'build/installerHeader.bmp');
  assert.equal(build.nsis.installerSidebar, 'build/installerSidebar.bmp');
  assert.equal(build.nsis.uninstallerSidebar, 'build/uninstallerSidebar.bmp');
  assert.equal(build.publish, null);
  assert.ok(build.files.includes('build/icon.ico'));
  assert.equal(Object.prototype.hasOwnProperty.call(build.win, 'certificateFile'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(build.win, 'certificateSubjectName'), false);
  assert.equal(build.nsis.perMachine, false);
  assert.equal(build.nsis.oneClick, false);
});

test('Windows installer validation script is present for Task 6 regression', () => {
  const scriptPath = path.join(root, 'scripts', 'validate-windows-installer.ps1');
  assert.equal(fs.existsSync(scriptPath), true);
  const contents = fs.readFileSync(scriptPath, 'utf8');
  assert.match(contents, /\/S/);
  assert.match(contents, /nthterm\.sqlite/);
  assert.match(contents, /LOCALAPPDATA/);
});
