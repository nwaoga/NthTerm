const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'workspace-store.js'), 'utf8');

test('empty databases seed Studio Stack instead of Cloud POS', () => {
  assert.match(source, /name: 'Studio Stack'/);
  assert.doesNotMatch(source, /Cloud POS/);
});
