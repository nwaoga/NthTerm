import { Injectable, inject } from '@angular/core';

import { SavedWorkspace, WorkspaceBridgeService, WorkspaceDraft } from '../workspace-bridge.service';
import {
  LayoutMode,
  PaneSessionSnapshot,
  RuntimeTab,
  RuntimeTerminal,
  RecoverySnapshot,
  SHELL_OPTIONS,
  SessionListItem,
  WorkspaceListItem,
  SessionHistoryEntry,
  WorkspaceSummary,
} from '../models';
import {
  MAX_TABS_PER_WORKSPACE,
  MAX_TERMINALS_PER_TAB,
  createEmptyTabSnapshot,
  createTerminalDraft,
  getEffectiveLayoutMode,
  mapRuntimeTab,
  normalizeWorkspaceSnapshot,
} from './workspace-snapshot';

@Injectable({ providedIn: 'root' })
export class WorkspaceRuntimeService {
  status = 'Loading workspace...';
  workspaceName = '';
  workingDirectory = '';
  lastSavedAt = '';
  selectedWorkspace = '';
  selectedWorkspaceId = '';
  activeTabId = '';
  paneResizeMode: 'col' | 'row' | null = null;
  previewMode = false;
  editingWorkspaceId = '';
  editingWorkspaceName = '';

  workspaces: WorkspaceListItem[] = [];
  runtimeTabs: RuntimeTab[] = [];
  workspaceSummary: WorkspaceSummary = {
    layoutMode: 'grid-2x2',
    launchProfile: 'manual',
    tabCount: 0,
    paneCount: 0,
  };

  activeWorkspace?: SavedWorkspace;
  sessionHistory: SessionHistoryEntry[] = [];
  recoverySnapshot: RecoverySnapshot = this.buildEmptyRecoverySnapshot();

  private readonly workspaceBridge = inject(WorkspaceBridgeService);

  get layoutMode(): LayoutMode {
    return this.getActiveTab()?.layoutMode || 'grid-2x2';
  }

  get paneColSplit(): number {
    return this.getActiveTab()?.colSplit ?? 50;
  }

  get paneRowSplit(): number {
    return this.getActiveTab()?.rowSplit ?? 50;
  }

  get focusedPaneId(): string {
    return this.getActiveTab()?.focusedTerminalId || '';
  }

  getActiveTab(): RuntimeTab | undefined {
    return this.runtimeTabs.find((tab) => tab.id === this.activeTabId);
  }

  getActiveTabTerminals(): RuntimeTerminal[] {
    return this.getActiveTab()?.terminals || [];
  }

  getEffectiveActiveLayoutMode(): LayoutMode {
    const tab = this.getActiveTab();
    return tab ? getEffectiveLayoutMode(tab) : 'grid-2';
  }

  getTerminalById(terminalId: string): RuntimeTerminal | undefined {
    for (const tab of this.runtimeTabs) {
      const terminal = tab.terminals.find((item) => item.id === terminalId);
      if (terminal) {
        return terminal;
      }
    }

    return undefined;
  }

  getFocusedTerminal(): RuntimeTerminal | undefined {
    const tab = this.getActiveTab();
    if (!tab?.focusedTerminalId) {
      return undefined;
    }

    return tab.terminals.find((terminal) => terminal.id === tab.focusedTerminalId);
  }

  getFocusedTab(): RuntimeTab | undefined {
    return this.getActiveTab();
  }

  getFocusedPaneTab(): RuntimeTab | undefined {
    return this.getActiveTab();
  }

  getPaneById(terminalId: string): RuntimeTerminal | undefined {
    return this.getActiveTabTerminals().find((terminal) => terminal.id === terminalId);
  }

  getPaneTab(terminal: RuntimeTerminal): RuntimeTab | undefined {
    return this.getActiveTab();
  }

  isWorkspaceActive(workspace: WorkspaceListItem): boolean {
    return workspace.id === this.selectedWorkspaceId;
  }

  /** @deprecated Use isWorkspaceActive */
  isSessionActive(session: SessionListItem): boolean {
    return this.isWorkspaceActive(session);
  }

  isTabActive(tab: RuntimeTab): boolean {
    return tab.id === this.activeTabId;
  }

  isTerminalFocused(terminal: RuntimeTerminal): boolean {
    return terminal.id === this.focusedPaneId;
  }

