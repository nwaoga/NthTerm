import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import { AppBridgeService } from './app-bridge.service';
import { TerminalBridgeService, TerminalInfo } from './terminal-bridge.service';
import {
  EnvironmentVariable,
  SystemBridgeService,
  SystemMetrics,
} from './system-bridge.service';
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
  shell: string;
  startupCommand: string;
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
  items: { id: string; title: string; detail: string; kind?: PaletteEntryKind }[];
}

type PaletteEntryKind =
  | 'action'
  | 'workspace'
  | 'tab'
  | 'template'
  | 'command'
  | 'output'
  | 'problem'
  | 'pane';

interface PaletteEntry {
  id: string;
  kind: PaletteEntryKind;
  group: string;
  label: string;
  detail: string;
  shortcut?: string;
}

interface InspectorItem {
  label: string;
  value: string;
}

interface RuntimeSessionInfo extends TerminalInfo {}

type LayoutMode = 'grid-2' | 'grid-2x2';

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('terminalHost')
  private terminalHost?: ElementRef<HTMLDivElement>;

  @ViewChild('paneGrid')
  private paneGrid?: ElementRef<HTMLElement>;

  @ViewChild('paletteInput')
  private paletteInput?: ElementRef<HTMLInputElement>;

  protected status = 'Loading workspace...';
  protected workspaceName = '';
  protected workingDirectory = '';
  protected lastSavedAt = '';
  protected selectedWorkspace = '';
  protected selectedWorkspaceId = '';
  protected activeInspectorTab: 'tab' | 'session' = 'tab';
  protected activeUtilityTab: UtilityPanelId = 'output';
  protected utilityPanelVisible = true;
  protected viewMenuOpen = false;
  protected preferencesOpen = false;
  protected searchQuery = '';
  protected outputLines: OutputLine[] = [];
  protected problems: ProblemEntry[] = [];
  protected commandHistory: CommandHistoryEntry[] = [];
  protected systemMetrics: SystemMetrics | null = null;
  protected environmentVariables: EnvironmentVariable[] = [];
  protected commandPaletteOpen = false;
  protected commandPaletteQuery = '';
  protected commandPaletteIndex = 0;
  protected editingSessionId = '';
  protected editingSessionName = '';
  protected activeTabId = '';
  protected focusedPaneId = 'pane-1';
  protected layoutMode: LayoutMode = 'grid-2x2';
  protected paneColSplit = 50;
  protected paneRowSplit = 50;
  protected paneResizeMode: 'col' | 'row' | null = null;
  protected sessionInfo: RuntimeSessionInfo | null = null;

  protected sessions: SessionListItem[] = [];
  protected runtimeTabs: RuntimeTab[] = [];
  protected runtimePanes: RuntimePane[] = [];

  protected readonly shellOptions = [
    { value: '', label: 'System Default' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'cmd', label: 'Command Prompt' },
    { value: 'bash', label: 'Bash' },
    { value: 'zsh', label: 'Zsh' },
  ];

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
  private readonly systemBridge = inject(SystemBridgeService);
  private readonly appBridge = inject(AppBridgeService);
  private readonly bottomPanelPreferenceKey = 'nthterm.preferences.bottomPanel.visible';
  private removeBeforeQuitListener?: () => void;

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private sessionId?: string;
  private resizeObserver?: ResizeObserver;
  private removeDataListener?: () => void;
  private removeExitListener?: () => void;
  private removeInfoListener?: () => void;
  private activeWorkspace?: SavedWorkspace;
  private uptimeIntervalId?: number;
  private metricsIntervalId?: number;
  private terminalInputBuffer = '';
  private resizeDebounceId?: ReturnType<typeof setTimeout>;

  async ngAfterViewInit(): Promise<void> {
    this.utilityPanelVisible = this.readBottomPanelPreference();
    const workspaces = await this.workspaceBridge.listWorkspaces();
    const launchWorkspace = await this.workspaceBridge.getLaunchWorkspace();

    this.sessions = workspaces.map((workspace) => this.mapSession(workspace));
    await this.restoreLastWorkspaceOnLaunch(launchWorkspace);
    this.registerShutdownPersistence();
    this.startSystemMonitoring();
    this.uptimeIntervalId = window.setInterval(() => {
      this.changeDetectorRef.markForCheck();
    }, 1000);

    this.destroyRef.onDestroy(() => {
      this.removeBeforeQuitListener?.();
      this.disposeTerminalSession();
      this.terminal?.dispose();
      this.resizeObserver?.disconnect();
      clearTimeout(this.resizeDebounceId);
      if (this.metricsIntervalId) {
        window.clearInterval(this.metricsIntervalId);
      }
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
    await this.startTerminalSession(focusedTab);
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
    this.environmentVariables = [];
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

    await this.persistWorkspaceState();
    const workspace = await this.workspaceBridge.setActiveWorkspace(workspaceId);
    this.applyWorkspace(workspace);
    await this.restoreFocusedPaneSession();
    this.appendOutput(`Switched to workspace "${workspace.name}"`, 'info');
  }

  protected startRenameSession(session: SessionListItem, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingSessionId = session.id;
    this.editingSessionName = session.name;
  }

  protected cancelRenameSession(): void {
    this.editingSessionId = '';
    this.editingSessionName = '';
  }

  protected async commitRenameSession(sessionId: string): Promise<void> {
    const nextName = this.editingSessionName.trim();
    const current = this.sessions.find((session) => session.id === sessionId);
    this.cancelRenameSession();

    if (!current || !nextName || nextName === current.name) {
      return;
    }

    const result = await this.workspaceBridge.renameWorkspace(sessionId, nextName);
    if (!result || 'error' in result) {
      this.status = 'Workspace name is required.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    await this.refreshSessions();
    if (sessionId === this.selectedWorkspaceId) {
      this.workspaceName = result.name;
      this.selectedWorkspace = result.name;
    }
    this.appendOutput(`Renamed workspace to "${result.name}"`, 'info');
  }

  protected async deleteSession(session: SessionListItem, event: MouseEvent): Promise<void> {
    event.stopPropagation();

    if (this.sessions.length <= 1) {
      this.status = 'At least one workspace must remain.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    if (!confirm(`Delete workspace "${session.name}"? This cannot be undone.`)) {
      return;
    }

    if (session.id === this.selectedWorkspaceId) {
      await this.persistWorkspaceState();
      this.disposeTerminalSession();
    }

    const result = await this.workspaceBridge.deleteWorkspace(session.id);
    if (!result) {
      this.status = 'Workspace could not be deleted.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    if ('error' in result) {
      this.status = 'At least one workspace must remain.';
      this.appendOutput(this.status, 'warn');
      return;
    }

    await this.refreshSessions();
    if (result.activeWorkspace) {
      this.applyWorkspace(result.activeWorkspace);
      await this.restoreFocusedPaneSession();
    }

    this.appendOutput(`Deleted workspace "${result.deletedName}"`, 'info');
  }

  protected async createWorkspaceFromTemplate(template: TemplateListItem): Promise<void> {
    if (this.selectedWorkspaceId) {
      await this.persistWorkspaceState();
    }

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
      shell: '',
      startupCommand: '',
    };

    this.runtimeTabs = [...this.runtimeTabs, nextTab];
    this.activeTabId = nextTab.id;
    this.assignTabToPane(this.focusedPaneId, nextTab.id);
    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    await this.startTerminalSession(nextTab);
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
    await this.startTerminalSession(tab);
  }

  protected updateFocusedTabCwd(value: string): void {
    this.workingDirectory = value;
    this.updateFocusedTabField('cwd', value);
  }

  protected updateFocusedTabShell(value: string): void {
    this.updateFocusedTabField('shell', value);
  }

  protected updateFocusedTabStartupCommand(value: string): void {
    this.updateFocusedTabField('startupCommand', value);
  }

  protected getFocusedTabShellLabel(): string {
    const shell = this.getFocusedTab()?.shell || '';
    return this.shellOptions.find((option) => option.value === shell)?.label || 'System Default';
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
      await this.startTerminalSession(fallbackTab);
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
    this.utilityPanelVisible = true;
    this.writeBottomPanelPreference(true);
  }

  protected toggleViewMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.viewMenuOpen = !this.viewMenuOpen;
  }

  protected togglePreferences(): void {
    this.preferencesOpen = !this.preferencesOpen;
  }

  protected setUtilityPanelPreference(visible: boolean): void {
    this.utilityPanelVisible = visible;
    this.writeBottomPanelPreference(visible);
    this.viewMenuOpen = false;
    setTimeout(() => this.syncTerminalSize(), 0);
  }

  protected openUtilityPanel(tab: UtilityPanelId): void {
    this.activeUtilityTab = tab;
    this.utilityPanelVisible = true;
    this.writeBottomPanelPreference(true);
    this.viewMenuOpen = false;
    setTimeout(() => this.syncTerminalSize(), 0);
  }

  protected openCommandPalette(focusSearch = false): void {
    this.commandPaletteOpen = true;
    this.commandPaletteIndex = 0;
    if (!focusSearch) {
      this.commandPaletteQuery = '';
    }

    setTimeout(() => {
      this.paletteInput?.nativeElement.focus();
      this.paletteInput?.nativeElement.select();
    });
  }

  protected openGlobalSearch(): void {
    this.openUtilityPanel('search');
    this.commandPaletteQuery = this.searchQuery;
    this.openCommandPalette(true);
  }

  protected closeCommandPalette(): void {
    this.commandPaletteOpen = false;
    this.commandPaletteQuery = '';
    this.commandPaletteIndex = 0;
  }

  protected onCommandPaletteQueryChange(): void {
    this.commandPaletteIndex = 0;
    this.searchQuery = this.commandPaletteQuery;
  }

  protected getFilteredPaletteEntries(): PaletteEntry[] {
    const query = this.commandPaletteQuery.trim().toLowerCase();
    const entries = [...this.getPaletteActionEntries(), ...this.getPaletteSearchEntries()];

    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.group}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  protected isPaletteEntryActive(index: number): boolean {
    return index === this.commandPaletteIndex;
  }

  protected async executePaletteEntry(entry: PaletteEntry): Promise<void> {
    this.closeCommandPalette();

    switch (entry.kind) {
      case 'action':
        await this.runPaletteAction(entry.id);
        break;
      case 'workspace':
        await this.selectWorkspace(entry.id);
        break;
      case 'tab':
        await this.selectTab(entry.id);
        break;
      case 'template': {
        const template = this.templates.find((item) => item.templateId === entry.id);
        if (template) {
          await this.createWorkspaceFromTemplate(template);
        }
        break;
      }
      case 'command':
        await this.rerunCommand(entry.label);
        break;
      case 'output':
        this.openUtilityPanel('output');
        this.appendOutput(`Search match: ${entry.label}`, 'info');
        break;
      case 'problem':
        this.openUtilityPanel('problems');
        break;
      case 'pane':
        await this.focusPane(entry.id);
        break;
    }
  }

  protected async executeSearchResult(item: SearchResultGroup['items'][number]): Promise<void> {
    const entry: PaletteEntry = {
      id: item.id,
      kind: item.kind || 'action',
      group: 'Search',
      label: item.title,
      detail: item.detail,
    };

    await this.executePaletteEntry(entry);
  }

  @HostListener('document:click')
  protected closeViewMenu(): void {
    this.viewMenuOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  protected handleGlobalKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const withCtrl = event.ctrlKey || event.metaKey;

    if (withCtrl && event.shiftKey && key === 'p') {
      event.preventDefault();
      this.openCommandPalette();
      return;
    }

    if (withCtrl && event.shiftKey && key === 'f') {
      event.preventDefault();
      this.openGlobalSearch();
      return;
    }

    if (!this.commandPaletteOpen) {
      return;
    }

    const entries = this.getFilteredPaletteEntries();

    if (key === 'escape') {
      event.preventDefault();
      this.closeCommandPalette();
      return;
    }

    if (key === 'arrowdown') {
      event.preventDefault();
      this.commandPaletteIndex = entries.length
        ? (this.commandPaletteIndex + 1) % entries.length
        : 0;
      return;
    }

    if (key === 'arrowup') {
      event.preventDefault();
      this.commandPaletteIndex = entries.length
        ? (this.commandPaletteIndex - 1 + entries.length) % entries.length
        : 0;
      return;
    }

    if (key === 'enter' && entries.length) {
      event.preventDefault();
      void this.executePaletteEntry(entries[this.commandPaletteIndex]);
    }
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
    return this.buildSearchResultGroups(this.searchQuery);
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

  protected formatMetric(value: number | null | undefined, suffix = ''): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'n/a';
    }

    return `${value}${suffix}`;
  }

  protected getVisibleEnvironmentVariables(): EnvironmentVariable[] {
    return this.environmentVariables.slice(0, 12);
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

  protected getPaneById(paneId: string): RuntimePane | undefined {
    return this.runtimePanes.find((pane) => pane.id === paneId);
  }

  protected startPaneResize(event: MouseEvent, mode: 'col' | 'row'): void {
    event.preventDefault();
    event.stopPropagation();
    this.paneResizeMode = mode;
  }

  @HostListener('document:mousemove', ['$event'])
  protected onDocumentMouseMove(event: MouseEvent): void {
    if (!this.paneResizeMode || !this.paneGrid) {
      return;
    }

    const bounds = this.paneGrid.nativeElement.getBoundingClientRect();
    if (this.paneResizeMode === 'col') {
      const pct = ((event.clientX - bounds.left) / bounds.width) * 100;
      this.paneColSplit = Math.min(78, Math.max(22, pct));
    } else {
      const pct = ((event.clientY - bounds.top) / bounds.height) * 100;
      this.paneRowSplit = Math.min(78, Math.max(22, pct));
    }

    this.syncTerminalSize();
  }

  @HostListener('document:mouseup')
  protected onDocumentMouseUp(): void {
    if (!this.paneResizeMode) {
      return;
    }

    this.paneResizeMode = null;
    this.syncTerminalSize();
    void this.persistWorkspaceState();
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
      { label: 'Shell', value: this.getFocusedTabShellLabel() },
      { label: 'Startup Command', value: focusedTab?.startupCommand?.trim() || 'None' },
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
          colSplit: this.paneColSplit,
          rowSplit: this.paneRowSplit,
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
          shell: tab.shell || '',
          startupCommand: tab.startupCommand || '',
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
    await this.startTerminalSession(focusedTab);
  }

  private updateFocusedTabField(field: 'cwd' | 'shell' | 'startupCommand', value: string): void {
    const focusedTab = this.getFocusedTab();
    if (!focusedTab) {
      return;
    }

    this.runtimeTabs = this.runtimeTabs.map((tab) =>
      tab.id === focusedTab.id ? { ...tab, [field]: value } : tab
    );
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

  private async startTerminalSession(tab?: RuntimeTab): Promise<void> {
    const focusedTab = tab || this.getFocusedPaneTab();
    const targetDirectory = focusedTab?.cwd?.trim() || this.workingDirectory.trim();
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

    this.sessionId = await this.terminalBridge.createSession({
      cwd: targetDirectory,
      workspaceName: this.workspaceName,
      shell: focusedTab?.shell || '',
    });
    this.sessionInfo = await this.terminalBridge.getSessionInfo(this.sessionId);
    this.registerTerminalListeners();
    this.syncTerminalSize();
    await this.refreshEnvironmentVariables();
    if (focusedTab) {
      this.updateTabStatus(focusedTab.id, 'running');
    }
    this.status = `Connected to ${targetDirectory}`;
    this.appendOutput(`Terminal session attached to ${targetDirectory}`, 'info');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.runStartupCommands(focusedTab?.startupCommand);
  }

  private async runStartupCommands(commands?: string): Promise<void> {
    if (!commands?.trim() || !this.sessionId) {
      return;
    }

    const lines = commands
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      await this.terminalBridge.sendInput(this.sessionId, `${line}\r`);
      this.appendOutput(`Ran startup command: ${line}`, 'info');
    }
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
      shell: tab.shell || '',
      startupCommand: tab.startupCommand || '',
    })) || [];
    this.layoutMode = (workspace.sessionSnapshot?.layout?.mode as LayoutMode) || 'grid-2x2';
    this.paneColSplit = workspace.sessionSnapshot?.layout?.colSplit ?? 50;
    this.paneRowSplit = workspace.sessionSnapshot?.layout?.rowSplit ?? 50;
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

  private async restoreLastWorkspaceOnLaunch(workspace: SavedWorkspace): Promise<void> {
    this.applyWorkspace(workspace);
    await this.restoreFocusedPaneSession();
    this.appendOutput('Workspace shell initialized', 'info');
    this.appendOutput(`Restored last workspace "${workspace.name}"`, 'info');
  }

  private registerShutdownPersistence(): void {
    try {
      this.removeBeforeQuitListener = this.appBridge.onBeforeQuit(() => {
        void this.persistWorkspaceOnShutdown();
      });
    } catch {
      this.removeBeforeQuitListener = undefined;
    }
  }

  private async persistWorkspaceOnShutdown(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      void this.appBridge.quitReady();
      return;
    }

    try {
      await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
      await this.workspaceBridge.setActiveWorkspace(this.selectedWorkspaceId);
    } finally {
      await this.appBridge.quitReady();
    }
  }

  private readBottomPanelPreference(): boolean {
    try {
      return localStorage.getItem(this.bottomPanelPreferenceKey) !== 'false';
    } catch {
      return true;
    }
  }

  private writeBottomPanelPreference(visible: boolean): void {
    try {
      localStorage.setItem(this.bottomPanelPreferenceKey, String(visible));
    } catch {
      // Preference persistence is best-effort only.
    }
  }

  private startSystemMonitoring(): void {
    void this.refreshSystemMetrics();
    this.metricsIntervalId = window.setInterval(() => {
      void this.refreshSystemMetrics();
    }, 3000);
  }

  private async refreshSystemMetrics(): Promise<void> {
    try {
      this.systemMetrics = await this.systemBridge.getMetrics();
      this.changeDetectorRef.markForCheck();
    } catch {
      this.systemMetrics = null;
    }
  }

  private async refreshEnvironmentVariables(): Promise<void> {
    if (!this.sessionId) {
      this.environmentVariables = [];
      return;
    }

    try {
      this.environmentVariables = await this.systemBridge.getSessionEnvironment(this.sessionId);
    } catch {
      this.environmentVariables = [];
    }
  }

  private getPaletteActionEntries(): PaletteEntry[] {
    return [
      { id: 'save-workspace', kind: 'action', group: 'Workspace', label: 'Save Workspace', detail: 'Persist the current workspace layout and tabs' },
      { id: 'restore-workspace', kind: 'action', group: 'Workspace', label: 'Restore Workspace', detail: 'Reload the active workspace from SQLite' },
      { id: 'new-tab', kind: 'action', group: 'Workspace', label: 'New Tab', detail: 'Create a terminal tab in the focused pane' },
      { id: 'restart-terminal', kind: 'action', group: 'Terminal', label: 'Restart Terminal', detail: 'Restart the focused pane session' },
      { id: 'stop-terminal', kind: 'action', group: 'Terminal', label: 'Stop Terminal', detail: 'Send Ctrl+C to the active PTY' },
      { id: 'kill-terminal', kind: 'action', group: 'Terminal', label: 'Kill Terminal', detail: 'Dispose the active PTY session' },
      { id: 'open-output', kind: 'action', group: 'View', label: 'Show Output Panel', detail: 'Open the bottom output utility tab' },
      { id: 'open-problems', kind: 'action', group: 'View', label: 'Show Problems Panel', detail: 'Open detected terminal problems' },
      { id: 'open-search', kind: 'action', group: 'View', label: 'Show Search Panel', detail: 'Open global workspace search', shortcut: 'Ctrl+Shift+F' },
      { id: 'open-history', kind: 'action', group: 'View', label: 'Show Command History', detail: 'Open recent terminal commands' },
      { id: 'inspector-tab', kind: 'action', group: 'View', label: 'Show Tab Inspector', detail: 'Focus tab metadata in the right rail' },
      { id: 'inspector-session', kind: 'action', group: 'View', label: 'Show Session Inspector', detail: 'Focus live PTY metadata in the right rail' },
      { id: 'layout-2', kind: 'action', group: 'Layout', label: 'Switch to 2-Up Layout', detail: 'Use a two-pane terminal grid' },
      { id: 'layout-2x2', kind: 'action', group: 'Layout', label: 'Switch to 2x2 Layout', detail: 'Use a four-pane terminal grid' },
      { id: 'open-palette', kind: 'action', group: 'Navigation', label: 'Open Command Palette', detail: 'Show workspace commands and search', shortcut: 'Ctrl+Shift+P' },
    ];
  }

  private getPaletteSearchEntries(): PaletteEntry[] {
    return this.buildSearchResultGroups(this.commandPaletteQuery).flatMap((group) =>
      group.items.map((item) => ({
        id: item.id,
        kind: item.kind || 'action',
        group: group.label,
        label: item.title,
        detail: item.detail,
      }))
    );
  }

  private buildSearchResultGroups(queryValue: string): SearchResultGroup[] {
    const query = queryValue.trim().toLowerCase();
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
        kind: 'workspace' as PaletteEntryKind,
      }));

    if (workspaceMatches.length) {
      groups.push({ label: 'Workspaces', items: workspaceMatches });
    }

    const templateMatches = this.templates
      .filter((template) => matches(template.name) || matches(template.cwd))
      .map((template) => ({
        id: template.templateId,
        title: template.name,
        detail: template.cwd,
        kind: 'template' as PaletteEntryKind,
      }));

    if (templateMatches.length) {
      groups.push({ label: 'Templates', items: templateMatches });
    }

    const tabMatches = this.runtimeTabs
      .filter((tab) => matches(tab.title) || matches(tab.cwd) || matches(tab.status))
      .map((tab) => ({
        id: tab.id,
        title: tab.title,
        detail: tab.cwd,
        kind: 'tab' as PaletteEntryKind,
      }));

    if (tabMatches.length) {
      groups.push({ label: 'Tabs', items: tabMatches });
    }

    const paneMatches = this.runtimePanes
      .map((pane, index) => {
        const tab = this.getPaneTab(pane);
        return {
          pane,
          index,
          tab,
        };
      })
      .filter(({ pane, tab }) =>
        matches(pane.id) ||
        matches(tab?.title || '') ||
        matches(tab?.cwd || '') ||
        matches(`pane ${pane.id}`)
      )
      .map(({ pane, index, tab }) => ({
        id: pane.id,
        title: tab?.title || `Pane ${index + 1}`,
        detail: tab?.cwd || 'Unassigned pane',
        kind: 'pane' as PaletteEntryKind,
      }));

    if (paneMatches.length) {
      groups.push({ label: 'Panes', items: paneMatches });
    }

    const commandMatches = this.commandHistory
      .filter((entry) => matches(entry.command) || matches(entry.tabTitle))
      .map((entry) => ({
        id: entry.id,
        title: entry.command,
        detail: `${entry.tabTitle} • ${this.formatClock(entry.timestamp)}`,
        kind: 'command' as PaletteEntryKind,
      }));

    if (commandMatches.length) {
      groups.push({ label: 'Commands', items: commandMatches });
    }

    const problemMatches = this.problems
      .filter((problem) => matches(problem.message) || matches(problem.source) || matches(problem.severity))
      .map((problem) => ({
        id: problem.id,
        title: problem.message,
        detail: `${problem.severity} • ${problem.source}`,
        kind: 'problem' as PaletteEntryKind,
      }));

    if (problemMatches.length) {
      groups.push({ label: 'Problems', items: problemMatches });
    }

    const outputMatches = this.outputLines
      .filter((line) => matches(line.message) || matches(line.level))
      .slice(-20)
      .map((line) => ({
        id: line.id,
        title: line.message,
        detail: `${line.level} • ${this.formatClock(line.timestamp)}`,
        kind: 'output' as PaletteEntryKind,
      }));

    if (outputMatches.length) {
      groups.push({ label: 'Output', items: outputMatches });
    }

    return groups;
  }

  private async runPaletteAction(actionId: string): Promise<void> {
    switch (actionId) {
      case 'save-workspace':
        await this.saveWorkspace();
        break;
      case 'restore-workspace':
        await this.restoreWorkspace();
        break;
      case 'new-tab':
        await this.createTab();
        break;
      case 'restart-terminal':
        await this.relaunchTerminal();
        break;
      case 'stop-terminal':
        await this.interruptTerminal();
        break;
      case 'kill-terminal':
        await this.killTerminal();
        break;
      case 'open-output':
        this.openUtilityPanel('output');
        break;
      case 'open-problems':
        this.openUtilityPanel('problems');
        break;
      case 'open-search':
        this.openUtilityPanel('search');
        break;
      case 'open-history':
        this.openUtilityPanel('command-history');
        break;
      case 'inspector-tab':
        this.setInspectorTab('tab');
        break;
      case 'inspector-session':
        this.setInspectorTab('session');
        break;
      case 'layout-2':
        await this.setLayoutMode('grid-2');
        break;
      case 'layout-2x2':
        await this.setLayoutMode('grid-2x2');
        break;
      case 'open-palette':
        this.openCommandPalette();
        break;
    }
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
