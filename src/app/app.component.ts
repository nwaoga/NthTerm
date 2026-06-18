import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { TerminalBridgeService } from './terminal-bridge.service';
import {
  SavedWorkspace,
  WorkspaceBridgeService,
  WorkspaceDraft,
} from './workspace-bridge.service';

interface SessionListItem {
  id: string;
  name: string;
  icon: string;
  accent: string;
}

interface TemplateListItem {
  name: string;
  accent: 'amber' | 'violet' | 'cyan' | 'blue' | 'slate';
  icon: string;
  templateId: string;
  cwd: string;
}

interface RuntimeTab {
  id: string;
  title: string;
  cwd: string;
  status: string;
  accent: string;
}

interface TerminalCard {
  title: string;
  subtitle: string;
  status: string;
  detail: string;
  tone: 'violet' | 'amber' | 'cyan' | 'blue';
  terminal?: boolean;
}

interface UtilityTab {
  label: string;
  count?: number;
  active?: boolean;
}

interface InspectorItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('terminalHost', { static: true })
  private terminalHost?: ElementRef<HTMLDivElement>;

  protected status = 'Loading workspace...';
  protected workspaceName = '';
  protected workingDirectory = '';
  protected lastSavedAt = '';
  protected selectedWorkspace = '';
  protected selectedWorkspaceId = '';
  protected activeInspectorTab: 'tab' | 'session' = 'tab';
  protected activeTabId = '';

  protected sessions: SessionListItem[] = [];
  protected runtimeTabs: RuntimeTab[] = [];

  protected readonly templates: TemplateListItem[] = [
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

  protected readonly terminalCards: TerminalCard[] = [
    { title: 'API', subtitle: 'main', status: 'running', detail: '7192', tone: 'violet', terminal: true },
    { title: 'Angular', subtitle: 'main', status: 'running', detail: '4200', tone: 'amber' },
    { title: 'Database', subtitle: 'local', status: 'running', detail: '5432', tone: 'cyan' },
    { title: 'Docker', subtitle: 'up', status: 'running', detail: '4 containers', tone: 'blue' },
  ];

  protected readonly utilityTabs: UtilityTab[] = [
    { label: 'Output', active: true },
    { label: 'Problems', count: 2 },
    { label: 'Search' },
    { label: 'Command History' },
  ];

  protected inspectorItems: InspectorItem[] = [
    { label: 'Shell', value: 'PowerShell 7.4.2' },
    { label: 'Directory', value: 'Loading...' },
    { label: 'Git Branch', value: 'main' },
    { label: 'Process', value: 'nthterm terminal session' },
    { label: 'Started', value: 'Today' },
    { label: 'Port', value: 'Auto-detected' },
  ];

  protected workspaceSummary = {
    layoutMode: 'grid-2x2',
    launchProfile: 'manual',
    tabCount: 0,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly terminalBridge = inject(TerminalBridgeService);
  private readonly workspaceBridge = inject(WorkspaceBridgeService);

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private sessionId?: string;
  private resizeObserver?: ResizeObserver;
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;
  private activeWorkspace?: SavedWorkspace;

  async ngAfterViewInit(): Promise<void> {
    if (!this.terminalHost) {
      this.status = 'Terminal host was not found.';
      return;
    }

    this.createTerminalSurface();

    const [workspaces, activeWorkspace] = await Promise.all([
      this.workspaceBridge.listWorkspaces(),
      this.workspaceBridge.getActiveWorkspace(),
    ]);

    this.sessions = workspaces.map((workspace) => this.mapSession(workspace));
    this.applyWorkspace(activeWorkspace);
    await this.restoreActiveTabSession();

    this.resizeObserver = new ResizeObserver(() => this.syncTerminalSize());
    this.resizeObserver.observe(this.terminalHost.nativeElement);

    this.destroyRef.onDestroy(() => {
      this.removeDataListener?.();
      this.removeExitListener?.();
      this.resizeObserver?.disconnect();
      this.terminal?.dispose();

      if (this.sessionId) {
        void this.terminalBridge.disposeSession(this.sessionId);
      }
    });
  }

  protected async saveWorkspace(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshSessions();
    this.status = `Saved workspace to ${saved.cwd}`;
  }

  protected async restoreWorkspace(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const restored = await this.workspaceBridge.setActiveWorkspace(this.selectedWorkspaceId);
    this.applyWorkspace(restored);
    await this.restoreActiveTabSession();
  }

  protected async relaunchTerminal(): Promise<void> {
    const activeTab = this.getActiveTab();
    if (!activeTab) {
      return;
    }

    await this.startTerminalSession(activeTab.cwd);
  }

  protected async selectWorkspace(workspaceId: string): Promise<void> {
    if (workspaceId === this.selectedWorkspaceId) {
      return;
    }

    const workspace = await this.workspaceBridge.setActiveWorkspace(workspaceId);
    this.applyWorkspace(workspace);
    await this.restoreActiveTabSession();
  }

  protected async createWorkspaceFromTemplate(template: TemplateListItem): Promise<void> {
    const created = await this.workspaceBridge.createWorkspace({
      name: this.buildWorkspaceName(template.name),
      cwd: template.cwd,
      templateId: template.templateId,
      icon: template.icon,
      accent: template.accent,
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
    });

    this.applyWorkspace(created);
    await this.refreshSessions();
    await this.restoreActiveTabSession();
  }

  protected async createTab(): Promise<void> {
    if (!this.activeWorkspace) {
      return;
    }

    const nextIndex = this.runtimeTabs.length + 1;
    const nextTab: RuntimeTab = {
      id: `tab-${nextIndex}-${Date.now()}`,
      title: `${this.workspaceName} Tab ${nextIndex}`,
      cwd: this.workingDirectory,
      status: 'running',
      accent: this.sessions.find((session) => session.id === this.selectedWorkspaceId)?.accent || 'violet',
    };

    this.runtimeTabs = [...this.runtimeTabs, nextTab];
    this.activeTabId = nextTab.id;
    this.workspaceSummary.tabCount = this.runtimeTabs.length;
    await this.persistWorkspaceState();
    await this.startTerminalSession(nextTab.cwd);
  }

  protected async selectTab(tabId: string): Promise<void> {
    if (tabId === this.activeTabId) {
      return;
    }

    this.activeTabId = tabId;
    const activeTab = this.getActiveTab();
    if (!activeTab) {
      return;
    }

    this.workingDirectory = activeTab.cwd;
    await this.persistWorkspaceState();
    await this.startTerminalSession(activeTab.cwd);
  }

  protected async closeTab(tabId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();

    if (this.runtimeTabs.length <= 1) {
      this.status = 'At least one tab must remain open.';
      return;
    }

    const remainingTabs = this.runtimeTabs.filter((tab) => tab.id !== tabId);
    this.runtimeTabs = remainingTabs;

    if (this.activeTabId === tabId) {
      this.activeTabId = remainingTabs[0].id;
      const activeTab = this.getActiveTab();
      if (activeTab) {
        this.workingDirectory = activeTab.cwd;
        await this.startTerminalSession(activeTab.cwd);
      }
    }

    this.workspaceSummary.tabCount = this.runtimeTabs.length;
    await this.persistWorkspaceState();
  }

  protected setInspectorTab(tab: 'tab' | 'session'): void {
    this.activeInspectorTab = tab;
  }

  protected isSessionActive(session: SessionListItem): boolean {
    return session.id === this.selectedWorkspaceId;
  }

  protected isTabActive(tab: RuntimeTab): boolean {
    return tab.id === this.activeTabId;
  }

  protected trackByName(_index: number, item: { name: string }): string {
    return item.name;
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  protected trackByTitle(_index: number, item: { title: string }): string {
    return item.title;
  }

  private async refreshSessions(): Promise<void> {
    const workspaces = await this.workspaceBridge.listWorkspaces();
    this.sessions = workspaces.map((workspace) => this.mapSession(workspace));
  }

  private buildWorkspaceName(baseName: string): string {
    const usedNames = new Set(this.sessions.map((session) => session.name));
    if (!usedNames.has(baseName)) {
      return baseName;
    }

    let index = 2;
    while (usedNames.has(`${baseName} ${index}`)) {
      index += 1;
    }

    return `${baseName} ${index}`;
  }

  private currentWorkspaceDraft(): WorkspaceDraft {
    const currentSession = this.sessions.find((session) => session.id === this.selectedWorkspaceId);

    return {
      id: this.selectedWorkspaceId,
      name: this.workspaceName.trim() || 'Untitled Workspace',
      cwd: this.workingDirectory.trim(),
      icon: currentSession?.icon || 'cloud',
      accent: currentSession?.accent || 'slate',
      layoutMode: this.workspaceSummary.layoutMode,
      launchProfile: this.workspaceSummary.launchProfile,
      sessionSnapshot: {
        layout: {
          mode: this.workspaceSummary.layoutMode,
          activeTabId: this.activeTabId,
        },
        tabs: this.runtimeTabs.map((tab) => ({
          id: tab.id,
          title: tab.title,
          cwd: tab.cwd,
          status: tab.status,
          accent: tab.accent,
        })),
      },
    };
  }

  private mapSession(workspace: SavedWorkspace): SessionListItem {
    return {
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon || 'cloud',
      accent: workspace.accent || 'slate',
    };
  }

  private createTerminalSurface(): void {
    this.fitAddon = new FitAddon();
    this.terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#0d1320',
        foreground: '#d8e1e8',
        cursor: '#7dd3fc',
        selectionBackground: '#1f3b53',
      },
    });

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalHost!.nativeElement);

    this.terminal.onData((data) => {
      if (this.sessionId) {
        void this.terminalBridge.sendInput(this.sessionId, data);
      }
    });
  }

  private async restoreActiveTabSession(): Promise<void> {
    const activeTab = this.getActiveTab();
    if (!activeTab) {
      this.status = 'No workspace tabs are available.';
      return;
    }

    this.workingDirectory = activeTab.cwd;
    await this.startTerminalSession(activeTab.cwd);
  }

  private async persistWorkspaceState(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshSessions();
  }

  private getActiveTab(): RuntimeTab | undefined {
    return this.runtimeTabs.find((tab) => tab.id === this.activeTabId) || this.runtimeTabs[0];
  }

  private async startTerminalSession(cwd: string): Promise<void> {
    const targetDirectory = cwd.trim();
    if (!targetDirectory) {
      this.status = 'Working directory is required.';
      return;
    }

    this.status = `Launching terminal in ${targetDirectory}...`;

    if (this.sessionId) {
      await this.terminalBridge.disposeSession(this.sessionId);
      this.sessionId = undefined;
    }

    this.removeDataListener?.();
    this.removeExitListener?.();

    this.terminal?.clear();
    this.terminal?.reset();

    this.sessionId = await this.terminalBridge.createSession({ cwd: targetDirectory });
    this.registerTerminalListeners();
    this.syncTerminalSize();
    this.status = `Connected to ${targetDirectory}`;
  }

  private registerTerminalListeners(): void {
    this.removeDataListener = this.terminalBridge.onData((event) => {
      if (event.id === this.sessionId) {
        this.ngZone.runOutsideAngular(() => this.terminal?.write(event.data));
      }
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      if (event.id === this.sessionId) {
        this.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
      }
    });
  }

  private applyWorkspace(workspace: SavedWorkspace): void {
    this.activeWorkspace = workspace;
    this.workspaceName = workspace.name;
    this.selectedWorkspace = workspace.name;
    this.selectedWorkspaceId = workspace.id;
    this.runtimeTabs = workspace.sessionSnapshot?.tabs?.map((tab) => ({
      id: tab.id,
      title: tab.title,
      cwd: tab.cwd,
      status: tab.status,
      accent: tab.accent,
    })) || [];
    this.activeTabId =
      workspace.sessionSnapshot?.layout?.activeTabId ||
      this.runtimeTabs[0]?.id ||
      '';

    const activeTab = this.getActiveTab();
    this.workingDirectory = activeTab?.cwd || workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
    this.workspaceSummary = {
      layoutMode: workspace.layoutMode || 'grid-2x2',
      launchProfile: workspace.launchProfile || 'manual',
      tabCount: this.runtimeTabs.length,
    };

    this.inspectorItems = [
      { label: 'Shell', value: 'PowerShell 7.4.2' },
      { label: 'Directory', value: this.workingDirectory },
      { label: 'Template', value: workspace.templateId || 'custom' },
      { label: 'Layout', value: workspace.layoutMode || 'grid-2x2' },
      { label: 'Launch Profile', value: workspace.launchProfile || 'manual' },
      { label: 'Git Branch', value: 'main' },
      { label: 'Active Tab', value: activeTab?.title || 'n/a' },
      { label: 'Process', value: `${this.workspaceSummary.tabCount} session tab(s)` },
      { label: 'Started', value: 'Restored on launch' },
    ];
  }

  private fitTerminal(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.fitAddon?.fit());
    });
  }

  private syncTerminalSize(): void {
    if (!this.sessionId || !this.terminal || !this.fitAddon) {
      return;
    }

    this.fitTerminal();
    void this.terminalBridge.resizeSession(this.sessionId, this.terminal.cols, this.terminal.rows);
  }
}
