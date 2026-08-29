import { TerminalColorTheme } from './terminal-theme.models';
import { HostPlatformId } from '../platform/host-platform';

export interface WorkspaceListItem {
  id: string;
  name: string;
  icon: string;
  accent: string;
}

/** @deprecated Use WorkspaceListItem */
export type SessionListItem = WorkspaceListItem;

export interface RuntimeTerminal {
  id: string;
  name?: string;
  cwd: string;
  shell: string;
  startupCommand: string;
  status: string;
  session?: PaneSessionSnapshot | null;
  theme?: TerminalColorTheme | null;
}

export interface PaneSessionSnapshot {
  sessionId: string | null;
  shell: string;
  cwd: string;
  status: string;
  pid: number | null;
  startedAt: string | null;
  lastActiveAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  detectedPort: number | null;
}

export interface SessionHistoryEntry {
  id: string;
  /** @deprecated Historical label only; tabs removed from product model. */
  tabId?: string;
  /** @deprecated Historical label only; tabs removed from product model. */
  tabTitle?: string;
  paneId: string;
  terminalTitle?: string;
  shell: string;
  cwd: string;
  status: 'running' | 'stopped' | 'killed' | 'failed';
  reason: string;
  startedAt: string | null;
  lastActiveAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  detectedPort: number | null;
}

export interface RecoverySnapshot {
  lastLaunchAt: string | null;
  lastAttachedPaneId: string | null;
  /** @deprecated Tabs removed; kept for migrate-on-read of older snapshots. */
  lastAttachedTabId?: string | null;
  lastExitCode: number | null;
  lastStopReason: string | null;
  lastSessionEndedAt: string | null;
  lastRecoveredAt: string | null;
}

export type LayoutMode = 'grid-2' | 'grid-2x2';
export type ShellId = '' | 'powershell' | 'cmd' | 'bash' | 'zsh' | `wsl:${string}`;
export type WorkspaceShellProfile = ShellId | 'system';
export interface ShellOption {
  value: ShellId;
  label: string;
}

export interface WorkspaceShellProfileOption {
  value: WorkspaceShellProfile;
  label: string;
}

export interface WorkspaceSummary {
  layoutMode: string;
  launchProfile: string;
  paneCount: number;
}

