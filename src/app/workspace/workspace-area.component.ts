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

import { RuntimePane, RuntimeTab } from '../models';
import { InspectorItem } from '../models';
import { InspectorPresenterService } from '../inspector/inspector-presenter.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalHostCoordinatorService } from '../terminal/terminal-host-coordinator.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-workspace-area',
  imports: [NgTemplateOutlet],
  templateUrl: './workspace-area.component.html',
})
export class WorkspaceAreaComponent implements AfterViewInit {
  @ViewChild('paneGrid') private paneGrid?: ElementRef<HTMLElement>;

  @Output() readonly terminalSyncRequested = new EventEmitter<void>();

  protected readonly ws = inject(WorkspaceRuntimeService);
  protected readonly terminal = inject(TerminalSessionService);
  protected readonly util = inject(UtilityPanelService);
  protected readonly inspector = inject(InspectorPresenterService);
  protected readonly system = inject(SystemMonitorService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hostCoordinator = inject(TerminalHostCoordinatorService);

  ngAfterViewInit(): void {
    this.hostCoordinator.registerHostResolver(
      () => this.collectTerminalHosts(),
      () => this.changeDetectorRef.detectChanges()
    );
  }

  protected async createTab(): Promise<void> {
    const nextTab = this.ws.createTabDraft();
    if (!nextTab) return;
    this.ws.addTab(nextTab);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusPaneTerminal();
  }

  protected async selectTab(tabId: string): Promise<void> {
    const tab = await this.ws.selectTab(tabId);
    if (!tab) return;
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusPaneTerminal();
  }

  protected async closeTab(tabId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    const result = await this.ws.closeTab(tabId);
    if (result === 'blocked') {
      this.ws.status = 'At least one tab must remain open.';
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    if (result) {
      await this.hostCoordinator.syncAndRestore();
      this.terminal.focusPaneTerminal();
    }
  }

  protected async focusPane(paneId: string): Promise<void> {
    const result = await this.ws.focusPane(paneId);
    if (result === 'unchanged') {
      this.terminal.focusPaneTerminal(paneId);
      return;
    }
    await this.hostCoordinator.syncAndRestore();
    this.terminal.focusPaneTerminal(paneId);
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

  protected isPaneFocused(pane: RuntimePane): boolean {
    return this.ws.isPaneFocused(pane);
  }

  protected getPaneById(paneId: string): RuntimePane | undefined {
    return this.ws.getPaneById(paneId);
  }

  protected getPaneTab(pane: RuntimePane) {
    return this.ws.getPaneTab(pane);
  }

  protected getPaneTone(pane: RuntimePane): string {
    return this.ws.getPaneTone(pane);
  }

  protected getFocusedTab() {
    return this.ws.getFocusedTab();
  }

  protected getInspectorSummaryItems() {
    return this.inspector.getInspectorSummaryItems();
  }

  protected getInspectorPrimaryItems(): InspectorItem[] {
    return this.pickInspectorItems(
      this.isSessionInspectorActive()
        ? ['Shell', 'Session Id', 'PID', 'Port']
        : ['Directory', 'Shell', 'Workspace', 'Template', 'Layout', 'Focused Pane']
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

  protected getPaneDisplayTitle(pane: RuntimePane, index: number): string {
    return this.ws.getPaneDisplayTitle(pane, index);
  }

  protected getPaneSummaryLine(pane: RuntimePane): string {
    return this.ws.getPaneSummaryLine(pane);
  }

  protected getPaneStatusLabel(pane: RuntimePane): string {
    return this.ws.getPaneStatusLabel(pane);
  }

  protected isPaneRunning(pane: RuntimePane): boolean {
    return this.ws.isPaneRunning(pane);
  }

  protected getPaneMetaLine(pane: RuntimePane): string {
    return this.ws.getPaneMetaLine(pane);
  }

  protected shouldRenderPanePreview(pane: RuntimePane): boolean {
    return this.ws.shouldRenderPanePreview(pane);
  }

  protected getPanePreviewText(pane: RuntimePane): string {
    return this.ws.getPanePreviewText(pane);
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
    const focusedTab = this.getFocusedTab();
    if (this.isSessionInspectorActive()) {
      return this.terminal.sessionInfo?.id
        ? `Session ${this.terminal.sessionInfo.id}`
        : 'No active PTY attached';
    }

    return focusedTab?.cwd || this.ws.workingDirectory || 'No working directory';
  }

  protected getInspectorHeroStatus(): string {
    if (this.isSessionInspectorActive()) {
      return this.terminal.sessionActive ? 'connected' : 'idle';
    }

    return this.getFocusedTab()?.status || 'idle';
  }

  private collectTerminalHosts(): Map<string, HTMLElement> {
    const hosts = new Map<string, HTMLElement>();
    const grid = this.paneGrid?.nativeElement;
    if (!grid) {
      return hosts;
    }

    const elements = grid.querySelectorAll<HTMLElement>('[data-pane-terminal-host]');
    for (const element of elements) {
      const paneId = element.dataset['paneTerminalHost'];
      if (paneId) {
        hosts.set(paneId, element);
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
