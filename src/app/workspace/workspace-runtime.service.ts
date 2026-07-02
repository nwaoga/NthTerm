import { Injectable, inject } from '@angular/core';

import { SavedWorkspace, WorkspaceBridgeService, WorkspaceDraft } from '../workspace-bridge.service';
import {
  LayoutMode,
  PaneSessionSnapshot,
  RuntimePane,
  RuntimeTab,
  RecoverySnapshot,
  SHELL_OPTIONS,
  SessionListItem,
  SessionHistoryEntry,
  TemplateListItem,
  WorkspaceSummary,
} from '../models';

@Injectable({ providedIn: 'root' })
export class WorkspaceRuntimeService {
  status = 'Loading workspace...';
  workspaceName = '';
  workingDirectory = '';
  lastSavedAt = '';
  selectedWorkspace = '';
  selectedWorkspaceId = '';
  activeTabId = '';
  focusedPaneId = 'pane-1';
  layoutMode: LayoutMode = 'grid-2x2';
  paneColSplit = 50;
  paneRowSplit = 50;
  paneResizeMode: 'col' | 'row' | null = null;
  previewMode = false;
  editingSessionId = '';
  editingSessionName = '';

  sessions: SessionListItem[] = [];
  runtimeTabs: RuntimeTab[] = [];
  runtimePanes: RuntimePane[] = [];
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

  getFocusedPaneTab(): RuntimeTab | undefined {
    const focusedPane = this.runtimePanes.find((pane) => pane.id === this.focusedPaneId);
    if (!focusedPane?.tabId) {
      return undefined;
    }

    return this.runtimeTabs.find((tab) => tab.id === focusedPane.tabId);
  }

  getFocusedTab(): RuntimeTab | undefined {
    return this.getFocusedPaneTab();
  }

  getPaneTab(pane: RuntimePane): RuntimeTab | undefined {
    return pane.tabId ? this.runtimeTabs.find((tab) => tab.id === pane.tabId) : undefined;
  }

  getPaneById(paneId: string): RuntimePane | undefined {
    return this.runtimePanes.find((pane) => pane.id === paneId);
  }

  isSessionActive(session: SessionListItem): boolean {
    return session.id === this.selectedWorkspaceId;
  }

  isTabActive(tab: RuntimeTab): boolean {
    return tab.id === this.activeTabId;
  }

  isPaneFocused(pane: RuntimePane): boolean {
    return pane.id === this.focusedPaneId;
  }

  getFocusedTabShellLabel(): string {
    const shell = this.getFocusedTab()?.shell || '';
    return SHELL_OPTIONS.find((option) => option.value === shell)?.label || 'System Default';
  }

  async refreshSessions(): Promise<void> {
    const workspaces = await this.workspaceBridge.listWorkspaces();
    this.sessions = workspaces.map((workspace) => this.mapSession(workspace));
  }

