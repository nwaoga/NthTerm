const fs = require('node:fs');
const path = require('node:path');

function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function getPowerShell7Path() {
  const roots = [
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.LocalAppData
      ? path.join(process.env.LocalAppData, 'Microsoft', 'WindowsApps')
      : null,
  ].filter(Boolean);

  for (const root of roots) {
    const candidate = path.join(root, 'PowerShell', '7', 'pwsh.exe');
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getWindowsPowerShell() {
  const pwsh = getPowerShell7Path();
  if (pwsh) {
    return { file: pwsh, args: ['-NoLogo'] };
  }

  return { file: 'powershell.exe', args: ['-NoLogo'] };
}

module.exports = {
  getPowerShell7Path,
  getWindowsPowerShell,
  pathExists,
};