  isPaneFocused(terminal: RuntimeTerminal): boolean {
    return this.isTerminalFocused(terminal);
  }

  getFocusedTabShellLabel(): string {
    const shell = this.getFocusedTerminal()?.shell || '';
    return SHELL_OPTIONS.find((option) => option.value === shell)?.label || 'System Default';
  }

  async refreshWorkspaces(): Promise<void> {
    const workspaces = await this.workspaceBridge.listWorkspaces();
    this.workspaces = workspaces.map((workspace) => this.mapWorkspace(workspace));
  }

  /** @deprecated Use refreshWorkspaces */
  async refreshSessions(): Promise<void> {
    await this.refreshWorkspaces();
  }

  buildWorkspaceName(baseName: string): string {
    const usedNames = new Set(this.workspaces.map((workspace) => workspace.name));
    if (!usedNames.has(baseName)) {
      return baseName;
    }

    let index = 2;
    while (usedNames.has(`${baseName} ${index}`)) {
      index += 1;
    }

    return `${baseName} ${index}`;
  }

  currentWorkspaceDraft(): WorkspaceDraft {
    const currentWorkspace = this.workspaces.find((workspace) => workspace.id === this.selectedWorkspaceId);
    const activeTab = this.getActiveTab();

    return {
      id: this.selectedWorkspaceId,
      name: this.workspaceName.trim() || 'Untitled Workspace',
      cwd: this.workingDirectory.trim(),
      icon: currentWorkspace?.icon || 'cloud',
      accent: currentWorkspace?.accent || 'slate',
      layoutMode: activeTab?.layoutMode || 'grid-2x2',
      launchProfile: this.workspaceSummary.launchProfile,
      sessionSnapshot: {
        layout: {
          mode: activeTab?.layoutMode || 'grid-2x2',
          activeTabId: this.activeTabId,
          focusedPaneId: activeTab?.focusedTerminalId || '',
          focusedTerminalId: activeTab?.focusedTerminalId || '',
          colSplit: activeTab?.colSplit ?? 50,
          rowSplit: activeTab?.rowSplit ?? 50,
          panes: [],
        },
        tabs: this.runtimeTabs.map((tab) => ({
          id: tab.id,
          title: tab.title,
          cwd: tab.cwd,
          accent: tab.accent,
          layoutMode: tab.layoutMode,
          colSplit: tab.colSplit,
          rowSplit: tab.rowSplit,
          focusedTerminalId: tab.focusedTerminalId,
          terminals: tab.terminals.map((terminal) => ({
            id: terminal.id,
            cwd: terminal.cwd,
            shell: terminal.shell || '',
            startupCommand: terminal.startupCommand || '',
            status: terminal.status,
            session: terminal.session || null,
            theme: terminal.theme ?? null,
          })),
        })),
        history: this.sessionHistory,
        recovery: this.recoverySnapshot,
      },
    };
  }

  applyWorkspace(workspace: SavedWorkspace): void {
    this.previewMode = false;
    this.activeWorkspace = workspace;
    this.workspaceName = workspace.name;
    this.selectedWorkspace = workspace.name;
    this.selectedWorkspaceId = workspace.id;

    const normalized = normalizeWorkspaceSnapshot(workspace.sessionSnapshot, workspace.cwd);
    this.runtimeTabs = normalized.tabs.map((tab) => mapRuntimeTab(tab));
    this.sessionHistory = normalized.history?.slice(0, 20) || [];
    this.recoverySnapshot = normalized.recovery || this.buildEmptyRecoverySnapshot();
    this.activeTabId =
      normalized.layout.activeTabId || this.runtimeTabs[0]?.id || '';

    const activeTab = this.getActiveTab();
    if (activeTab) {
      activeTab.focusedTerminalId =
        normalized.layout.focusedTerminalId ||
        activeTab.focusedTerminalId ||
        activeTab.terminals[0]?.id ||
        '';
    }

    const focusedTerminal = this.getFocusedTerminal();
    this.workingDirectory = focusedTerminal?.cwd || activeTab?.cwd || workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
    this.updateWorkspaceSummary(activeTab?.layoutMode, workspace.launchProfile);
  }

  async persistWorkspaceState(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshWorkspaces();
  }

