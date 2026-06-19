import {
  AfterViewInit,
  ChangeDetectorRef,
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

import { TerminalBridgeService, TerminalInfo } from './terminal-bridge.service';
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

interface RuntimePane {
  id: string;
  tabId: string | null;
}

type UtilityPanelId = 'output' | 'problems' | 'search' | 'command-history';

interface UtilityTab {
  id: UtilityPanelId;
  label: string;
  count?: number;
}

interface OutputLine {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface ProblemEntry {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source: string;
  timestamp: string;
}

interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: string;
  tabTitle: string;
}

interface SearchResultGroup {
  label: string;
  items: { id: string; title: string; detail: string }[];
}

interface InspectorItem {
  label: string;
  value: string;
}

interface RuntimeSessionInfo extends TerminalInfo {}

type LayoutMode = 'grid-2' | 'grid-2x2';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('terminalHost')
  private terminalHost?: ElementRef<HTMLDivElement>;

  protected status = 'Loading workspace...';
  protected workspaceName = '';
  protected workingDirectory = '';
  protected lastSavedAt = '';
  protected selectedWorkspace = '';
  protected selectedWorkspaceId = '';
  protected activeInspectorTab: 'tab' | 'session' = 'tab';
  protected activeUtilityTab: UtilityPanelId = 'output';
  protected searchQuery = '';
  protected outputLines: OutputLine[] = [];
  protected problems: ProblemEntry[] = [];
  protected commandHistory: CommandHistoryEntry[] = [];
  protected activeTabId = '';
  protected focusedPaneId = 'pane-1';
  protected layoutMode: LayoutMode = 'grid-2x2';
  protected sessionInfo: RuntimeSessionInfo | null = null;

  protected sessions: SessionListItem[] = [];
  protected runtimeTabs: RuntimeTab[] = [];
  protected runtimePanes: RuntimePane[] = [];

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


  protected workspaceSummary = {
    layoutMode: 'grid-2x2',
    launchProfile: 'manual',
    tabCount: 0,
    paneCount: 0,
  };

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
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
  private removeInfoListener?: () => void;
  private activeWorkspace?: SavedWorkspace;
  private uptimeIntervalId?: number;
  private terminalInputBuffer = '';
  private resizeDebounceId?: ReturnType<typeof setTimeout>;

  async ngAfterViewInit(): Promise<void> {
    const [workspaces, activeWorkspace] = await Promise.all([
      this.workspaceBridge.listWorkspaces(),
      this.workspaceBridge.getActiveWorkspace(),
    ]);

    this.sessions = workspaces.map((workspace) => this.mapSession(workspace));
    this.applyWorkspace(activeWorkspace);
    await this.restoreFocusedPaneSession();
    this.appendOutput('Workspace shell initialized', 'info');
    this.appendOutput(`Loaded workspace "${activeWorkspace.name}"`, 'info');
    this.uptimeIntervalId = window.setInterval(() => {
      this.changeDetectorRef.markForCheck();
    }, 1000);

    this.destroyRef.onDestroy(() => {
      this.disposeTerminalSession();
      this.terminal?.dispose();
      this.resizeObserver?.disconnect();
      clearTimeout(this.resizeDebounceId);
      if (this.uptimeIntervalId) {
        window.clearInterval(this.uptimeIntervalId);
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
    this.appendOutput(this.status, 'info');
  }

  protected async restoreWorkspace(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const restored = await this.workspaceBridge.setActiveWorkspace(this.selectedWorkspaceId);
    this.applyWorkspace(restored);
    await this.restoreFocusedPaneSession();
    this.appendOutput(`Restored workspace "${restored.name}"`, 'info');
  }

  protected async relaunchTerminal(): Promise<void> {
    const focusedTab = this.getFocusedPaneTab();
    if (!focusedTab) {
      return;
    }

    this.updateTabStatus(focusedTab.id, 'restarting');
    await this.startTerminalSession(focusedTab.cwd);
  }

  protected async interruptTerminal(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    await this.terminalBridge.interruptSession(this.sessionId);
    this.status = 'Sent interrupt signal to terminal.';
    this.appendOutput(this.status, 'warn');
  }

  protected async killTerminal(): Promise<void> {
    const currentSessionId = this.sessionId;
    if (!currentSessionId) {
      return;
    }

    const focusedTab = this.getFocusedPaneTab();
    this.disposeTerminalSession();
    this.sessionInfo = null;
    this.status = 'Terminal session killed.';
    this.appendOutput(this.status, 'warn');

    if (focusedTab) {
      this.updateTabStatus(focusedTab.id, 'stopped');
      await this.persistWorkspaceState();
    }
  }

  protected async selectWorkspace(workspaceId: string): Promise<void> {
    if (workspaceId === this.selectedWorkspaceId) {
      return;
    }

    const workspace = await this.workspaceBridge.setActiveWorkspace(workspaceId);
    this.applyWorkspace(workspace);
    await this.restoreFocusedPaneSession();
    this.appendOutput(`Switched to workspace "${workspace.name}"`, 'info');
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
    await this.restoreFocusedPaneSession();
    this.appendOutput(`Created workspace "${created.name}" from template`, 'info');
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
    this.assignTabToPane(this.focusedPaneId, nextTab.id);
    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    await this.startTerminalSession(nextTab.cwd);
  }

  protected async selectTab(tabId: string): Promise<void> {
    const tab = this.runtimeTabs.find((item) => item.id === tabId);
    if (!tab) {
      return;
    }

    this.activeTabId = tabId;
    this.assignTabToPane(this.focusedPaneId, tabId);
    this.workingDirectory = tab.cwd;
    await this.persistWorkspaceState();
    await this.startTerminalSession(tab.cwd);
  }

  protected async closeTab(tabId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();

    if (this.runtimeTabs.length <= 1) {
      this.status = 'At least one tab must remain open.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    const remainingTabs = this.runtimeTabs.filter((tab) => tab.id !== tabId);
    this.runtimeTabs = remainingTabs;
    this.runtimePanes = this.runtimePanes.map((pane) => ({
      ...pane,
      tabId: pane.tabId === tabId ? null : pane.tabId,
    }));

    if (this.activeTabId === tabId) {
      const fallbackTab = remainingTabs[0];
      this.activeTabId = fallbackTab.id;
      this.assignTabToPane(this.focusedPaneId, fallbackTab.id);
      this.workingDirectory = fallbackTab.cwd;
      await this.startTerminalSession(fallbackTab.cwd);
    }

    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
  }

  protected async setLayoutMode(mode: LayoutMode): Promise<void> {
    if (this.layoutMode === mode) {
      return;
    }

    this.layoutMode = mode;
    this.runtimePanes = this.buildPanesForMode(mode, this.runtimeTabs, this.runtimePanes);
    if (!this.runtimePanes.some((pane) => pane.id === this.focusedPaneId)) {
      this.focusedPaneId = this.runtimePanes[0]?.id || 'pane-1';
    }

    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    await this.restoreFocusedPaneSession();
  }

  protected async focusPane(paneId: string): Promise<void> {
    if (paneId === this.focusedPaneId) {
      return;
    }

    this.focusedPaneId = paneId;
    const focusedTab = this.getFocusedPaneTab();

    if (focusedTab) {
      this.activeTabId = focusedTab.id;
      this.workingDirectory = focusedTab.cwd;
    }

    await this.persistWorkspaceState();
    await this.restoreFocusedPaneSession();
  }

  protected setInspectorTab(tab: 'tab' | 'session'): void {
    this.activeInspectorTab = tab;
  }

  protected setUtilityTab(tab: UtilityPanelId): void {
    this.activeUtilityTab = tab;
  }

  protected openUtilityPanel(tab: UtilityPanelId): void {
    this.activeUtilityTab = tab;
  }

  protected getUtilityTabs(): UtilityTab[] {
    return [
      { id: 'output', label: 'Output' },
      { id: 'problems', label: 'Problems', count: this.problems.length || undefined },
      { id: 'search', label: 'Search' },
      { id: 'command-history', label: 'Command History', count: this.commandHistory.length || undefined },
    ];
  }

  protected getRecentCommands(): CommandHistoryEntry[] {
    return this.commandHistory.slice(0, 8);
  }

  protected getSearchResultGroups(): SearchResultGroup[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const matches = (value: string): boolean => value.toLowerCase().includes(query);
    const groups: SearchResultGroup[] = [];

    const workspaceMatches = this.sessions
      .filter((session) => matches(session.name))
      .map((session) => ({
        id: session.id,
        title: session.name,
        detail: 'Workspace',
      }));

    if (workspaceMatches.length) {
      groups.push({ label: 'Workspaces', items: workspaceMatches });
    }

    const tabMatches = this.runtimeTabs
      .filter((tab) => matches(tab.title) || matches(tab.cwd))
      .map((tab) => ({
        id: tab.id,
        title: tab.title,
        detail: tab.cwd,
      }));

    if (tabMatches.length) {
      groups.push({ label: 'Tabs', items: tabMatches });
    }

    const commandMatches = this.commandHistory
      .filter((entry) => matches(entry.command) || matches(entry.tabTitle))
      .map((entry) => ({
        id: entry.id,
        title: entry.command,
        detail: `${entry.tabTitle} • ${this.formatClock(entry.timestamp)}`,
      }));

    if (commandMatches.length) {
      groups.push({ label: 'Commands', items: commandMatches });
    }

    const outputMatches = this.outputLines
      .filter((line) => matches(line.message))
      .slice(-20)
      .map((line) => ({
        id: line.id,
        title: line.message,
        detail: `${line.level} • ${this.formatClock(line.timestamp)}`,
      }));

    if (outputMatches.length) {
      groups.push({ label: 'Output', items: outputMatches });
    }

    return groups;
  }

  protected async rerunCommand(command: string): Promise<void> {
    if (!this.sessionId || !command.trim()) {
      return;
    }

    await this.terminalBridge.sendInput(this.sessionId, `${command}\r`);
    this.appendOutput(`Re-ran command: ${command}`, 'info');
  }

  protected clearProblems(): void {
    this.problems = [];
  }

  protected clearOutput(): void {
    this.outputLines = [];
  }

  protected isSessionActive(session: SessionListItem): boolean {
    return session.id === this.selectedWorkspaceId;
  }

  protected isTabActive(tab: RuntimeTab): boolean {
    return tab.id === this.activeTabId;
  }

  protected isPaneFocused(pane: RuntimePane): boolean {
    return pane.id === this.focusedPaneId;
  }

  protected getPaneTab(pane: RuntimePane): RuntimeTab | undefined {
    return pane.tabId ? this.runtimeTabs.find((tab) => tab.id === pane.tabId) : undefined;
  }

  protected getPaneTone(pane: RuntimePane): string {
    return this.getPaneTab(pane)?.accent || 'slate';
  }

  protected getFocusedTab(): RuntimeTab | undefined {
    return this.getFocusedPaneTab();
  }

  protected getInspectorItems(): InspectorItem[] {
    const focusedTab = this.getFocusedTab();
    if (this.activeInspectorTab === 'session') {
      return [
        { label: 'Shell', value: this.sessionInfo?.shell || 'n/a' },
        { label: 'Session Id', value: this.sessionInfo?.id || 'n/a' },
        { label: 'PID', value: this.sessionInfo?.pid?.toString() || 'n/a' },
        { label: 'Started', value: this.formatTimestamp(this.sessionInfo?.startedAt) },
        { label: 'Uptime', value: this.formatUptime(this.sessionInfo?.startedAt, this.sessionInfo?.endedAt) },
        { label: 'Last Activity', value: this.formatTimestamp(this.sessionInfo?.lastActiveAt) },
        { label: 'Port', value: this.sessionInfo?.detectedPort?.toString() || 'Not detected' },
        { label: 'Exit Code', value: this.sessionInfo?.exitCode?.toString() ?? 'n/a' },
      ];
    }

    return [
      { label: 'Directory', value: focusedTab?.cwd || this.workingDirectory || 'n/a' },
      { label: 'Workspace', value: this.workspaceName || 'n/a' },
      { label: 'Template', value: this.activeWorkspace?.templateId || 'custom' },
      { label: 'Layout', value: this.layoutMode },
      { label: 'Focused Pane', value: this.focusedPaneId },
      { label: 'Launch Profile', value: this.workspaceSummary.launchProfile || 'manual' },
      { label: 'Status', value: focusedTab?.status || 'idle' },
      { label: 'Last Saved', value: this.lastSavedAt || 'pending' },
    ];
  }

  protected canControlSession(): boolean {
    return Boolean(this.sessionId);
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
      layoutMode: this.layoutMode,
      launchProfile: this.workspaceSummary.launchProfile,
      sessionSnapshot: {
        layout: {
          mode: this.layoutMode,
          activeTabId: this.activeTabId,
          focusedPaneId: this.focusedPaneId,
          panes: this.runtimePanes.map((pane) => ({
            id: pane.id,
            tabId: pane.tabId,
          })),
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

  private async recreateTerminalSurface(): Promise<void> {
    this.terminal?.dispose();
    this.terminal = undefined;
    this.fitAddon = undefined;

    this.changeDetectorRef.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (!this.terminalHost) {
      return;
    }

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
    this.terminal.open(this.terminalHost.nativeElement);
    this.terminal.onData((data) => {
      this.trackTerminalInput(data);
      if (this.sessionId) {
        void this.terminalBridge.sendInput(this.sessionId, data);
      }
    });

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounceId);
      this.resizeDebounceId = setTimeout(() => this.syncTerminalSize(), 60);
    });
    this.resizeObserver.observe(this.terminalHost.nativeElement);
  }

  private async restoreFocusedPaneSession(): Promise<void> {
    const focusedTab = this.getFocusedPaneTab();
    if (!focusedTab) {
      this.status = 'Focused pane does not have a tab assigned.';
      this.appendOutput(this.status, 'warn');
      this.sessionInfo = null;
      await this.recreateTerminalSurface();
      return;
    }

    this.activeTabId = focusedTab.id;
    this.workingDirectory = focusedTab.cwd;
    await this.recreateTerminalSurface();
    await this.startTerminalSession(focusedTab.cwd);
  }

  private async persistWorkspaceState(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshSessions();
  }

  private getFocusedPaneTab(): RuntimeTab | undefined {
    const focusedPane = this.runtimePanes.find((pane) => pane.id === this.focusedPaneId);
    if (!focusedPane?.tabId) {
      return undefined;
    }

    return this.runtimeTabs.find((tab) => tab.id === focusedPane.tabId);
  }

  private assignTabToPane(paneId: string, tabId: string): void {
    this.runtimePanes = this.runtimePanes.map((pane) =>
      pane.id === paneId ? { ...pane, tabId } : pane
    );
  }

  private buildPanesForMode(
    mode: LayoutMode,
    tabs: RuntimeTab[],
    existingPanes: RuntimePane[]
  ): RuntimePane[] {
    const paneIds = mode === 'grid-2'
      ? ['pane-1', 'pane-2']
      : ['pane-1', 'pane-2', 'pane-3', 'pane-4'];

    return paneIds.map((paneId, index) => {
      const existing = existingPanes.find((pane) => pane.id === paneId);
      return {
        id: paneId,
        tabId: existing?.tabId ?? tabs[index]?.id ?? null,
      };
    });
  }

  private updateWorkspaceSummary(): void {
    this.workspaceSummary = {
      layoutMode: this.layoutMode,
      launchProfile: this.workspaceSummary.launchProfile,
      tabCount: this.runtimeTabs.length,
      paneCount: this.runtimePanes.length,
    };
  }

  private async startTerminalSession(cwd: string): Promise<void> {
    const targetDirectory = cwd.trim();
    if (!targetDirectory || !this.terminal || !this.fitAddon) {
      this.status = 'Working directory is required.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    this.status = `Launching terminal in ${targetDirectory}...`;
    this.appendOutput(this.status, 'info');
    this.disposeTerminalSession();
    this.terminal.clear();
    this.terminal.reset();

    this.sessionId = await this.terminalBridge.createSession({ cwd: targetDirectory });
    this.sessionInfo = await this.terminalBridge.getSessionInfo(this.sessionId);
    this.registerTerminalListeners();
    this.syncTerminalSize();
    const focusedTab = this.getFocusedPaneTab();
    if (focusedTab) {
      this.updateTabStatus(focusedTab.id, 'running');
    }
    this.status = `Connected to ${targetDirectory}`;
    this.appendOutput(`Terminal session attached to ${targetDirectory}`, 'info');
  }

  private registerTerminalListeners(): void {
    this.removeInfoListener = this.terminalBridge.onInfo((event) => {
      if (event.id === this.sessionId) {
        this.sessionInfo = event;
      }
    });

    this.removeDataListener = this.terminalBridge.onData((event) => {
      if (event.id === this.sessionId) {
        this.ngZone.runOutsideAngular(() => this.terminal?.write(event.data));
        this.ngZone.run(() => this.scanTerminalOutputForProblems(event.data));
      }
    });

    this.removeExitListener = this.terminalBridge.onExit((event) => {
      if (event.id === this.sessionId) {
        const focusedTab = this.getFocusedPaneTab();
        if (focusedTab) {
          this.updateTabStatus(focusedTab.id, 'stopped');
        }
        this.status = `Terminal exited (${event.exitCode ?? 'unknown'})`;
        this.appendOutput(this.status, event.exitCode ? 'error' : 'info');
      }
    });
  }

  private disposeTerminalSession(): void {
    this.removeInfoListener?.();
    this.removeDataListener?.();
    this.removeExitListener?.();
    this.removeInfoListener = undefined;
    this.removeDataListener = undefined;
    this.removeExitListener = undefined;

    if (this.sessionId) {
      void this.terminalBridge.disposeSession(this.sessionId);
      this.sessionId = undefined;
    }
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
    this.layoutMode = (workspace.sessionSnapshot?.layout?.mode as LayoutMode) || 'grid-2x2';
    this.runtimePanes = this.buildPanesForMode(
      this.layoutMode,
      this.runtimeTabs,
      workspace.sessionSnapshot?.layout?.panes || []
    );
    this.focusedPaneId =
      workspace.sessionSnapshot?.layout?.focusedPaneId ||
      this.runtimePanes[0]?.id ||
      'pane-1';

    const focusedTab = this.getFocusedPaneTab();
    this.activeTabId =
      focusedTab?.id ||
      workspace.sessionSnapshot?.layout?.activeTabId ||
      this.runtimeTabs[0]?.id ||
      '';
    this.workingDirectory = focusedTab?.cwd || workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
    this.workspaceSummary = {
      layoutMode: workspace.layoutMode || this.layoutMode,
      launchProfile: workspace.launchProfile || 'manual',
      tabCount: this.runtimeTabs.length,
      paneCount: this.runtimePanes.length,
    };
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

    const sessionId = this.sessionId;
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.fitAddon?.fit();
        if (this.terminal && sessionId) {
          void this.terminalBridge.resizeSession(sessionId, this.terminal.cols, this.terminal.rows);
        }
      });
    });
  }

  private updateTabStatus(tabId: string, status: string): void {
    this.runtimeTabs = this.runtimeTabs.map((tab) =>
      tab.id === tabId ? { ...tab, status } : tab
    );
  }

  private formatTimestamp(value?: string | null): string {
    if (!value) {
      return 'n/a';
    }

    return new Date(value).toLocaleString();
  }

  private formatUptime(startedAt?: string | null, endedAt?: string | null): string {
    if (!startedAt) {
      return 'n/a';
    }

    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  private appendOutput(message: string, level: OutputLine['level'] = 'info'): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    this.outputLines = [
      ...this.outputLines,
      {
        id: `output-${Date.now()}-${this.outputLines.length}`,
        timestamp: new Date().toISOString(),
        level,
        message: trimmed,
      },
    ].slice(-200);
  }

  private trackTerminalInput(data: string): void {
    for (const char of data) {
      if (char === '\r' || char === '\n') {
        this.commitTerminalInput();
        continue;
      }

      if (char === '\u007f') {
        this.terminalInputBuffer = this.terminalInputBuffer.slice(0, -1);
        continue;
      }

      if (char >= ' ' && char !== '\u007f') {
        this.terminalInputBuffer += char;
      }
    }
  }

  private commitTerminalInput(): void {
    const command = this.terminalInputBuffer.trim();
    this.terminalInputBuffer = '';

    if (!command) {
      return;
    }

    const focusedTab = this.getFocusedTab();
    this.commandHistory = [
      {
        id: `cmd-${Date.now()}-${this.commandHistory.length}`,
        command,
        timestamp: new Date().toISOString(),
        tabTitle: focusedTab?.title || this.workspaceName || 'Terminal',
      },
      ...this.commandHistory,
    ].slice(0, 100);
  }

  private scanTerminalOutputForProblems(data: string): void {
    const focusedTab = this.getFocusedTab();
    const source = focusedTab?.title || this.workspaceName || 'Terminal';
    const lines = data.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const severity = this.detectProblemSeverity(line);
      if (!severity) {
        continue;
      }

      const duplicate = this.problems.some(
        (problem) => problem.message === line && problem.source === source
      );
      if (duplicate) {
        continue;
      }

      this.problems = [
        {
          id: `problem-${Date.now()}-${this.problems.length}`,
          severity,
          message: line,
          source,
          timestamp: new Date().toISOString(),
        },
        ...this.problems,
      ].slice(0, 100);
    }
  }

  private detectProblemSeverity(line: string): ProblemEntry['severity'] | null {
    const normalized = line.toLowerCase();

    if (
      /\berror\b/.test(normalized) ||
      /\bfailed\b/.test(normalized) ||
      /\bfailure\b/.test(normalized) ||
      normalized.includes('exception') ||
      normalized.includes('err!')
    ) {
      return 'error';
    }

    if (/\bwarn(?:ing)?\b/.test(normalized)) {
      return 'warning';
    }

    return null;
  }

  protected formatClock(value: string): string {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
