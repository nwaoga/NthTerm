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

test('electron-builder config wires Windows and macOS branding without signing secrets', () => {
  const build = packageJson.build;

  assert.equal(build.directories.buildResources, 'build');
  assert.equal(build.win.icon, 'build/icon.ico');
  assert.equal(build.mac.icon, 'build/icon.png');
  assert.equal(build.mac.category, 'public.app-category.developer-tools');
  assert.equal(build.mac.identity, null);
  assert.equal(build.mac.hardenedRuntime, true);
  assert.equal(build.nsis.installerIcon, 'build/installerIcon.ico');
  assert.equal(build.nsis.uninstallerIcon, 'build/uninstallerIcon.ico');
  assert.equal(build.nsis.installerHeader, 'build/installerHeader.bmp');
  assert.equal(build.nsis.installerSidebar, 'build/installerSidebar.bmp');
  assert.equal(build.nsis.uninstallerSidebar, 'build/uninstallerSidebar.bmp');
  assert.equal(build.publish, null);
  assert.ok(build.files.includes('build/icon.ico'));
  assert.ok(build.files.includes('build/icon.png'));
  assert.equal(Object.prototype.hasOwnProperty.call(build.win, 'certificateFile'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(build.win, 'certificateSubjectName'), false);
  assert.equal(build.nsis.perMachine, false);
  assert.equal(build.nsis.oneClick, false);
  assert.equal(packageJson.scripts['release:mac'], 'npm run build && electron-builder --mac');
});

test('Windows installer validation script is present for Task 6 regression', () => {
  const scriptPath = path.join(root, 'scripts', 'validate-windows-installer.ps1');
  assert.equal(fs.existsSync(scriptPath), true);
  const contents = fs.readFileSync(scriptPath, 'utf8');
  assert.match(contents, /\/S/);
  assert.match(contents, /nthterm\.sqlite/);
  assert.match(contents, /LOCALAPPDATA/);
  assert.match(contents, /function Get-Sha256/);
  assert.match(contents, /System\.Security\.Cryptography\.SHA256/);
});

test('RC verification contract keeps release metadata and validation entry point aligned', () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+-rc\.\d+$/);
  assert.equal(packageJson.scripts['rc:verify'], 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-rc.ps1');

  const rcScriptPath = path.join(root, 'scripts', 'validate-rc.ps1');
  assert.equal(fs.existsSync(rcScriptPath), true);
  const rcScript = fs.readFileSync(rcScriptPath, 'utf8');
  assert.match(rcScript, /Invoke-NpmScript 'build'/);
  assert.match(rcScript, /Invoke-NpmScript 'test:ci'/);
  assert.match(rcScript, /Invoke-NpmScript 'release:win'/);
  assert.match(rcScript, /validate-windows-installer\.ps1/);

  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /tags:\s*\r?\n\s*- 'v\*'/);
});
