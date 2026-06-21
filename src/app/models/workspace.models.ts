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

export interface RuntimePane {
  id: string;
  tabId: string | null;
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
    cwd: 'C:\\Users\\blakb\\Documents\\Codex\\NthTerm\\repo',
  },
];

export const SHELL_OPTIONS = [
  { value: '', label: 'System Default' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
] as const;
