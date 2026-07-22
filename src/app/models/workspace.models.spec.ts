import {
  buildShellOptions,
  buildWorkspaceShellProfileOptions,
  resolveShellOptionLabel,
  resolveWorkspaceShellProfileLabel,
} from './workspace.models';

describe('platform shell option builders', () => {
  it('keeps Windows shells and WSL distros on win32', () => {
    const options = buildShellOptions(['Ubuntu'], 'win32').map((option) => option.value);

    expect(options).toEqual(['', 'powershell', 'cmd', 'bash', 'zsh', 'wsl:Ubuntu']);
  });

  it('hides Windows-only shells and WSL on macOS', () => {
    const options = buildShellOptions(['Ubuntu'], 'darwin').map((option) => option.value);

    expect(options).toEqual(['', 'bash', 'zsh']);
  });

  it('filters workspace shell profiles the same way on linux', () => {
    const options = buildWorkspaceShellProfileOptions(['Ubuntu'], 'linux').map((option) => option.value);

    expect(options).toEqual(['', 'system', 'bash', 'zsh']);
  });

  it('resolves persisted Windows shell labels even when the picker hides them', () => {
    expect(resolveShellOptionLabel('powershell')).toBe('PowerShell');
    expect(resolveShellOptionLabel('cmd')).toBe('Command Prompt');
    expect(resolveShellOptionLabel('wsl:Ubuntu', ['Ubuntu'])).toBe('WSL: Ubuntu');
    expect(resolveWorkspaceShellProfileLabel('cmd')).toBe('Command Prompt');
    expect(resolveWorkspaceShellProfileLabel('wsl:Debian', ['Debian'])).toBe('WSL: Debian');
  });
});
