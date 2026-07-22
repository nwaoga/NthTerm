import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CommandHistoryEntry,
  InspectorItem,
  InspectorMode,
  RuntimeTerminal,
  ShellId,
  WorkspaceShellProfile,
  isShellId,
  isWorkspaceShellProfile,
} from '../models';
import { AppPreferencesService } from '../preferences/app-preferences.service';
import { resolveTerminalTheme } from '../terminal/terminal-theme.util';
import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { MAX_TERMINALS_PER_WORKSPACE } from '../workspace/workspace-snapshot';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { WorkspaceLayoutService } from './workspace-layout.service';
import { WorkspaceHeaderComponent } from './workspace-header.component';
import { TerminalFocusViewComponent } from './terminal-focus-view.component';
import { TerminalOverviewComponent } from './terminal-overview.component';

const CONTEXT_MENU_WIDTH = 190;
const CONTEXT_MENU_ITEM_HEIGHT = 36;
const CONTEXT_MENU_PADDING = 10;
const CONTEXT_MENU_VIEWPORT_MARGIN = 8;
const DEFAULT_PARK_WIDTH = 960;
const DEFAULT_PARK_HEIGHT = 540;

@Component({
  selector: 'app-workspace-area',
  imports: [FormsModule, WorkspaceHeaderComponent, TerminalFocusViewComponent, TerminalOverviewComponent],
  templateUrl: './workspace-area.component.html',
})
export class WorkspaceAreaComponent implements AfterViewInit {
  @ViewChild('terminalPark') private terminalPark?: ElementRef<HTMLElement>;
  @ViewChild(TerminalFocusViewComponent) private focusView?: TerminalFocusViewComponent;

  @Input() inspectorPanelVisible = true;
  @Output() readonly terminalSyncRequested = new EventEmitter<void>();
  @Output() readonly inspectorPanelVisibleChange = new EventEmitter<boolean>();

  protected terminalContextMenu: { terminalId: string; x: number; y: number } | null = null;
  protected parkWidth = DEFAULT_PARK_WIDTH;
  protected parkHeight = DEFAULT_PARK_HEIGHT;
  protected editingTerminalId = '';
  protected editingTerminalName = '';

  protected readonly maxTerminals = MAX_TERMINALS_PER_WORKSPACE;

  protected get shellOptions() {
    return this.ws.getShellOptions();
  }

  protected get workspaceShellProfileOptions() {
    return this.ws.getWorkspaceShellProfileOptions();
  }

  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly layout = inject(WorkspaceLayoutService);
  protected readonly terminal = inject(TerminalSessionService);
  protected readonly util = inject(UtilityPanelService);
  protected readonly inspector = inject(InspectorPresenterService);
  protected readonly system = inject(SystemMonitorService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hostCoordinator = inject(TerminalHostCoordinatorService);
  private readonly preferences = inject(AppPreferencesService);

  ngAfterViewInit(): void {
    this.hostCoordinator.registerHostResolver(
      () => this.collectTerminalHosts(),
      () => this.changeDetectorRef.detectChanges()
    );
    this.layout.bindWorkspace(this.ws.selectedWorkspaceId, this.ws.focusedPaneId);
    this.syncInteractiveTerminal();
  }

  protected getActiveTerminals(): RuntimeTerminal[] {
    return this.ws.getActiveTabTerminals();
  }

  protected getTerminalIds(): string[] {
    return this.getActiveTerminals().map((terminal) => terminal.id);
  }

  protected canAddTerminal(): boolean {
    return this.getActiveTerminals().length < this.maxTerminals;
  }

  protected isOverviewMode(): boolean {
    return this.layout.isOverviewMode();
  }

  protected getActiveIndex(): number {
    return this.layout.getActiveTerminalIndex();
  }

  protected getActiveTerminalTitle(): string {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return 'No terminal';
    }
    return this.getTerminalDisplayTitle(terminal, this.getActiveIndex());
  }

  protected async addTerminal(shell?: string): Promise<void> {
    const resolvedShell = this.ws.resolveNewTerminalShell(
      this.normalizeExplicitShell(shell),
      this.preferences.readDefaultShell()
    );
    const draft = this.ws.createTerminalDraft(resolvedShell);
    if (!draft || draft === 'blocked') {
      if (draft === 'blocked') {
        this.ws.status = `A workspace can have at most ${this.maxTerminals} terminals.`;
        this.util.appendOutput(this.ws.status, 'warn');
      }
      return;
    }

    this.ws.addTerminal(draft);
    this.layout.setActiveTerminalId(draft.id);
    this.layout.enterFocus();
    await this.ws.persistWorkspaceState();
    await this.syncHostsAndRestore();
    this.terminal.focusTerminal(draft.id);
  }

