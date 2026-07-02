export interface SessionListItem {
  id: string;
  name: string;
  icon: string;
  accent: string;
}

export interface TemplateListItem {
  name: string;
  accent: 'amber' | 'violet' | 'cyan' | 'blue' | 'slate';
  icon: string;
  templateId: string;
  cwd: string;
}

export interface RuntimeTab {
  id: string;
  title: string;
  cwd: string;
  status: string;
  accent: string;
  shell: string;
  startupCommand: string;
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

export interface RuntimePane {
  id: string;
  tabId: string | null;
  session?: PaneSessionSnapshot | null;
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

export const WORKSPACE_TEMPLATES: TemplateListItem[] = [
  {
    name: 'Angular App',
    accent: 'amber',
    icon: 'spark',
    templateId: 'angular-app',
    cwd: 'C:\\Projects\\AngularApp',
  },
  {
    name: 'ASP.NET API',
    accent: 'violet',
    icon: 'server',
    templateId: 'aspnet-api',
    cwd: 'C:\\Projects\\AspNetApi',
  },
  {
    name: 'Full Stack',
    accent: 'cyan',
    icon: 'cloud',
    templateId: 'full-stack',
    cwd: 'C:\\Projects\\FullStack',
  },
  {
    name: 'Docker Compose',
    accent: 'blue',
    icon: 'server',
    templateId: 'docker-compose',
    cwd: 'C:\\Projects\\DockerCompose',
  },
  {
    name: 'Empty Workspace',
    accent: 'slate',
    icon: 'person',
    templateId: 'empty-workspace',
    cwd: '.',
  },
];

export const SHELL_OPTIONS = [
  { value: '', label: 'System Default' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
] as const;
