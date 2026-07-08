import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { RuntimeTab, RuntimeTerminal, SHELL_OPTIONS } from '../models';
import { AppPreferencesService } from '../preferences/app-preferences.service';
import { resolveTerminalTheme } from '../terminal/terminal-theme.util';
import { InspectorItem } from '../models';
import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { MAX_TABS_PER_WORKSPACE, MAX_TERMINALS_PER_TAB } from '../workspace/workspace-snapshot';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-workspace-area',
  imports: [NgTemplateOutlet],
  templateUrl: './workspace-area.component.html',
})
export class WorkspaceAreaComponent implements AfterViewInit {
  @ViewChild('paneGrid') private paneGrid?: ElementRef<HTMLElement>;

  @Output() readonly terminalSyncRequested = new EventEmitter<void>();

  protected readonly maxTabs = MAX_TABS_PER_WORKSPACE;
  protected readonly maxTerminals = MAX_TERMINALS_PER_TAB;

  protected readonly shellOptions = SHELL_OPTIONS;

  protected readonly ws = inject(WorkspaceRuntimeService);
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
  }

  protected getActiveTerminals(): RuntimeTerminal[] {
    return this.ws.getActiveTabTerminals();
  }

  protected canAddTab(): boolean {
    return this.ws.runtimeTabs.length < this.maxTabs;
  }

  protected canAddTerminal(): boolean {
    return this.getActiveTerminals().length < this.maxTerminals;
  }

  protected async createTab(): Promise<void> {
    const nextTab = this.ws.createTabDraft();
    if (!nextTab || nextTab === 'blocked') {
      if (nextTab === 'blocked') {
        this.ws.status = `A workspace can have at most ${this.maxTabs} tabs.`;
        this.util.appendOutput(this.ws.status, 'warn');
      }
      return;
    }

    this.ws.addTab(nextTab);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
  }

  protected async addTerminal(shell = this.preferences.readDefaultShell()): Promise<void> {
    const draft = this.ws.createTerminalDraft(shell);
    if (!draft || draft === 'blocked') {
      if (draft === 'blocked') {
        this.ws.status = `A tab can have at most ${this.maxTerminals} terminals.`;
        this.util.appendOutput(this.ws.status, 'warn');
      }
      return;
    }

    this.ws.addTerminal(draft);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusTerminal(draft.id);
  }

  protected async selectTab(tabId: string): Promise<void> {
    const tab = await this.ws.selectTab(tabId);
    if (!tab) return;
    await this.hostCoordinator.syncAndRestore();
    const focusedId = this.ws.focusedPaneId;
    if (focusedId) {
      this.terminal.focusTerminal(focusedId);
    }
  }

  protected async closeTab(tabId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    await this.ws.closeTab(tabId);
    await this.hostCoordinator.syncAndRestore();
    if (this.ws.focusedPaneId) {
      this.terminal.focusTerminal(this.ws.focusedPaneId);
    }
  }

  protected async removeTerminal(terminalId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    const result = await this.ws.removeTerminal(terminalId);
    if (result === 'unchanged') {
      return;
    }
    await this.hostCoordinator.syncAndRestore();
    if (this.ws.focusedPaneId) {
      this.terminal.focusTerminal(this.ws.focusedPaneId);
    }
  }

  protected async focusTerminal(terminalId: string): Promise<void> {
    const result = await this.ws.focusTerminal(terminalId);
    if (result === 'unchanged') {
      this.terminal.reattachTerminalSession(terminalId);
      this.terminal.focusTerminal(terminalId);
      return;
    }
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusTerminal(terminalId);
  }

  protected onTerminalHostClick(terminalId: string, event: MouseEvent): void {
    event.stopPropagation();
    void this.focusTerminal(terminalId);
  }

  protected setInspectorTab(tab: 'tab' | 'session'): void {
    this.inspector.activeTab = tab;
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

  protected startPaneResize(event: MouseEvent, mode: 'col' | 'row'): void {
    event.preventDefault();
    event.stopPropagation();
    this.ws.paneResizeMode = mode;
  }

  protected showResizeHandles(): boolean {
    return this.getActiveTerminals().length > 1;
  }

  protected getGridLayout(): string {
    if (this.getActiveTerminals().length <= 1) {
      return 'single';
    }

    return this.ws.getEffectiveActiveLayoutMode();
  }

  @HostListener('document:mousemove', ['$event'])
  protected onDocumentMouseMove(event: MouseEvent): void {
    if (!this.ws.paneResizeMode || !this.paneGrid) return;
    this.ws.updatePaneSplit(
      this.ws.paneResizeMode,
      event.clientX,
      event.clientY,
      this.paneGrid.nativeElement.getBoundingClientRect()
    );
    this.terminal.syncTerminalSize();
  }

  @HostListener('document:mouseup')
  protected onDocumentMouseUp(): void {
    if (!this.ws.paneResizeMode) return;
    this.ws.paneResizeMode = null;
    this.terminal.syncTerminalSize();
    void this.ws.persistWorkspaceState();
  }

  protected isTabActive(tab: RuntimeTab): boolean {
    return this.ws.isTabActive(tab);
  }

  protected isTerminalFocused(terminal: RuntimeTerminal): boolean {
    return this.ws.isTerminalFocused(terminal);
  }

  protected getFocusedTab() {
    return this.ws.getFocusedTab();
  }

  protected setFocusedTerminalShell(shell: string): void {
    this.ws.updateFocusedTerminalShell(shell);
    void this.ws.persistWorkspaceState();
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

    const resolved = this.getResolvedTerminalTheme(terminal);
    this.ws.updateFocusedTerminalThemeColors(value, resolved.background);
    this.applyFocusedTerminalTheme();
    void this.ws.persistWorkspaceState();
  }

  protected setFocusedTerminalBackground(value: string): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    const resolved = this.getResolvedTerminalTheme(terminal);
    this.ws.updateFocusedTerminalThemeColors(resolved.foreground, value);
    this.applyFocusedTerminalTheme();
    void this.ws.persistWorkspaceState();
  }

  protected resetFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    this.ws.resetFocusedTerminalTheme();
    this.applyFocusedTerminalTheme();
    void this.ws.persistWorkspaceState();
  }

  private applyFocusedTerminalTheme(): void {
    const terminal = this.getFocusedTerminal();
    if (!terminal) {
      return;
    }

    this.terminal.applyTerminalTheme(terminal.id, terminal);
  }

  protected getFocusedTerminal() {
    return this.ws.getFocusedTerminal();
  }

  protected getInspectorSummaryItems() {
    return this.inspector.getInspectorSummaryItems();
  }

  protected getInspectorPrimaryItems(): InspectorItem[] {
    return this.pickInspectorItems(
      this.isSessionInspectorActive()
        ? ['Shell', 'Session Id', 'PID', 'Port']
        : ['Directory', 'Shell', 'Workspace', 'Layout', 'Focused Terminal']
    );
  }

  protected getInspectorSecondaryItems(): InspectorItem[] {
    return this.pickInspectorItems(
      this.isSessionInspectorActive()
        ? ['Started', 'Uptime', 'Last Activity', 'Exit Code', 'Recovery']
        : ['Startup Command', 'Launch Profile', 'Status', 'Last Recovery', 'Last Session Ended', 'Last Saved']
    );
  }

  protected isSessionInspectorActive(): boolean {
    return this.inspector.activeTab === 'session';
  }

  protected canControlSession(): boolean {
    return this.terminal.sessionActive;
  }

  protected getRecentCommands() {
    return this.util.getRecentCommands();
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

  protected getTerminalMetaLine(terminal: RuntimeTerminal): string {
    return this.ws.getTerminalMetaLine(terminal);
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
    return this.isSessionInspectorActive() ? 'Live session' : 'Focused tab';
  }

  protected getInspectorHeroTitle(): string {
    const focusedTab = this.getFocusedTab();
    if (this.isSessionInspectorActive()) {
      return this.terminal.sessionInfo?.shell || focusedTab?.title || 'No Live Session';
    }

    return focusedTab?.title || 'No Tab Selected';
  }

  protected getInspectorHeroMeta(): string {
    const focusedTerminal = this.getFocusedTerminal();
    if (this.isSessionInspectorActive()) {
      return this.terminal.sessionInfo?.id
        ? `Session ${this.terminal.sessionInfo.id}`
        : 'No active PTY attached';
    }

    return focusedTerminal?.cwd || this.getFocusedTab()?.cwd || this.ws.workingDirectory || 'No working directory';
  }

  protected getInspectorHeroStatus(): string {
    if (this.isSessionInspectorActive()) {
      return this.terminal.sessionActive ? 'connected' : 'idle';
    }

    return this.getFocusedTerminal()?.status || 'idle';
  }

  private collectTerminalHosts(): Map<string, HTMLElement> {
    const hosts = new Map<string, HTMLElement>();
    const grid = this.paneGrid?.nativeElement;
    if (!grid) {
      return hosts;
    }

    const elements = grid.querySelectorAll<HTMLElement>('[data-terminal-host]');
    for (const element of elements) {
      const terminalId = element.dataset['terminalHost'];
      if (terminalId) {
        hosts.set(terminalId, element);
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
}
