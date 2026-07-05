const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'NthTerm AttachConsole fallback';
const TARGET_LINE = 'var consoleProcessList = getConsoleProcessList(shellPid);';
const REPLACEMENT = `var consoleProcessList;
try {
  consoleProcessList = getConsoleProcessList(shellPid);
} catch (error) {
  // ${PATCH_MARKER}: shell may have already exited during ConPTY cleanup.
  consoleProcessList = [shellPid];
}`;

function patchConptyConsoleListAgent(agentPath) {
  if (!fs.existsSync(agentPath)) {
    return false;
  }

  const original = fs.readFileSync(agentPath, 'utf8');
  if (original.includes(PATCH_MARKER)) {
    return true;
  }

  if (!original.includes(TARGET_LINE)) {
    console.warn(`[nthterm] Skipping node-pty patch; unexpected agent format at ${agentPath}`);
    return false;
  }

  fs.writeFileSync(agentPath, original.replace(TARGET_LINE, REPLACEMENT), 'utf8');
  return true;
}

if (require.main === module) {
  if (process.platform !== 'win32') {
    process.exit(0);
  }

  const agentPath = path.join(__dirname, '..', 'node_modules', 'node-pty', 'lib', 'conpty_console_list_agent.js');
  const patched = patchConptyConsoleListAgent(agentPath);
  if (patched) {
    console.log('[nthterm] Patched node-pty conpty_console_list_agent for Windows AttachConsole failures.');
  }
}

module.exports = {
  PATCH_MARKER,
  patchConptyConsoleListAgent,
};
