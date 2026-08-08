const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expectedReleaseAssetNames } = require('./release-assets');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('expectedReleaseAssetNames matches electron-builder Win/mac matrix', () => {
  assert.deepEqual(expectedReleaseAssetNames('0.1.0-rc.2'), [
    'NthTerm-0.1.0-rc.2-win-x64.exe',
    'NthTerm-0.1.0-rc.2-win-x64.zip',
    'NthTerm-0.1.0-rc.2-mac-arm64.dmg',
    'NthTerm-0.1.0-rc.2-mac-arm64.zip',
    'NthTerm-0.1.0-rc.2-mac-x64.dmg',
    'NthTerm-0.1.0-rc.2-mac-x64.zip',
  ]);
});

test('expectedReleaseAssetNames rejects empty version', () => {
  assert.throws(() => expectedReleaseAssetNames(''), /version is required/);
});

test('package version projects the current RC asset filenames', () => {
  const names = expectedReleaseAssetNames(packageJson.version, packageJson.build.productName);
  assert.equal(names.length, 6);
  assert.ok(names.every((name) => name.includes(packageJson.version)));
  assert.match(packageJson.build.win.artifactName, /\$\{productName\}-\$\{version\}-\$\{os\}-\$\{arch\}\.\$\{ext\}/);
  assert.match(packageJson.build.mac.artifactName, /\$\{productName\}-\$\{version\}-\$\{os\}-\$\{arch\}\.\$\{ext\}/);
});

test('CI publishes a GitHub Release from unsigned Win/mac artifacts on version tags', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /publish-github-release:/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.match(workflow, /startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(workflow, /nthterm-windows-unsigned/);
  assert.match(workflow, /nthterm-macos-unsigned/);
});

test('dispatch workflow can backfill a GitHub Release from a prior artifact run', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'publish-release.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /workflow_run_id/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.match(workflow, /run-id: \$\{\{ inputs\.workflow_run_id \}\}/);
});
