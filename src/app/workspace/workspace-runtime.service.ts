import { Injectable, inject } from '@angular/core';

import { SavedWorkspace, WorkspaceBridgeService, WorkspaceDraft } from '../workspace-bridge.service';
import {
  CommandHistoryEntry,
  LayoutMode,
  PaneSessionSnapshot,
  RuntimeTerminal,
  RecoverySnapshot,
  SessionListItem,
  ShellId,
  WorkspaceListItem,
  WorkspaceShellProfile,
  SessionHistoryEntry,
  WorkspaceSummary,
  buildShellOptions,
  buildWorkspaceShellProfileOptions,
  isWorkspaceShellProfile,
  resolveShellOptionLabel,
  resolveWorkspaceShellProfileLabel,
} from '../models';
import { resolveHostPlatform } from '../platform/host-platform';
import {
  MAX_TERMINALS_PER_WORKSPACE,
  createTerminalDraft,
  getEffectiveLayoutMode,
  mapRuntimeTerminal,
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
  workspaceShellProfile: WorkspaceShellProfile = '';
  focusedTerminalId = '';
  paneColSplit = 50;
  paneRowSplit = 50;
  paneResizeMode: 'col' | 'row' | null = null;
  previewMode = false;
  editingWorkspaceId = '';
  editingWorkspaceName = '';
  wslDistros: string[] = [];
  workspaceAccent = 'slate';

  workspaces: WorkspaceListItem[] = [];
  terminals: RuntimeTerminal[] = [];
  workspaceSummary: WorkspaceSummary = {
    layoutMode: 'grid-2',
    launchProfile: 'manual',
    paneCount: 0,
  };

  activeWorkspace?: SavedWorkspace;
  sessionHistory: SessionHistoryEntry[] = [];
  recoverySnapshot: RecoverySnapshot = this.buildEmptyRecoverySnapshot();

  private readonly workspaceBridge = inject(WorkspaceBridgeService);

  get layoutMode(): LayoutMode {
    return this.getEffectiveActiveLayoutMode();
  }

  get focusedPaneId(): string {
    return this.focusedTerminalId;
  }

  set focusedPaneId(value: string) {
    this.focusedTerminalId = value;
  }

  /** @deprecated Use terminals */
  get runtimeTabs() {
    return [];
  }

  /** @deprecated Tabs removed */
  get activeTabId(): string {
    return '';
  }

  getActiveTabTerminals(): RuntimeTerminal[] {
    return this.terminals;
  }

  getEffectiveActiveLayoutMode(): LayoutMode {
    return getEffectiveLayoutMode(this.terminals.length);
  }

  getActiveLayoutLabel(): string {
    switch (this.terminals.length) {
      case 0:
      case 1:
        return 'Full stage';
      case 2:
        return 'Side by side';
      case 3:
        return 'Wide lower pane';
      default:
        return 'Four-pane grid';
    }
  }

  getTerminalById(terminalId: string): RuntimeTerminal | undefined {
    return this.terminals.find((terminal) => terminal.id === terminalId);
  }

  getFocusedTerminal(): RuntimeTerminal | undefined {
    if (!this.focusedTerminalId) {
      return undefined;
    }

    return this.terminals.find((terminal) => terminal.id === this.focusedTerminalId);
  }

  getPaneById(terminalId: string): RuntimeTerminal | undefined {
    return this.getTerminalById(terminalId);
  }

  isWorkspaceActive(workspace: WorkspaceListItem): boolean {
    return workspace.id === this.selectedWorkspaceId;
  }

  /** @deprecated Use isWorkspaceActive */
  isSessionActive(session: SessionListItem): boolean {
    return this.isWorkspaceActive(session);
  }

  isTerminalFocused(terminal: RuntimeTerminal): boolean {
    return terminal.id === this.focusedTerminalId;
  }

  isPaneFocused(terminal: RuntimeTerminal): boolean {
    return this.isTerminalFocused(terminal);
  }

  getFocusedTerminalShellLabel(): string {
    const shell = this.getFocusedTerminal()?.shell || '';
    return resolveShellOptionLabel(shell, this.wslDistros);
  }

  /** @deprecated Use getFocusedTerminalShellLabel */
  getFocusedTabShellLabel(): string {
    return this.getFocusedTerminalShellLabel();
  }

  getWorkspaceShellProfileLabel(): string {
    return resolveWorkspaceShellProfileLabel(this.workspaceShellProfile, this.wslDistros);
  }

  setWslDistros(distros: string[]): void {
    this.wslDistros = Array.from(new Set(distros.map((distro) => distro.trim()).filter(Boolean)));
  }

  getShellOptions() {
    return buildShellOptions(this.wslDistros, resolveHostPlatform());
  }

  getWorkspaceShellProfileOptions() {
    return buildWorkspaceShellProfileOptions(this.wslDistros, resolveHostPlatform());
  }

  resolveNewTerminalShell(explicitShell: ShellId | undefined, appDefaultShell: ShellId): ShellId {
    if (explicitShell !== undefined) {
      return explicitShell;
    }

    if (this.workspaceShellProfile === 'system') {
      return '';
    }

    return this.workspaceShellProfile || appDefaultShell || '';
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

    return {
      id: this.selectedWorkspaceId,
      name: this.workspaceName.trim() || 'Untitled Workspace',
      cwd: this.workingDirectory.trim(),
      shell: this.workspaceShellProfile,
      icon: currentWorkspace?.icon || 'cloud',
      accent: currentWorkspace?.accent || this.workspaceAccent || 'slate',
      layoutMode: this.getEffectiveActiveLayoutMode(),
      launchProfile: this.workspaceSummary.launchProfile,
      sessionSnapshot: {
        layout: {
          mode: this.getEffectiveActiveLayoutMode(),
          focusedPaneId: this.focusedTerminalId || '',
          focusedTerminalId: this.focusedTerminalId || '',
          colSplit: this.paneColSplit,
          rowSplit: this.paneRowSplit,
        },
        terminals: this.terminals.map((terminal) => ({
          id: terminal.id,
          name: terminal.name?.trim() || '',
          cwd: terminal.cwd,
          shell: terminal.shell || '',
          startupCommand: terminal.startupCommand || '',
          status: terminal.status,
          session: terminal.session || null,
          theme: terminal.theme ?? null,
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
    this.workspaceShellProfile = this.normalizeWorkspaceShellProfile(workspace.shell);
    this.workspaceAccent = workspace.accent || 'slate';

    const normalized = normalizeWorkspaceSnapshot(workspace.sessionSnapshot, workspace.cwd);
    this.terminals = normalized.terminals.map((terminal) => mapRuntimeTerminal(terminal));
    this.sessionHistory = normalized.history?.slice(0, 20) || [];
    this.recoverySnapshot = normalized.recovery || this.buildEmptyRecoverySnapshot();
    this.focusedTerminalId =
      normalized.layout.focusedTerminalId || this.terminals[0]?.id || '';
    this.paneColSplit = normalized.layout.colSplit;
    this.paneRowSplit = normalized.layout.rowSplit;

    const focusedTerminal = this.getFocusedTerminal();
    this.workingDirectory = focusedTerminal?.cwd || workspace.cwd;
    this.lastSavedAt = workspace.updatedAt;
    this.updateWorkspaceSummary(normalized.layout.mode, workspace.launchProfile);
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

    const created = await this.workspaceBridge.createWorkspace({
      name,
      cwd,
      shell: '',
      templateId: '',
      icon,
      accent,
      layoutMode: 'grid-2',
      launchProfile: 'manual',
      sessionSnapshot: {
        layout: {
          mode: 'grid-2',
          focusedTerminalId: '',
          colSplit: 50,
          rowSplit: 50,
        },
        terminals: [],
        history: [],
        recovery: this.buildEmptyRecoverySnapshot(),
      },
    });

    this.applyWorkspace(created);
    await this.refreshWorkspaces();
    return created;
  }

  hasRunningTerminals(): boolean {
    return this.terminals.some((terminal) => terminal.status.toLowerCase() === 'running');
  }

  async cycleTerminal(offset: -1 | 1): Promise<RuntimeTerminal | null | 'unchanged'> {
    if (!this.terminals.length) {
      return null;
    }

    const currentIndex = Math.max(
      0,
      this.terminals.findIndex((terminal) => terminal.id === this.focusedTerminalId)
    );
    const nextIndex = (currentIndex + offset + this.terminals.length) % this.terminals.length;
    return this.focusTerminal(this.terminals[nextIndex].id);
  }

  async duplicateTerminal(terminalId: string): Promise<RuntimeTerminal | null | 'blocked'> {
    const source = this.terminals.find((terminal) => terminal.id === terminalId);
    if (!source) {
      return null;
    }
    if (this.terminals.length >= MAX_TERMINALS_PER_WORKSPACE) {
      return 'blocked';
    }

    const duplicate = createTerminalDraft(source.cwd, {
      shell: source.shell,
      theme: source.theme,
      existingCount: this.terminals.length,
    });
    duplicate.name = source.name?.trim() ? `${source.name.trim()} copy` : '';
    duplicate.startupCommand = source.startupCommand;
    this.addTerminal(duplicate);
    await this.persistWorkspaceState();
    return duplicate;
  }

  createTerminalDraft(shell: ShellId = ''): RuntimeTerminal | 'blocked' | null {
    if (!this.activeWorkspace && !this.previewMode) {
      return null;
    }

    if (this.terminals.length >= MAX_TERMINALS_PER_WORKSPACE) {
      return 'blocked';
    }

    return createTerminalDraft(this.activeWorkspace?.cwd || this.workingDirectory, {
      shell,
      existingCount: this.terminals.length,
    });
  }

  async updateWorkspaceShellProfile(profile: WorkspaceShellProfile): Promise<void> {
    this.workspaceShellProfile = this.normalizeWorkspaceShellProfile(profile);
    await this.persistWorkspaceState();
  }

  addTerminal(terminal: RuntimeTerminal): void {
    this.terminals = [...this.terminals, terminal];
    this.focusedTerminalId = terminal.id;
    this.workingDirectory = terminal.cwd;
    this.updateWorkspaceSummary();
  }

  updateFocusedTerminalCwd(value: string): void {
    this.workingDirectory = value;
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'cwd', value);
    }
  }

  /** @deprecated Use updateFocusedTerminalCwd */
  updateFocusedTabCwd(value: string): void {
    this.updateFocusedTerminalCwd(value);
  }

  updateFocusedTerminalShell(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalField(terminal.id, 'shell', value);
    }
  }

  updateFocusedTerminalName(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.updateTerminalName(terminal.id, value);
    }
  }

  updateTerminalName(terminalId: string, value: string): void {
    this.updateTerminalField(terminalId, 'name', value.trim().slice(0, 48));
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

    this.updateTerminalThemeColors(terminal.id, foreground, background);
  }

  updateTerminalThemeColors(terminalId: string, foreground: string, background: string): void {
    this.updateTerminalField(terminalId, 'theme', {
      foreground,
      background,
    });
  }

  resetFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (terminal) {
      this.resetTerminalTheme(terminal.id);
    }
  }

  resetTerminalTheme(terminalId: string): void {
    this.updateTerminalField(terminalId, 'theme', null);
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

  async removeTerminal(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    const terminal = this.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      return 'unchanged';
    }

    this.terminals = this.terminals.filter((item) => item.id !== terminalId);
    if (this.focusedTerminalId === terminalId) {
      this.focusedTerminalId = this.terminals[0]?.id || '';
    }

    const nextFocused = this.terminals.find((item) => item.id === this.focusedTerminalId);
    this.workingDirectory = nextFocused?.cwd || this.activeWorkspace?.cwd || this.workingDirectory;
    this.updateWorkspaceSummary();
    await this.persistWorkspaceState();
    return nextFocused ?? null;
  }

  /** @deprecated Use removeTerminal */
  async clearPane(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    return this.removeTerminal(terminalId);
  }

  async focusTerminal(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    const terminal = this.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      return null;
    }

    if (this.focusedTerminalId === terminalId) {
      return 'unchanged';
    }

    this.focusedTerminalId = terminalId;
    this.workingDirectory = terminal.cwd;
    await this.persistWorkspaceState();
    return terminal;
  }

  /** @deprecated Use focusTerminal */
  async focusPane(terminalId: string): Promise<RuntimeTerminal | null | 'unchanged'> {
    return this.focusTerminal(terminalId);
  }

  updateTerminalStatus(terminalId: string, status: string): void {
    this.updateTerminalField(terminalId, 'status', status);
  }

  updateTerminalSessionSnapshot(terminalId: string, session: PaneSessionSnapshot | null): void {
    this.updateTerminalField(terminalId, 'session', session);
  }

  /** @deprecated Use updateTerminalSessionSnapshot */
  updatePaneSessionSnapshot(terminalId: string, session: PaneSessionSnapshot | null): void {
    this.updateTerminalSessionSnapshot(terminalId, session);
  }

  recordSessionLaunch(
    terminalId: string,
    metadata: { shell: string; startedAt: string | null }
  ): void {
    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastLaunchAt: metadata.startedAt,
      lastAttachedPaneId: terminalId,
      lastRecoveredAt: new Date().toISOString(),
      lastStopReason: null,
      lastSessionEndedAt: null,
      lastExitCode: null,
    };
  }

  recordSessionEvent(
    terminalId: string,
    entry: Omit<SessionHistoryEntry, 'id' | 'tabId' | 'tabTitle' | 'paneId' | 'shell' | 'cwd' | 'terminalTitle'>
  ): void {
    const terminal = this.getTerminalById(terminalId);
    const terminalTitle = terminal
      ? this.getTerminalDisplayTitle(terminal, Math.max(0, this.terminals.indexOf(terminal)))
      : undefined;

    this.sessionHistory = [
      {
        id: `session-${Date.now()}-${this.sessionHistory.length}`,
        paneId: terminalId,
        terminalTitle,
        shell: terminal?.shell || '',
        cwd: terminal?.cwd || this.workingDirectory,
        ...entry,
      },
      ...this.sessionHistory,
    ].slice(0, 20);

    this.recoverySnapshot = {
      ...this.recoverySnapshot,
      lastAttachedPaneId: terminalId,
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

  getTerminalTone(_terminal: RuntimeTerminal): string {
    return this.workspaceAccent || 'slate';
  }

  getPaneTone(terminal: RuntimeTerminal): string {
    return this.getTerminalTone(terminal);
  }

  getTerminalDisplayTitle(terminal: RuntimeTerminal, index: number): string {
    const customName = terminal.name?.trim();
    if (customName) {
      return customName;
    }

    const shellLabel = resolveShellOptionLabel(terminal.shell, this.wslDistros);
    const matchingTerminals = this.terminals.filter(
      (item) => resolveShellOptionLabel(item.shell, this.wslDistros) === shellLabel
    );
    if (matchingTerminals.length === 1) {
      return shellLabel;
    }

    return `${shellLabel} ${matchingTerminals.indexOf(terminal) + 1 || index + 1}`;
  }

  getCommandHistorySource(entry: CommandHistoryEntry): string {
    const terminal = entry.terminalId ? this.getTerminalById(entry.terminalId) : undefined;
    const workspaceTitle = this.workspaceName || entry.tabTitle || 'Workspace';
    const terminalTitle = terminal
      ? this.getTerminalDisplayTitle(terminal, Math.max(0, this.terminals.indexOf(terminal)))
      : entry.terminalTitle;

    return terminalTitle ? `${workspaceTitle} • ${terminalTitle}` : workspaceTitle;
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
    if (this.previewMode) {
      switch (terminal.name || terminal.startupCommand) {
        case 'dotnet run':
          return 'main • 7192';
        case 'npm start':
          return 'main • 4200';
        case 'docker exec -it cloudpos-db psql -U postgres':
          return 'local • 5432';
        case 'docker compose ps':
          return 'up • 4 containers';
      }

      if (terminal.id === 'terminal-1') {
        return 'main • 7192';
      }
      if (terminal.id === 'terminal-2') {
        return 'main • 4200';
      }
      if (terminal.id === 'terminal-3') {
        return 'local • 5432';
      }
      if (terminal.id === 'terminal-4') {
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
    if (!this.previewMode) {
      return `PS ${terminal.cwd}>`;
    }

    switch (terminal.id) {
      case 'terminal-1':
        return [
          'PS C:\\Projects\\CloudPOS\\Api> dotnet run',
          'info: Microsoft.Hosting.Lifetime[14]',
          '      Now listening on: https://localhost:7192',
          'info: Microsoft.Hosting.Lifetime[0]',
          '      Application started. Press Ctrl+C to shut down.',
        ].join('\n');
      case 'terminal-2':
        return [
          'PS C:\\Projects\\CloudPOS\\Angular> npm start',
          '> ng serve',
          '** Angular Live Development Server is listening on localhost:4200 **',
        ].join('\n');
      case 'terminal-3':
        return [
          'PS C:\\> docker exec -it cloudpos-db psql -U postgres',
          'postgres=# \\dt',
          '(4 rows)',
        ].join('\n');
      case 'terminal-4':
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

    const previewTerminals = [
      {
        id: 'terminal-1',
        name: 'API',
        cwd: 'C:\\Projects\\CloudPOS\\Api',
        startupCommand: 'dotnet run',
      },
      {
        id: 'terminal-2',
        name: 'Angular',
        cwd: 'C:\\Projects\\CloudPOS\\Angular',
        startupCommand: 'npm start',
      },
      {
        id: 'terminal-3',
        name: 'Database',
        cwd: 'C:\\',
        startupCommand: 'docker exec -it cloudpos-db psql -U postgres',
      },
      {
        id: 'terminal-4',
        name: 'Docker',
        cwd: 'C:\\Projects\\CloudPOS',
        startupCommand: 'docker compose ps',
      },
    ].map((item) => ({
      id: item.id,
      name: item.name,
      cwd: item.cwd,
      shell: 'powershell',
      startupCommand: item.startupCommand,
      status: 'running',
      session: null,
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
          mode: 'grid-2x2',
          focusedTerminalId: previewTerminals[0].id,
          colSplit: 50,
          rowSplit: 50,
        },
        terminals: previewTerminals,
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

  private updateTerminalField<K extends keyof RuntimeTerminal>(
    terminalId: string,
    field: K,
    value: RuntimeTerminal[K]
  ): void {
    const index = this.terminals.findIndex((terminal) => terminal.id === terminalId);
    if (index === -1) {
      return;
    }

    this.terminals = this.terminals.map((terminal, terminalIndex) =>
      terminalIndex === index ? { ...terminal, [field]: value } : terminal
    );
  }

  private updateWorkspaceSummary(layoutMode?: string, launchProfile?: string): void {
    this.workspaceSummary = {
      layoutMode: layoutMode || this.getEffectiveActiveLayoutMode(),
      launchProfile: launchProfile || this.workspaceSummary.launchProfile || 'manual',
      paneCount: this.terminals.length,
    };
  }

  private formatPaneStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (!normalized) {
      return 'Idle';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private normalizeWorkspaceShellProfile(value: string | null | undefined): WorkspaceShellProfile {
    return isWorkspaceShellProfile(value) ? (value as WorkspaceShellProfile) : '';
  }

  private buildEmptyRecoverySnapshot(): RecoverySnapshot {
    return {
      lastLaunchAt: null,
      lastAttachedPaneId: null,
      lastExitCode: null,
      lastStopReason: null,
      lastSessionEndedAt: null,
      lastRecoveredAt: null,
    };
  }
}