  protected openTerminalContextMenu(terminalId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.terminalContextMenu = {
      terminalId,
      ...this.getContextMenuPosition(event, 5),
    };
  }

  protected openMenuFromOverview(payload: { terminalId: string; event: MouseEvent }): void {
    this.openTerminalContextMenu(payload.terminalId, payload.event);
  }

  @HostListener('document:click')
  protected closeContextMenus(): void {
    this.terminalContextMenu = null;
  }

  private getContextMenuPosition(event: MouseEvent, itemCount: number): { x: number; y: number } {
    const estimatedHeight = CONTEXT_MENU_PADDING + itemCount * CONTEXT_MENU_ITEM_HEIGHT;
    const maxX = Math.max(
      CONTEXT_MENU_VIEWPORT_MARGIN,
      window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_VIEWPORT_MARGIN
    );
    const maxY = Math.max(
      CONTEXT_MENU_VIEWPORT_MARGIN,
      window.innerHeight - estimatedHeight - CONTEXT_MENU_VIEWPORT_MARGIN
    );

    return {
      x: Math.min(Math.max(event.clientX, CONTEXT_MENU_VIEWPORT_MARGIN), maxX),
      y: Math.min(Math.max(event.clientY, CONTEXT_MENU_VIEWPORT_MARGIN), maxY),
    };
  }

  protected renameContextTerminal(): void {
    const terminalId = this.terminalContextMenu?.terminalId;
    this.closeContextMenus();
    if (terminalId) {
      this.startRenameTerminal(terminalId);
    }
  }

