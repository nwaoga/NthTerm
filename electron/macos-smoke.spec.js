const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('macOS smoke script covers unsigned launch, persistence, and clean quit', () => {
  const scriptPath = path.join(root, 'scripts', 'smoke-macos.sh');
  assert.equal(fs.existsSync(scriptPath), true);
  const script = fs.readFileSync(scriptPath, 'utf8');
  assert.match(script, /uname -s/);
  assert.match(script, /Darwin/);
  assert.match(script, /com\.apple\.quarantine/);
  assert.match(script, /Application Support/);
  assert.match(script, /nthterm\.sqlite/);
  assert.match(script, /macos-smoke-validation\.json/);
  assert.match(script, /hdiutil attach/);
  assert.match(script, /ditto -x -k/);
});

test('package and CI wire smoke:mac into the macOS release job', () => {
  assert.equal(packageJson.scripts['smoke:mac'], 'bash scripts/smoke-macos.sh');

  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(workflow, /Smoke-test unsigned macOS app \(#139\)/);
  assert.match(workflow, /npm run smoke:mac/);
  assert.match(workflow, /macos-smoke-validation\.json/);
});
