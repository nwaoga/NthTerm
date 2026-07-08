import { TerminalColorTheme } from './terminal-theme.models';

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
  cwd: string;
  shell: string;
  startupCommand: string;
  status: string;
  session?: PaneSessionSnapshot | null;
  theme?: TerminalColorTheme | null;
}

export interface RuntimeTab {
  id: string;
  title: string;
  cwd: string;
  accent: string;
  layoutMode: LayoutMode;
  colSplit: number;
  rowSplit: number;
  focusedTerminalId: string;
  terminals: RuntimeTerminal[];
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
  tabId: string;
  tabTitle: string;
  paneId: string;
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
  lastAttachedTabId: string | null;
  lastExitCode: number | null;
  lastStopReason: string | null;
  lastSessionEndedAt: string | null;
  lastRecoveredAt: string | null;
}

export type LayoutMode = 'grid-2' | 'grid-2x2';

export interface WorkspaceSummary {
  layoutMode: string;
  launchProfile: string;
  tabCount: number;
  paneCount: number;
}

export const SHELL_OPTIONS = [
  { value: '', label: 'System Default' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
] as const;