  protected async openColorsForContextTerminal(): Promise<void> {
    const terminalId = this.terminalContextMenu?.terminalId;
    this.closeContextMenus();
    if (!terminalId) {
      return;
    }
    await this.focusTerminal(terminalId, true);
    this.inspector.activeTab = 'terminal';
    this.setInspectorPanelVisible(true);
    this.changeDetectorRef.detectChanges();
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>('input[aria-label="Terminal text color"], .theme-color-input')?.focus();
    });
  }

  protected startRenameTerminal(terminalId: string): void {
    const terminal = this.ws.getTerminalById(terminalId);
    if (!terminal) {
      return;
    }
    const index = this.getActiveTerminals().findIndex((item) => item.id === terminalId);
    this.editingTerminalId = terminalId;
    this.editingTerminalName = terminal.name?.trim() || this.getTerminalDisplayTitle(terminal, Math.max(0, index));
    this.changeDetectorRef.detectChanges();
  }

  protected commitRenameTerminal(): void {
    if (!this.editingTerminalId) {
      return;
    }
    const terminalId = this.editingTerminalId;
    const nextName = this.editingTerminalName.trim();
    this.ws.updateTerminalName(terminalId, nextName);
    this.editingTerminalId = '';
    this.editingTerminalName = '';
    void this.ws.persistWorkspaceState();
    this.layout.setActiveTerminalId(terminalId);
    this.changeDetectorRef.detectChanges();
  }

  protected cancelRenameTerminal(): void {
    this.editingTerminalId = '';
    this.editingTerminalName = '';
  }

  protected async restartContextTerminal(): Promise<void> {
    const terminalId = this.terminalContextMenu?.terminalId;
    this.closeContextMenus();
    if (!terminalId) return;
    await this.focusTerminal(terminalId);
    await this.terminal.relaunchTerminal();
  }

  protected async duplicateContextTerminal(): Promise<void> {
    const terminalId = this.terminalContextMenu?.terminalId;
    this.closeContextMenus();
    if (!terminalId) return;
    const result = await this.ws.duplicateTerminal(terminalId);
    if (result && result !== 'blocked') {
      this.layout.setActiveTerminalId(result.id);
      this.layout.enterFocus();
      await this.syncHostsAndRestore();
      this.terminal.focusTerminal(result.id);
    }
  }

  protected async closeContextTerminal(): Promise<void> {
    const terminalId = this.terminalContextMenu?.terminalId;
    this.closeContextMenus();
    if (terminalId) {
      await this.removeTerminal(terminalId);
    }
  }

  protected async removeTerminal(terminalId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    const closingTerminal = this.ws.getTerminalById(terminalId);
    if (
      closingTerminal &&
      this.ws.isTerminalRunning(closingTerminal) &&
      !confirm('Close this terminal and stop its running process?')
    ) {
      return;
    }
    const result = await this.ws.removeTerminal(terminalId);
    if (result === 'unchanged') {
      return;
    }
    this.layout.setActiveTerminalId(this.ws.focusedPaneId, false);
    if (this.getActiveTerminals().length <= 1) {
      this.layout.enterFocus();
    }
    await this.syncHostsAndRestore();
    if (this.ws.focusedPaneId) {
      this.terminal.focusTerminal(this.ws.focusedPaneId);
    }
  }

  protected async focusTerminal(terminalId: string, enterFocus = false): Promise<void> {
    if (enterFocus) {
      this.layout.enterFocus();
    }
    this.layout.setActiveTerminalId(terminalId);
    const result = await this.ws.focusTerminal(terminalId);
    await this.syncHostsAndRestore();
    if (result === 'unchanged') {
      this.terminal.reattachTerminalSession(terminalId);
    }
    this.terminal.focusTerminal(terminalId);
  }

  protected async selectOverviewTerminal(terminalId: string): Promise<void> {
    await this.focusTerminal(terminalId, true);
  }

  protected onTerminalHostClick(event: MouseEvent): void {
    event.stopPropagation();
    const terminalId = this.layout.activeTerminalId;
    if (terminalId) {
      void this.focusTerminal(terminalId);
    }
  }

  protected async cycleTerminal(offset: -1 | 1): Promise<void> {
    const nextId = this.layout.getAdjacentTerminalId(offset);
    if (!nextId) {
      return;
    }
    await this.focusTerminal(nextId);
  }

  protected onChromeWheel(offset: -1 | 1): void {
    void this.cycleTerminal(offset);
  }

  protected toggleOverview(): void {
    this.layout.toggleOverview();
    void this.afterLayoutModeChange();
  }

  protected onZoomChange(value: number): void {
    // Two-state control: 0 = focus, 1 = overview. Keep snap helper for continuous zoom later.
    this.layout.snapZoomFromControl(value);
    void this.afterLayoutModeChange();
  }

  private async afterLayoutModeChange(): Promise<void> {
    this.changeDetectorRef.detectChanges();
    await this.syncHostsAndRestore();
    if (this.layout.isFocusMode() && this.ws.focusedPaneId) {
      this.terminal.focusTerminal(this.ws.focusedPaneId);
    } else {
      this.terminal.syncTerminalSize();
    }
  }

  protected setInspectorTab(tab: InspectorMode): void {
    this.inspector.activeTab = tab;
  }

  protected setInspectorPanelVisible(visible: boolean): void {
    this.inspectorPanelVisibleChange.emit(visible);
  }

  protected async relaunchTerminal(): Promise<void> {
    await this.terminal.relaunchTerminal();
  }

  protected async interruptTerminal(): Promise<void> {
    await this.terminal.interruptTerminal();
  }

  protected async killTerminal(): Promise<void> {
    await this.terminal.killTerminal();
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const editingText =
      typeof target?.matches === 'function'
        ? target.matches('input, textarea, select, [contenteditable="true"]')
        : false;
    const withCtrl = event.ctrlKey || event.metaKey;
    if (!withCtrl || editingText) {
      return;
    }

    if ((event.key === '\\' || event.code === 'Backslash') && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      this.toggleOverview();
      return;
    }

    if ((event.key === '[' || event.code === 'BracketLeft') && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      void this.cycleTerminal(-1);
      return;
    }

    if ((event.key === ']' || event.code === 'BracketRight') && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      void this.cycleTerminal(1);
      return;
    }

    if (/^[0-9]$/.test(event.key) && !event.shiftKey && !event.altKey) {
      const oneBased = event.key === '0' ? 10 : Number(event.key);
      const terminalId = this.layout.getTerminalIdForShortcut(oneBased);
      if (terminalId) {
        event.preventDefault();
        void this.focusTerminal(terminalId, true);
      }
    }
  }

  protected isTerminalFocused(terminal: RuntimeTerminal): boolean {
    return this.ws.isTerminalFocused(terminal);
  }

  protected setFocusedTerminalShell(shell: string): void {
    this.ws.updateFocusedTerminalShell(shell);
    void this.ws.persistWorkspaceState();
  }

  protected setFocusedTerminalName(name: string): void {
    this.ws.updateFocusedTerminalName(name);
    void this.ws.persistWorkspaceState();
  }

  protected setWorkspaceShellProfile(profile: string): void {
    if (this.isWorkspaceShellProfile(profile)) {
      void this.ws.updateWorkspaceShellProfile(profile);
    }
  }

  protected getResolvedTerminalTheme(terminal = this.getFocusedTerminal()) {
    return resolveTerminalTheme(terminal?.theme ?? null, this.preferences.readDefaultTerminalTheme());
  }

  protected focusedTerminalUsesDefaultTheme(): boolean {
    return this.ws.usesDefaultTerminalTheme(this.getFocusedTerminal());
  }

  protected setFocusedTerminalForeground(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }
    this.setTerminalForeground(terminal.id, value);
  }

  protected setFocusedTerminalBackground(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }
    this.setTerminalBackground(terminal.id, value);
  }

  protected setTerminalForeground(terminalId: string, value: string): void {
    const terminal = this.ws.getTerminalById(terminalId);
    if (!terminal) {
      return;
    }

    const resolved = this.getResolvedTerminalTheme(terminal);
    this.ws.updateTerminalThemeColors(terminalId, value, resolved.background);
    this.applyTerminalTheme(terminalId);
    void this.ws.persistWorkspaceState();
  }

  protected setTerminalBackground(terminalId: string, value: string): void {
    const terminal = this.ws.getTerminalById(terminalId);
    if (!terminal) {
      return;
    }

    const resolved = this.getResolvedTerminalTheme(terminal);
    this.ws.updateTerminalThemeColors(terminalId, resolved.foreground, value);
    this.applyTerminalTheme(terminalId);
    void this.ws.persistWorkspaceState();
  }

  protected resetFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    this.ws.resetTerminalTheme(terminal.id);
    this.applyTerminalTheme(terminal.id);
    void this.ws.persistWorkspaceState();
  }

  private applyTerminalTheme(terminalId: string): void {
    const terminal = this.ws.getTerminalById(terminalId);
    if (!terminal) {
      return;
    }

    this.terminal.applyTerminalTheme(terminalId, terminal);
  }

  private applyFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    this.applyTerminalTheme(terminal.id);
  }

  protected getFocusedTerminal() {
    return this.ws.getFocusedTerminal();
  }

  protected getInspectorSummaryItems() {
    return this.inspector.getInspectorSummaryItems();
  }

  protected getInspectorPrimaryItems(): InspectorItem[] {
    if (this.isWorkspaceInspectorActive()) {
      return this.pickInspectorItems(['Workspace', 'Directory', 'Shell Profile', 'Terminals']);
    }

    return this.pickInspectorItems(['Shell', 'Session Id', 'PID', 'Port']);
  }

  protected getInspectorSecondaryItems(): InspectorItem[] {
    if (this.isWorkspaceInspectorActive()) {
      return this.pickInspectorItems(['Last Saved']);
    }

    return this.pickInspectorItems(['Started', 'Uptime', 'Last Activity', 'Exit Code', 'Recovery']);
  }

  protected isSessionInspectorActive(): boolean {
    return this.inspector.activeTab === 'terminal';
  }

  protected isWorkspaceInspectorActive(): boolean {
    return this.inspector.activeTab === 'workspace';
  }

  protected canControlSession(): boolean {
    return this.terminal.sessionActive;
  }

  protected getRecentCommands() {
    return this.util.getRecentCommands();
  }

  protected getCommandSource(entry: CommandHistoryEntry): string {
    return this.ws.getCommandHistorySource(entry);
  }

  protected getVisibleEnvironmentVariables() {
    return this.system.getVisibleEnvironmentVariables();
  }

  protected getSessionHistory() {
    return this.ws.sessionHistory.slice(0, 6);
  }

  protected getTerminalDisplayTitle(terminal: RuntimeTerminal, index: number): string {
    return this.ws.getTerminalDisplayTitle(terminal, index);
  }

  protected getTerminalSummaryLine(terminal: RuntimeTerminal): string {
    return this.ws.getTerminalSummaryLine(terminal);
  }

  protected getTerminalStatusLabel(terminal: RuntimeTerminal): string {
    return this.ws.getTerminalStatusLabel(terminal);
  }

  protected isTerminalRunning(terminal: RuntimeTerminal): boolean {
    return this.ws.isTerminalRunning(terminal);
  }

  protected shouldRenderTerminalPreview(terminal: RuntimeTerminal): boolean {
    return this.ws.shouldRenderTerminalPreview(terminal);
  }

  protected getTerminalPreviewText(terminal: RuntimeTerminal): string {
    return this.ws.getTerminalPreviewText(terminal);
  }

  protected getTerminalTone(terminal: RuntimeTerminal): string {
    return this.ws.getTerminalTone(terminal);
  }

  protected formatClock(value: string): string {
    return this.system.formatClock(value);
  }

  protected formatSessionHistoryClock(
    endedAt: string | null,
    startedAt: string | null,
    lastActiveAt: string | null
  ): string {
    const value = endedAt || lastActiveAt || startedAt;
    return value ? this.system.formatClock(value) : 'n/a';
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  protected getInspectorHeroLabel(): string {
    if (this.isWorkspaceInspectorActive()) return 'Active workspace';
    return 'Live terminal';
  }

  protected getInspectorHeroTitle(): string {
    if (this.isWorkspaceInspectorActive()) {
      return this.ws.workspaceName || 'No Workspace Selected';
    }

    const focusedTerminal = this.getFocusedTerminal();
    if (focusedTerminal) {
      const index = this.getActiveTerminals().findIndex((terminal) => terminal.id === focusedTerminal.id);
      return this.getTerminalDisplayTitle(focusedTerminal, Math.max(0, index));
    }

    return this.terminal.sessionInfo?.shell || 'No Live Session';
  }

  protected getInspectorHeroMeta(): string {
    const focusedTerminal = this.getFocusedTerminal();
    if (this.isWorkspaceInspectorActive()) {
      return this.ws.workingDirectory || 'No working directory';
    }
    if (this.terminal.sessionInfo?.id) {
      return `Session ${this.terminal.sessionInfo.id}`;
    }

    return focusedTerminal?.cwd || this.ws.workingDirectory || 'No working directory';
  }

  protected getInspectorHeroStatus(): string {
    if (this.isWorkspaceInspectorActive()) {
      return this.ws.hasRunningTerminals() ? 'running' : 'idle';
    }

    return this.terminal.sessionActive ? 'connected' : this.getFocusedTerminal()?.status || 'idle';
  }

  private async syncHostsAndRestore(): Promise<void> {
    this.syncInteractiveTerminal();
    this.measureParkSize();
    this.changeDetectorRef.detectChanges();
    await this.hostCoordinator.syncAndRestore();
  }

  private syncInteractiveTerminal(): void {
    const activeId = this.layout.isFocusMode() ? this.layout.activeTerminalId || this.ws.focusedPaneId : '';
    this.terminal.setInteractiveTerminalId(activeId);
    this.layout.bindWorkspace(this.ws.selectedWorkspaceId, this.ws.focusedPaneId || activeId);
  }

  private measureParkSize(): void {
    const host = this.focusView?.getHostElement();
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    if (rect.width > 40 && rect.height > 40) {
      this.parkWidth = Math.round(rect.width);
      this.parkHeight = Math.round(rect.height);
    }
  }

  private collectTerminalHosts(): Map<string, HTMLElement> {
    const hosts = new Map<string, HTMLElement>();
    const park = this.terminalPark?.nativeElement;
    if (park) {
      for (const element of park.querySelectorAll<HTMLElement>('[data-terminal-host]')) {
        const terminalId = element.dataset['terminalHost'];
        if (terminalId) {
          hosts.set(terminalId, element);
        }
      }
    }

    if (this.layout.isFocusMode()) {
      const viewport = this.focusView?.getHostElement();
      const terminalId = viewport?.dataset['terminalHost'];
      if (viewport && terminalId) {
        hosts.set(terminalId, viewport);
      }
    }

    return hosts;
  }

  private pickInspectorItems(labels: string[]): InspectorItem[] {
    const itemMap = new Map(this.inspector.getInspectorItems().map((item) => [item.label, item]));
    return labels
      .map((label) => itemMap.get(label))
      .filter((item): item is InspectorItem => Boolean(item));
  }

  private normalizeExplicitShell(shell: string | undefined): ShellId | undefined {
    if (shell === undefined) {
      return undefined;
    }

    return isShellId(shell) ? (shell as ShellId) : undefined;
  }

  private isWorkspaceShellProfile(value: string): value is WorkspaceShellProfile {
    return isWorkspaceShellProfile(value);
  }
}