export const SHELL_OPTIONS = [
  { value: '', label: 'System Default' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
] as const satisfies ReadonlyArray<ShellOption>;

export const WORKSPACE_SHELL_PROFILE_OPTIONS = [
  { value: '', label: 'Use App Default' },
  { value: 'system', label: 'System Default' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
] as const satisfies ReadonlyArray<WorkspaceShellProfileOption>;

const WINDOWS_ONLY_SHELL_VALUES = new Set(['powershell', 'cmd']);

export function toWslShellId(distro: string): ShellId {
  return `wsl:${distro.trim()}`;
}

export function isShellId(value: string | null | undefined): value is ShellId {
  return (
    value === '' ||
    value === 'powershell' ||
    value === 'cmd' ||
    value === 'bash' ||
    value === 'zsh' ||
    Boolean(value?.startsWith('wsl:') && value.slice(4).trim())
  );
}

export function isWorkspaceShellProfile(value: string | null | undefined): value is WorkspaceShellProfile {
  return value === 'system' || isShellId(value);
}

export function getOsDefaultShellLabel(platform: HostPlatformId = 'win32'): string {
  if (platform === 'darwin') {
    return 'Zsh';
  }
  if (platform === 'linux') {
    return 'Bash';
  }
  return 'PowerShell';
}

export function formatInheritedShellLabel(baseLabel: string, resolvedLabel: string): string {
  const resolved = resolvedLabel.trim();
  if (!resolved || resolved === baseLabel) {
    return baseLabel;
  }
  return `${baseLabel} (${resolved})`;
}

export function buildShellOptions(
  wslDistros: string[] = [],
  platform: HostPlatformId = 'win32'
): ShellOption[] {
  const shells = SHELL_OPTIONS.filter((option) => {
    if (platform === 'win32') {
      return true;
    }

    return !WINDOWS_ONLY_SHELL_VALUES.has(option.value);
  });

  const wslOptions =
    platform === 'win32'
      ? wslDistros.map((distro) => ({
          value: toWslShellId(distro),
          label: `WSL: ${distro}`,
        }))
      : [];

  const osDefault = getOsDefaultShellLabel(platform);
  return [...shells, ...wslOptions].map((option) =>
    option.value === ''
      ? { ...option, label: formatInheritedShellLabel('System Default', osDefault) }
      : option
  );
}

export function buildWorkspaceShellProfileOptions(
  wslDistros: string[] = [],
  platform: HostPlatformId = 'win32',
  appDefaultShell: string = ''
): WorkspaceShellProfileOption[] {
  const profiles = WORKSPACE_SHELL_PROFILE_OPTIONS.filter((option) => {
    if (platform === 'win32') {
      return true;
    }

    return !WINDOWS_ONLY_SHELL_VALUES.has(option.value);
  });

  const wslOptions =
    platform === 'win32'
      ? wslDistros.map((distro) => ({
          value: toWslShellId(distro),
          label: `WSL: ${distro}`,
        }))
      : [];

  const osDefault = getOsDefaultShellLabel(platform);
  const appDefault = resolveConcreteShellLabel(appDefaultShell, wslDistros, platform);

  return [...profiles, ...wslOptions].map((option) => {
    if (option.value === 'system') {
      return { ...option, label: formatInheritedShellLabel('System Default', osDefault) };
    }
    if (option.value === '') {
      return { ...option, label: formatInheritedShellLabel('Use App Default', appDefault) };
    }
    return option;
  });
}

function resolveConcreteShellLabel(
  shell: string,
  wslDistros: string[] = [],
  platform: HostPlatformId = 'win32'
): string {
  if (!shell || shell === 'system') {
    return getOsDefaultShellLabel(platform);
  }

  const builtin = SHELL_OPTIONS.find((option) => option.value === shell);
  if (builtin) {
    return builtin.label;
  }

  return resolveWslLabel(shell, wslDistros) || getOsDefaultShellLabel(platform);
}

function resolveWslLabel(shell: string, wslDistros: string[] = []): string | undefined {
  if (!shell.startsWith('wsl:')) {
    return undefined;
  }

  const distro = shell.slice(4).trim();
  if (!distro) {
    return undefined;
  }

  const match = wslDistros.find(
    (candidate) => candidate === distro || candidate.toLowerCase() === distro.toLowerCase()
  );
  return `WSL: ${match || distro}`;
}

/** Label lookup for persisted shells, including Windows-only values when running on macOS/Linux. */
export function resolveShellOptionLabel(
  shell: string,
  wslDistros: string[] = [],
  platform: HostPlatformId = 'win32'
): string {
  if (!shell) {
    return formatInheritedShellLabel('System Default', getOsDefaultShellLabel(platform));
  }

  const builtin = SHELL_OPTIONS.find((option) => option.value === shell);
  if (builtin) {
    return builtin.label;
  }

  return (
    resolveWslLabel(shell, wslDistros) ||
    formatInheritedShellLabel('System Default', getOsDefaultShellLabel(platform))
  );
}

/** Label lookup for persisted workspace profiles across host platforms. */
export function resolveWorkspaceShellProfileLabel(
  profile: string,
  wslDistros: string[] = [],
  platform: HostPlatformId = 'win32',
  appDefaultShell: string = ''
): string {
  if (profile === 'system') {
    return formatInheritedShellLabel('System Default', getOsDefaultShellLabel(platform));
  }
  if (!profile) {
    return formatInheritedShellLabel(
      'Use App Default',
      resolveConcreteShellLabel(appDefaultShell, wslDistros, platform)
    );
  }

  const builtin = WORKSPACE_SHELL_PROFILE_OPTIONS.find((option) => option.value === profile);
  if (builtin) {
    return builtin.label;
  }

  return (
    resolveWslLabel(profile, wslDistros) ||
    formatInheritedShellLabel(
      'Use App Default',
      resolveConcreteShellLabel(appDefaultShell, wslDistros, platform)
    )
  );
}