  buildWorkspaceName(baseName: string): string {
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

  currentWorkspaceDraft(): WorkspaceDraft {
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
            session: pane.session || null,
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
    this.runtimeTabs =
      workspace.sessionSnapshot?.tabs?.map((tab) => ({
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
    this.sessionHistory = workspace.sessionSnapshot?.history?.slice(0, 20) || [];
    this.recoverySnapshot = workspace.sessionSnapshot?.recovery || this.buildEmptyRecoverySnapshot();
    this.focusedPaneId =
      workspace.sessionSnapshot?.layout?.focusedPaneId || this.runtimePanes[0]?.id || 'pane-1';

    const focusedTab = this.getFocusedPaneTab();
    this.activeTabId =
      focusedTab?.id ||
      workspace.sessionSnapshot?.layout?.activeTabId ||
      this.runtimeTabs[0]?.id ||
      '';
    this.workingDirectory = focusedTab?.cwd || workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
    this.updateWorkspaceSummary(workspace.layoutMode || this.layoutMode, workspace.launchProfile);
  }

  async persistWorkspaceState(): Promise<void> {
    if (!this.selectedWorkspaceId) {
      return;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshSessions();
  }

  async saveWorkspace(): Promise<SavedWorkspace | null> {
    if (!this.selectedWorkspaceId) {
      return null;
    }

    const saved = await this.workspaceBridge.saveWorkspace(this.currentWorkspaceDraft());
    this.applyWorkspace(saved);
    await this.refreshSessions();
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

  startRenameSession(session: SessionListItem): void {
    this.editingSessionId = session.id;
    this.editingSessionName = session.name;
  }

  cancelRenameSession(): void {
    this.editingSessionId = '';
    this.editingSessionName = '';
  }

  async commitRenameSession(sessionId: string): Promise<{ name: string } | { error: string } | null> {
    const nextName = this.editingSessionName.trim();
    const current = this.sessions.find((session) => session.id === sessionId);
    this.cancelRenameSession();

    if (!current || !nextName || nextName === current.name) {
      return null;
    }

    const result = await this.workspaceBridge.renameWorkspace(sessionId, nextName);
    if (!result || 'error' in result) {
      return { error: 'Workspace name is required.' };
    }

    await this.refreshSessions();
    if (sessionId === this.selectedWorkspaceId) {
      this.workspaceName = result.name;
      this.selectedWorkspace = result.name;
    }

    return { name: result.name };
  }

  async deleteSession(sessionId: string): Promise<
    | { deletedName: string; activeWorkspace: SavedWorkspace | null }
    | { error: string }
    | null
  > {
    if (this.sessions.length <= 1) {
      return { error: 'At least one workspace must remain.' };
    }

    const result = await this.workspaceBridge.deleteWorkspace(sessionId);
    if (!result) {
      return { error: 'Workspace could not be deleted.' };
    }

    if ('error' in result) {
      return { error: 'At least one workspace must remain.' };
    }

    await this.refreshSessions();
    if (result.activeWorkspace) {
      this.applyWorkspace(result.activeWorkspace);
    }

    return { deletedName: result.deletedName, activeWorkspace: result.activeWorkspace };
  }

  async createWorkspaceFromTemplate(
    template: TemplateListItem,
    options?: { cwd?: string; name?: string }
  ): Promise<SavedWorkspace> {
    if (this.selectedWorkspaceId) {
      await this.persistWorkspaceState();
    }

    const created = await this.workspaceBridge.createWorkspace({
      name: options?.name || this.buildWorkspaceName(template.name),
      cwd: options?.cwd || template.cwd,
      templateId: template.templateId,
      icon: template.icon,
      accent: template.accent,
      layoutMode: 'grid-2x2',
      launchProfile: 'manual',
    });

    this.applyWorkspace(created);
    await this.refreshSessions();
    return created;
  }

  createTabDraft(): RuntimeTab | null {
    if (!this.activeWorkspace) {
      return null;
    }

    const nextIndex = this.runtimeTabs.length + 1;
    return {
      id: `tab-${nextIndex}-${Date.now()}`,
      title: `${this.workspaceName} Tab ${nextIndex}`,
      cwd: this.workingDirectory,
      status: 'running',
      accent:
        this.sessions.find((session) => session.id === this.selectedWorkspaceId)?.accent ||
        'violet',
      shell: '',
      startupCommand: '',
    };
  }

  addTab(nextTab: RuntimeTab): void {
    this.runtimeTabs = [...this.runtimeTabs, nextTab];
    this.activeTabId = nextTab.id;
    this.assignTabToPane(this.focusedPaneId, nextTab.id);
    this.updateWorkspaceSummary();
  }

  async selectTab(tabId: string): Promise<RuntimeTab | null> {
    const tab = this.runtimeTabs.find((item) => item.id === tabId);
    if (!tab) {
      return null;
    }

    this.activeTabId = tabId;
    this.assignTabToPane(this.focusedPaneId, tabId);
    this.workingDirectory = tab.cwd;
    await this.persistWorkspaceState();
    return tab;
  }

  updateFocusedTabCwd(value: string): void {
    this.workingDirectory = value;
    this.updateFocusedTabField('cwd', value);
  }

  updateFocusedTabShell(value: string): void {
    this.updateFocusedTabField('shell', value);
  }

  updateFocusedTabStartupCommand(value: string): void {
    this.updateFocusedTabField('startupCommand', value);
  }

  async closeTab(tabId: string): Promise<RuntimeTab | null | 'blocked'> {
    if (this.runtimeTabs.length <= 1) {
      return 'blocked';
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
      this.updateWorkspaceSummary();
      await this.persistWorkspaceState();
      return fallbackTab;
    }

    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    return null;
  }

  async setLayoutMode(mode: LayoutMode): Promise<boolean> {
    if (this.layoutMode === mode) {
      return false;
    }

    this.layoutMode = mode;
    this.runtimePanes = this.buildPanesForMode(mode, this.runtimeTabs, this.runtimePanes);
    if (!this.runtimePanes.some((pane) => pane.id === this.focusedPaneId)) {
      this.focusedPaneId = this.runtimePanes[0]?.id || 'pane-1';
    }

    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    return true;
  }

  async focusPane(paneId: string): Promise<RuntimeTab | null | 'unchanged'> {
    if (paneId === this.focusedPaneId) {
      return 'unchanged';
    }

    this.focusedPaneId = paneId;
    const focusedTab = this.getFocusedPaneTab();

    if (focusedTab) {
      this.activeTabId = focusedTab.id;
      this.workingDirectory = focusedTab.cwd;
    }

    await this.persistWorkspaceState();
    return focusedTab ?? null;
  }

  updateTabStatus(tabId: string, status: string): void {
    this.runtimeTabs = this.runtimeTabs.map((tab) =>
      tab.id === tabId ? { ...tab, status } : tab
    );
  }

  updatePaneSessionSnapshot(paneId: string, session: PaneSessionSnapshot | null): void {
    this.runtimePanes = this.runtimePanes.map((pane) =>
      pane.id === paneId ? { ...pane, session } : pane
    );
  }

  recordSessionLaunch(
    tab: RuntimeTab,
    paneId: string,
    metadata: { shell: string; startedAt: string | null }
  ): void {
    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastLaunchAt: metadata.startedAt,
      lastAttachedPaneId: paneId,
      lastAttachedTabId: tab.id,
      lastRecoveredAt: new Date().toISOString(),
      lastStopReason: null,
      lastSessionEndedAt: null,
      lastExitCode: null,
    };
  }

  recordSessionEvent(
    tab: RuntimeTab,
    paneId: string,
    entry: Omit<SessionHistoryEntry, 'id' | 'tabId' | 'tabTitle' | 'paneId' | 'shell' | 'cwd'>
  ): void {
    this.sessionHistory = [
      {
        id: `session-${Date.now()}-${this.sessionHistory.length}`,
        tabId: tab.id,
        tabTitle: tab.title,
        paneId,
        shell: tab.shell || '',
        cwd: tab.cwd,
        ...entry,
      },
      ...this.sessionHistory,
    ].slice(0, 20);

    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastAttachedPaneId: paneId,
      lastAttachedTabId: tab.id,
      lastStopReason: entry.reason,
      lastSessionEndedAt: entry.endedAt,
      lastExitCode: entry.exitCode,
    };
  }

  updatePaneSplit(mode: 'col' | 'row', clientX: number, clientY: number, bounds: DOMRect): void {
    if (mode === 'col') {
      const pct = ((clientX - bounds.left) / bounds.width) * 100;
      this.paneColSplit = Math.min(78, Math.max(22, pct));
    } else {
      const pct = ((clientY - bounds.top) / bounds.height) * 100;
      this.paneRowSplit = Math.min(78, Math.max(22, pct));
    }
  }

  getPaneTone(pane: RuntimePane): string {
    return this.getPaneTab(pane)?.accent || 'slate';
  }

  getPaneDisplayTitle(pane: RuntimePane, index: number): string {
    return this.getPaneTab(pane)?.title || `Pane ${index + 1}`;
  }

  getPaneSummaryLine(pane: RuntimePane): string {
    const tab = this.getPaneTab(pane);
    if (!tab) {
      return 'Ready for a tab assignment';
    }

    return `${tab.cwd} ${tab.startupCommand?.trim() ? `| ${tab.startupCommand.trim()}` : '| interactive shell'}`;
  }

  getPaneStatusLabel(pane: RuntimePane): string {
    const tab = this.getPaneTab(pane);
    if (!tab) {
      return 'Idle';
    }

    return this.formatPaneStatus(tab.status);
  }

  isPaneRunning(pane: RuntimePane): boolean {
    const tab = this.getPaneTab(pane);
    return Boolean(tab && tab.status.toLowerCase() === 'running');
  }

  getPaneMetaLine(pane: RuntimePane): string {
    const tab = this.getPaneTab(pane);
    if (!tab) {
      return '';
    }

    if (this.previewMode) {
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

    const profile = tab.startupCommand?.trim() ? 'command' : 'interactive';
    return `${profile} • ${tab.status}`;
  }

  shouldRenderPanePreview(pane: RuntimePane): boolean {
    return this.previewMode && Boolean(this.getPaneTab(pane));
  }

  getPanePreviewText(pane: RuntimePane): string {
    const tab = this.getPaneTab(pane);
    if (!tab) {
      return '';
    }

    switch (tab.title) {
      case 'API':
        return [
          'PS C:\\Projects\\CloudPOS\\Api> dotnet run',
          'info: Microsoft.Hosting.Lifetime[14]',
          '      Now listening on: https://localhost:7192',
          'info: Microsoft.Hosting.Lifetime[14]',
          '      Now listening on: http://localhost:5192',
          'info: Microsoft.Hosting.Lifetime[0]',
          '      Application started. Press Ctrl+C to shut down.',
          'info: Microsoft.Hosting.Lifetime[0]',
          '      Hosting environment: Development',
          'info: Microsoft.Hosting.Lifetime[0]',
          '      Content root path: C:\\Projects\\CloudPOS\\Api',
        ].join('\n');
      case 'Angular':
        return [
          'PS C:\\Projects\\CloudPOS\\Angular> npm start',
          '> ng serve',
          '',
          'Browser application bundle generation complete.',
          '',
          'Initial Chunk Files        Names          Raw Size',
          'main.js                    main           2.35 MB',
          'polyfills.js               polyfills      88.90 kB',
          'runtime.js                 runtime        6.15 kB',
          'styles.css                 styles         95.20 kB',
          '',
          '** Angular Live Development Server is listening on',
          'localhost:4200, open your browser on http://localhost:4200/ **',
        ].join('\n');
      case 'Database':
        return [
          'PS C:\\> docker exec -it cloudpos-db psql -U postgres',
          'psql (16.2)',
          'Type "help" for help.',
          '',
          'postgres=# \\dt',
          'Schema | __EFMigrationsHistory | table | postgres',
          'public | Customers            | table | postgres',
          'public | Orders               | table | postgres',
          'public | OrderItems           | table | postgres',
          '',
          '(4 rows)',
        ].join('\n');
      case 'Docker':
        return [
          'PS C:\\Projects\\CloudPOS> docker compose ps',
          'NAME      IMAGE               STATUS      PORTS',
          'api       cloudpos-api       Up 4 mins   0.0.0.0:5192->5192',
          'angular   cloudpos-angular   Up 4 mins   0.0.0.0:4200->4200',
          'db        postgres:16        Up 4 mins   0.0.0.0:5432->5432',
          'redis     redis:7            Up 4 mins   0.0.0.0:6379->6379',
        ].join('\n');
      default:
        return `PS ${tab.cwd}>`;
    }
  }

  loadReferencePreviewState(): SavedWorkspace {
    this.previewMode = true;
    this.status = 'Reference preview mode';
    this.sessions = [
      { id: 'ws-cloud-pos', name: 'Cloud POS', icon: 'cloud', accent: 'violet' },
      { id: 'ws-moment-trace', name: 'MomentTrace', icon: 'spark', accent: 'slate' },
      { id: 'ws-gcse-tutor', name: 'GCSE Tutor', icon: 'cap', accent: 'slate' },
      { id: 'ws-infrastructure', name: 'Infrastructure', icon: 'server', accent: 'slate' },
      { id: 'ws-personal', name: 'Personal', icon: 'person', accent: 'slate' },
    ];
    this.selectedWorkspaceId = 'ws-cloud-pos';

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
          mode: 'grid-2x2',
          activeTabId: 'tab-api',
          focusedPaneId: 'pane-1',
          colSplit: 50,
          rowSplit: 50,
          panes: [
            { id: 'pane-1', tabId: 'tab-api' },
            { id: 'pane-2', tabId: 'tab-angular' },
            { id: 'pane-3', tabId: 'tab-database' },
            { id: 'pane-4', tabId: 'tab-docker' },
          ],
        },
        tabs: [
          {
            id: 'tab-api',
            title: 'API',
            cwd: 'C:\\Projects\\CloudPOS\\Api',
            status: 'running',
            accent: 'violet',
            shell: 'powershell',
            startupCommand: 'dotnet run',
          },
          {
            id: 'tab-angular',
            title: 'Angular',
            cwd: 'C:\\Projects\\CloudPOS\\Angular',
            status: 'running',
            accent: 'amber',
            shell: 'powershell',
            startupCommand: 'npm start',
          },
          {
            id: 'tab-database',
            title: 'Database',
            cwd: 'C:\\',
            status: 'running',
            accent: 'blue',
            shell: 'powershell',
            startupCommand: 'docker exec -it cloudpos-db psql -U postgres',
          },
          {
            id: 'tab-docker',
            title: 'Docker',
            cwd: 'C:\\Projects\\CloudPOS',
            status: 'running',
            accent: 'cyan',
            shell: 'powershell',
            startupCommand: 'docker compose ps',
          },
        ],
      },
    };

    this.applyWorkspace(workspace);
    this.previewMode = true;
    return workspace;
  }

  buildPanesForMode(
    mode: LayoutMode,
    tabs: RuntimeTab[],
    existingPanes: RuntimePane[]
  ): RuntimePane[] {
    const paneIds =
      mode === 'grid-2' ? ['pane-1', 'pane-2'] : ['pane-1', 'pane-2', 'pane-3', 'pane-4'];

    return paneIds.map((paneId, index) => {
      const existing = existingPanes.find((pane) => pane.id === paneId);
      return {
        id: paneId,
        tabId: existing?.tabId ?? tabs[index]?.id ?? null,
        session: existing?.session || null,
      };
    });
  }

  private mapSession(workspace: SavedWorkspace): SessionListItem {
    return {
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon || 'cloud',
      accent: workspace.accent || 'slate',
    };
  }

  private assignTabToPane(paneId: string, tabId: string): void {
    this.runtimePanes = this.runtimePanes.map((pane) =>
      pane.id === paneId ? { ...pane, tabId } : pane
    );
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

  private updateWorkspaceSummary(layoutMode?: string, launchProfile?: string): void {
    this.workspaceSummary = {
      layoutMode: layoutMode || this.layoutMode,
      launchProfile: launchProfile || this.workspaceSummary.launchProfile || 'manual',
      tabCount: this.runtimeTabs.length,
      paneCount: this.runtimePanes.length,
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
