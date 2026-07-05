const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { PATCH_MARKER, patchConptyConsoleListAgent } = require('./patch-node-pty-windows');

const SAMPLE_AGENT = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var getConsoleProcessList = utils_1.loadNativeModule('conpty_console_list').module.getConsoleProcessList;
var shellPid = parseInt(process.argv[2], 10);
var consoleProcessList = getConsoleProcessList(shellPid);
process.send({ consoleProcessList: consoleProcessList });
process.exit(0);
`;

test('patchConptyConsoleListAgent wraps getConsoleProcessList in try/catch', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nthterm-pty-patch-'));
  const agentPath = path.join(tempDir, 'conpty_console_list_agent.js');

  try {
    fs.writeFileSync(agentPath, SAMPLE_AGENT, 'utf8');
    assert.equal(patchConptyConsoleListAgent(agentPath), true);

    const patched = fs.readFileSync(agentPath, 'utf8');
    assert.match(patched, new RegExp(PATCH_MARKER));
    assert.match(patched, /try\s*{\s*consoleProcessList = getConsoleProcessList\(shellPid\);/);
    assert.match(patched, /consoleProcessList = \[shellPid\];/);
    assert.equal(patchConptyConsoleListAgent(agentPath), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