  async saveWorkspace(): Promise<SavedWorkspace | null> {
    if (!this.selectedWorkspaceId) {
      return null;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshWorkspaces();
    return saved;
  }

  async restoreWorkspace(): Promise<SavedWorkspace | null> {
    if (!this.selectedWorkspaceId) {
      return null;
    }

    const restored = await this.workspaceBridge.setActiveWorkspace(this.selectedWorkspaceId);
    this.applyWorkspace(restored);
    return restored;
  }

  async selectWorkspace(workspaceId: string): Promise<SavedWorkspace | null> {
    if (workspaceId === this.selectedWorkspaceId) {
      return null;
    }

    await this.persistWorkspaceState();
    const workspace = await this.workspaceBridge.setActiveWorkspace(workspaceId);
    this.applyWorkspace(workspace);
    return workspace;
  }

  startRenameWorkspace(workspace: WorkspaceListItem): void {
    this.editingWorkspaceId = workspace.id;
    this.editingWorkspaceName = workspace.name;
  }

  /** @deprecated Use startRenameWorkspace */
  startRenameSession(session: SessionListItem): void {
    this.startRenameWorkspace(session);
  }

  cancelRenameWorkspace(): void {
    this.editingWorkspaceId = '';
    this.editingWorkspaceName = '';
  }

  /** @deprecated Use cancelRenameWorkspace */
  cancelRenameSession(): void {
    this.cancelRenameWorkspace();
  }

  async commitRenameWorkspace(
    workspaceId: string
  ): Promise<{ name: string } | { error: string } | null> {
    const nextName = this.editingWorkspaceName.trim();
    const current = this.workspaces.find((workspace) => workspace.id === workspaceId);
    this.cancelRenameWorkspace();

    if (!current || !nextName || nextName === current.name) {
      return null;
    }

    const result = await this.workspaceBridge.renameWorkspace(workspaceId, nextName);
    if (!result || 'error' in result) {
      return { error: 'Workspace name is required.' };
    }

    await this.refreshWorkspaces();
    if (workspaceId === this.selectedWorkspaceId) {
      this.workspaceName = result.name;
      this.selectedWorkspace = result.name;
    }

    return { name: result.name };
  }

  /** @deprecated Use commitRenameWorkspace */
  async commitRenameSession(sessionId: string): Promise<{ name: string } | { error: string } | null> {
    return this.commitRenameWorkspace(sessionId);
  }

  async deleteWorkspace(workspaceId: string): Promise<
    | { deletedName: string; activeWorkspace: SavedWorkspace | null }
    | { error: string }
    | null
  > {
    if (this.workspaces.length <= 1) {
      return { error: 'At least one workspace must remain.' };
    }

    const result = await this.workspaceBridge.deleteWorkspace(workspaceId);
    if (!result) {
      return { error: 'Workspace could not be deleted.' };
    }

    if ('error' in result) {
      return { error: 'At least one workspace must remain.' };
    }

    await this.refreshWorkspaces();
    if (result.activeWorkspace) {
      this.applyWorkspace(result.activeWorkspace);
    }

    return { deletedName: result.deletedName, activeWorkspace: result.activeWorkspace };
  }

  /** @deprecated Use deleteWorkspace */
  async deleteSession(sessionId: string): Promise<
    | { deletedName: string; activeWorkspace: SavedWorkspace | null }
    | { error: string }
    | null
  > {
    return this.deleteWorkspace(sessionId);
  }

  async createWorkspace(options?: {
    cwd?: string;
    name?: string;
    icon?: string;
    accent?: string;
  }): Promise<SavedWorkspace> {
    if (this.selectedWorkspaceId) {
      await this.persistWorkspaceState();
    }

    const cwd = options?.cwd || '.';
    const name = options?.name || this.buildWorkspaceName('New Workspace');
    const icon = options?.icon || 'person';
    const accent = options?.accent || 'slate';
    const starterTab = createEmptyTabSnapshot(name, cwd, accent);

    const created = await this.workspaceBridge.createWorkspace({
      name,
      cwd,
      templateId: '',
      icon,
      accent,
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
      sessionSnapshot: {
        layout: {
          mode: 'grid-2x2',
          activeTabId: starterTab.id,
          focusedTerminalId: '',
          panes: [],
        },
        tabs: [starterTab],
        history: [],
        recovery: this.buildEmptyRecoverySnapshot(),
      },
    });

    this.applyWorkspace(created);
    await this.refreshWorkspaces();
    return created;
  }

  createTabDraft(): RuntimeTab | 'blocked' | null {
    if (!this.activeWorkspace) {
      return null;
    }

    if (this.runtimeTabs.length >= MAX_TABS_PER_WORKSPACE) {
      return 'blocked';
    }

    const nextIndex = this.runtimeTabs.length + 1;
    const snapshot = createEmptyTabSnapshot(
      `${this.workspaceName} Tab ${nextIndex}`,
      this.workingDirectory,
      this.workspaces.find((workspace) => workspace.id === this.selectedWorkspaceId)?.accent || 'violet'
    );

    return mapRuntimeTab(snapshot);
  }

  addTab(nextTab: RuntimeTab): void {
    this.runtimeTabs = [...this.runtimeTabs, nextTab];
    this.activeTabId = nextTab.id;
    this.workingDirectory = nextTab.cwd;
    this.updateWorkspaceSummary();
  }

  createTerminalDraft(shell = ''): RuntimeTerminal | 'blocked' | null {
    const tab = this.getActiveTab();
    if (!tab) {
      return null;
    }

    if (tab.terminals.length >= MAX_TERMINALS_PER_TAB) {
      return 'blocked';
    }

    return createTerminalDraft(tab, this.activeWorkspace?.cwd || this.workingDirectory, { shell });
  }

  addTerminal(terminal: RuntimeTerminal): void {
    const tab = this.getActiveTab();
    if (!tab) {
      return;
    }

    tab.terminals = [...tab.terminals, terminal];
    tab.focusedTerminalId = terminal.id;
    this.workingDirectory = terminal.cwd;
    this.updateWorkspaceSummary();
  }

  async selectTab(tabId: string): Promise<RuntimeTab | null> {
    const tab = this.runtimeTabs.find((item) => item.id === tabId);
    if (!tab) {
      return null;
    }

    this.activeTabId = tabId;
    const focusedTerminal = tab.terminals.find((terminal) => terminal.id === tab.focusedTerminalId);
    this.workingDirectory = focusedTerminal?.cwd || tab.cwd;
    await this.persistWorkspaceState();
    return tab;
  }

  updateFocusedTabCwd(value: string): void {
    this.workingDirectory = value;
    this.updateActiveTabField('cwd', value);
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'cwd', value);
    }
  }

  updateFocusedTerminalShell(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'shell', value);
    }
  }

  updateFocusedTerminalTheme(theme: RuntimeTerminal['theme']): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'theme', theme);
    }
  }

  updateFocusedTerminalThemeColors(foreground: string, background: string): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    this.updateTerminalField(terminal.id, 'theme', {
      foreground,
      background,
    });
  }

  resetFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'theme', null);
    }
  }

  usesDefaultTerminalTheme(terminal: RuntimeTerminal | undefined): boolean {
    return !terminal?.theme;
  }

  /** @deprecated Use updateFocusedTerminalShell */
  updateFocusedTabShell(value: string): void {
    this.updateFocusedTerminalShell(value);
  }

  updateFocusedTabStartupCommand(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'startupCommand', value);
    }
  }

  async closeTab(tabId: string): Promise<RuntimeTab | null> {
    const remainingTabs = this.runtimeTabs.filter((tab) => tab.id !== tabId);
    this.runtimeTabs = remainingTabs;

    if (!remainingTabs.length) {
      this.activeTabId = '';
      this.workingDirectory = this.activeWorkspace?.cwd || this.workingDirectory;
      this.updateWorkspaceSummary();
      await this.persistWorkspaceState();
      return null;
    }

    if (this.activeTabId === tabId) {
      const fallbackTab = remainingTabs[0];
      this.activeTabId = fallbackTab.id;
      const focusedTerminal = fallbackTab.terminals.find(
        (terminal) => terminal.id === fallbackTab.focusedTerminalId
      );
      this.workingDirectory = focusedTerminal?.cwd || fallbackTab.cwd;
      this.updateWorkspaceSummary();
      await this.persistWorkspaceState();
      return fallbackTab;
    }

    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    return null;
  }

  async removeTerminal(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    const tab = this.getActiveTab();
    if (!tab) {
      return 'unchanged';
    }

    const terminal = tab.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      return 'unchanged';
    }

    tab.terminals = tab.terminals.filter((item) => item.id !== terminalId);
    if (tab.focusedTerminalId === terminalId) {
      tab.focusedTerminalId = tab.terminals[0]?.id || '';
    }

    const nextFocused = tab.terminals.find((item) => item.id === tab.focusedTerminalId);
    this.workingDirectory = nextFocused?.cwd || tab.cwd;
    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    return nextFocused ?? null;
  }

  /** @deprecated Use removeTerminal */
  async clearPane(terminalId: string): Promise<RuntimeTab | null | 'unchanged'> {
    const result = await this.removeTerminal(terminalId);
    if (result === 'unchanged') {
      return 'unchanged';
    }

    return this.getActiveTab() ?? null;
  }

  async setLayoutMode(mode: LayoutMode): Promise<boolean> {
    const tab = this.getActiveTab();
    if (!tab || tab.layoutMode === mode) {
      return false;
    }

    tab.layoutMode = mode;
    this.updateWorkspaceSummary(tab.layoutMode);
    await this.persistWorkspaceState();
    return true;
  }

  async focusTerminal(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    const tab = this.getActiveTab();
    const terminal = tab?.terminals.find((item) => item.id === terminalId);
    if (!tab || !terminal) {
      return null;
    }

    if (tab.focusedTerminalId === terminalId) {
      return 'unchanged';
    }

    tab.focusedTerminalId = terminalId;
    this.workingDirectory = terminal.cwd;
    await this.persistWorkspaceState();
    return terminal;
  }

  /** @deprecated Use focusTerminal */
  async focusPane(terminalId: string): Promise<RuntimeTab | null | 'unchanged'> {
    const result = await this.focusTerminal(terminalId);
    if (result === 'unchanged') {
      return 'unchanged';
    }

    return this.getActiveTab() ?? null;
  }

  updateTerminalStatus(terminalId: string, status: string): void {
    this.updateTerminalField(terminalId, 'status', status);
  }

  /** @deprecated Use updateTerminalStatus */
  updateTabStatus(tabId: string, status: string): void {
    const tab = this.runtimeTabs.find((item) => item.id === tabId);
    const terminalId = tab?.focusedTerminalId;
    if (terminalId) {
      this.updateTerminalStatus(terminalId, status);
    }
  }

  updateTerminalSessionSnapshot(terminalId: string, session: PaneSessionSnapshot | null): void {
    this.updateTerminalField(terminalId, 'session', session);
  }

  /** @deprecated Use updateTerminalSessionSnapshot */
  updatePaneSessionSnapshot(terminalId: string, session: PaneSessionSnapshot | null): void {
    this.updateTerminalSessionSnapshot(terminalId, session);
  }

  recordSessionLaunch(
    tab: RuntimeTab,
    terminalId: string,
    metadata: { shell: string; startedAt: string | null }
  ): void {
    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastLaunchAt: metadata.startedAt,
      lastAttachedPaneId: terminalId,
      lastAttachedTabId: tab.id,
      lastRecoveredAt: new Date().toISOString(),
      lastStopReason: null,
      lastSessionEndedAt: null,
      lastExitCode: null,
    };
  }

  recordSessionEvent(
    tab: RuntimeTab,
    terminalId: string,
    entry: Omit<SessionHistoryEntry, 'id' | 'tabId' | 'tabTitle' | 'paneId' | 'shell' | 'cwd'>
  ): void {
    const terminal = tab.terminals.find((item) => item.id === terminalId);
    this.sessionHistory = [
      {
        id: `session-${Date.now()}-${this.sessionHistory.length}`,
        tabId: tab.id,
        tabTitle: tab.title,
        paneId: terminalId,
        shell: terminal?.shell || '',
        cwd: terminal?.cwd || tab.cwd,
        ...entry,
      },
      ...this.sessionHistory,
    ].slice(0, 20);

    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastAttachedPaneId: terminalId,
      lastAttachedTabId: tab.id,
      lastStopReason: entry.reason,
      lastSessionEndedAt: entry.endedAt,
      lastExitCode: entry.exitCode,
    };
  }

  updatePaneSplit(mode: 'col' | 'row', clientX: number, clientY: number, bounds: DOMRect): void {
    const tab = this.getActiveTab();
    if (!tab) {
      return;
    }

    if (mode === 'col') {
      const pct = ((clientX - bounds.left) / bounds.width) * 100;
      tab.colSplit = Math.min(78, Math.max(22, pct));
    } else {
      const pct = ((clientY - bounds.top) / bounds.height) * 100;
      tab.rowSplit = Math.min(78, Math.max(22, pct));
    }
  }

  getTerminalTone(terminal: RuntimeTerminal): string {
    return this.getActiveTab()?.accent || 'slate';
  }

  getPaneTone(terminal: RuntimeTerminal): string {
    return this.getTerminalTone(terminal);
  }

  getTerminalDisplayTitle(terminal: RuntimeTerminal, index: number): string {
    const tab = this.getActiveTab();
    if (tab && tab.terminals.length === 1) {
      return tab.title;
    }

    return `Shell ${index + 1}`;
  }

  getPaneDisplayTitle(terminal: RuntimeTerminal, index: number): string {
    return this.getTerminalDisplayTitle(terminal, index);
  }

  getTerminalSummaryLine(terminal: RuntimeTerminal): string {
    return `${terminal.cwd} ${terminal.startupCommand?.trim() ? `| ${terminal.startupCommand.trim()}` : '| interactive shell'}`;
  }

  getPaneSummaryLine(terminal: RuntimeTerminal): string {
    return this.getTerminalSummaryLine(terminal);
  }

  getTerminalStatusLabel(terminal: RuntimeTerminal): string {
    return this.formatPaneStatus(terminal.status);
  }

  getPaneStatusLabel(terminal: RuntimeTerminal): string {
    return this.getTerminalStatusLabel(terminal);
  }

  isTerminalRunning(terminal: RuntimeTerminal): boolean {
    return terminal.status.toLowerCase() === 'running';
  }

  isPaneRunning(terminal: RuntimeTerminal): boolean {
    return this.isTerminalRunning(terminal);
  }

  getTerminalMetaLine(terminal: RuntimeTerminal): string {
    const tab = this.getActiveTab();
    if (this.previewMode && tab) {
      switch (tab.title) {
        case 'API':
          return 'main • 7192';
        case 'Angular':
          return 'main • 4200';
        case 'Database':
          return 'local • 5432';
        case 'Docker':
          return 'up • 4 containers';
      }
    }

    const profile = terminal.startupCommand?.trim() ? 'command' : 'interactive';
    return `${profile} • ${terminal.status}`;
  }

  getPaneMetaLine(terminal: RuntimeTerminal): string {
    return this.getTerminalMetaLine(terminal);
  }

  shouldRenderTerminalPreview(terminal: RuntimeTerminal): boolean {
    return this.previewMode;
  }

  shouldRenderPanePreview(terminal: RuntimeTerminal): boolean {
    return this.shouldRenderTerminalPreview(terminal);
  }

  getTerminalPreviewText(terminal: RuntimeTerminal): string {
    const tab = this.getActiveTab();
    if (!tab) {
      return '';
    }

    switch (tab.title) {
      case 'API':
        return [
          'PS C:\\Projects\\CloudPOS\\Api> dotnet run',
          'info: Microsoft.Hosting.Lifetime[14]',
          '      Now listening on: https://localhost:7192',
          'info: Microsoft.Hosting.Lifetime[0]',
          '      Application started. Press Ctrl+C to shut down.',
        ].join('\n');
      case 'Angular':
        return [
          'PS C:\\Projects\\CloudPOS\\Angular> npm start',
          '> ng serve',
          '** Angular Live Development Server is listening on localhost:4200 **',
        ].join('\n');
      case 'Database':
        return [
          'PS C:\\> docker exec -it cloudpos-db psql -U postgres',
          'postgres=# \\dt',
          '(4 rows)',
        ].join('\n');
      case 'Docker':
        return [
          'PS C:\\Projects\\CloudPOS> docker compose ps',
          'api       cloudpos-api       Up 4 mins   0.0.0.0:5192->5192',
          'angular   cloudpos-angular   Up 4 mins   0.0.0.0:4200->4200',
        ].join('\n');
      default:
        return `PS ${terminal.cwd}>`;
    }
  }

  getPanePreviewText(terminal: RuntimeTerminal): string {
    return this.getTerminalPreviewText(terminal);
  }

  loadReferencePreviewState(): SavedWorkspace {
    this.previewMode = true;
    this.status = 'Reference preview mode';
    this.workspaces = [
      { id: 'ws-cloud-pos', name: 'Cloud POS', icon: 'cloud', accent: 'violet' },
      { id: 'ws-moment-trace', name: 'MomentTrace', icon: 'spark', accent: 'slate' },
      { id: 'ws-gcse-tutor', name: 'GCSE Tutor', icon: 'cap', accent: 'slate' },
      { id: 'ws-infrastructure', name: 'Infrastructure', icon: 'server', accent: 'slate' },
      { id: 'ws-personal', name: 'Personal', icon: 'person', accent: 'slate' },
    ];
    this.selectedWorkspaceId = 'ws-cloud-pos';

    const previewTabs = [
      {
        title: 'API',
        cwd: 'C:\\Projects\\CloudPOS\\Api',
        accent: 'violet',
        startupCommand: 'dotnet run',
      },
      {
        title: 'Angular',
        cwd: 'C:\\Projects\\CloudPOS\\Angular',
        accent: 'amber',
        startupCommand: 'npm start',
      },
      {
        title: 'Database',
        cwd: 'C:\\',
        accent: 'blue',
        startupCommand: 'docker exec -it cloudpos-db psql -U postgres',
      },
      {
        title: 'Docker',
        cwd: 'C:\\Projects\\CloudPOS',
        accent: 'cyan',
        startupCommand: 'docker compose ps',
      },
    ].map((item, index) => ({
      id: `tab-${item.title.toLowerCase()}`,
      title: item.title,
      cwd: item.cwd,
      accent: item.accent,
      layoutMode: 'grid-2' as LayoutMode,
      colSplit: 50,
      rowSplit: 50,
      focusedTerminalId: `terminal-${index + 1}`,
      terminals: [
        {
          id: `terminal-${index + 1}`,
          cwd: item.cwd,
          shell: 'powershell',
          startupCommand: item.startupCommand,
          status: 'running',
          session: null,
        },
      ],
    }));

    const workspace: SavedWorkspace = {
      id: 'ws-cloud-pos',
      name: 'Cloud POS',
      cwd: 'C:\\Projects\\CloudPOS\\Api',
      shell: 'powershell',
      templateId: 'full-stack',
      icon: 'cloud',
      accent: 'violet',
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
      updatedAt: new Date().toISOString(),
      sessionSnapshot: {
        layout: {
          mode: 'grid-2',
          activeTabId: previewTabs[0].id,
          focusedTerminalId: previewTabs[0].focusedTerminalId,
          panes: [],
        },
        tabs: previewTabs,
      },
    };

    this.applyWorkspace(workspace);
    this.previewMode = true;
    return workspace;
  }

  private mapWorkspace(workspace: SavedWorkspace): WorkspaceListItem {
    return {
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon || 'cloud',
      accent: workspace.accent || 'slate',
    };
  }

  private updateActiveTabField(field: 'cwd', value: string): void {
    const tab = this.getActiveTab();
    if (!tab) {
      return;
    }

    tab.cwd = value;
  }

  private updateTerminalField<K extends keyof RuntimeTerminal>(
    terminalId: string,
    field: K,
    value: RuntimeTerminal[K]
  ): void {
    for (const tab of this.runtimeTabs) {
      const index = tab.terminals.findIndex((terminal) => terminal.id === terminalId);
      if (index === -1) {
        continue;
      }

      tab.terminals = tab.terminals.map((terminal, terminalIndex) =>
        terminalIndex === index ? { ...terminal, [field]: value } : terminal
      );
      return;
    }
  }

  private updateWorkspaceSummary(layoutMode?: string, launchProfile?: string): void {
    const activeTab = this.getActiveTab();
    this.workspaceSummary = {
      layoutMode: layoutMode || activeTab?.layoutMode || 'grid-2x2',
      launchProfile: launchProfile || this.workspaceSummary.launchProfile || 'manual',
      tabCount: this.runtimeTabs.length,
      paneCount: activeTab?.terminals.length || 0,
    };
  }

  private formatPaneStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (!normalized) {
      return 'Idle';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private buildEmptyRecoverySnapshot(): RecoverySnapshot {
    return {
      lastLaunchAt: null,
      lastAttachedPaneId: null,
      lastAttachedTabId: null,
      lastExitCode: null,
      lastStopReason: null,
      lastSessionEndedAt: null,
      lastRecoveredAt: null,
    };
  }
}
