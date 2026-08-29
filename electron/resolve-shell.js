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

function getWindowsBash(pathExistsFn = pathExists) {
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);
  const relativePaths = [
    ['Git', 'bin', 'bash.exe'],
    ['Git', 'usr', 'bin', 'bash.exe'],
  ];

  for (const root of roots) {
    for (const relativePath of relativePaths) {
      const candidate = path.join(root, ...relativePath);
      if (pathExistsFn(candidate)) {
        return { file: candidate, args: ['--login', '-i'] };
      }
    }
  }

  return { file: 'bash.exe', args: [] };
}

function resolveShell(preference, options = {}) {
  const platform = options.platform || process.platform;
  const normalized = (preference || '').trim();
  const normalizedLower = normalized.toLowerCase();

  if (normalizedLower.startsWith('wsl:')) {
    const distro = normalized.slice(4).trim();
    return {
      file: 'wsl.exe',
      args: distro ? ['-d', distro] : [],
      label: distro ? `WSL: ${distro}` : 'WSL',
    };
  }

  if (!normalizedLower) {
    return getDefaultShell(platform);
  }

  if (normalizedLower === 'powershell' || normalizedLower === 'powershell.exe') {
    return getWindowsPowerShell();
  }

  if (normalizedLower === 'cmd' || normalizedLower === 'cmd.exe') {
    return { file: 'cmd.exe', args: [] };
  }

  if (normalizedLower === 'bash' || normalizedLower === 'bash.exe') {
    return platform === 'win32' ? getWindowsBash(options.pathExists) : { file: '/bin/bash', args: [] };
  }

  if (normalizedLower === 'zsh' || normalizedLower === 'zsh.exe') {
    return platform === 'win32'
      ? { file: 'zsh.exe', args: [] }
      : { file: '/bin/zsh', args: [] };
  }

  return getDefaultShell(platform);
}

function getDefaultShell(platform = process.platform) {
  if (platform === 'win32') {
    return getWindowsPowerShell();
  }

  if (platform === 'darwin') {
    return {
      file: process.env.SHELL || '/bin/zsh',
      args: [],
    };
  }

  return {
    file: process.env.SHELL || '/bin/bash',
    args: [],
  };
}

module.exports = {
  getDefaultShell,
  getPowerShell7Path,
  getWindowsBash,
  getWindowsPowerShell,
  pathExists,
  resolveShell,
};
