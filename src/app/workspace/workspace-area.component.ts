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
  @ViewChild('terminalHost') private terminalHost?: ElementRef<HTMLDivElement>;
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
      () => this.terminalHost?.nativeElement,
      () => this.changeDetectorRef.detectChanges()
    );
  }

  protected async createTab(): Promise<void> {
    const nextTab = this.ws.createTabDraft();
    if (!nextTab) return;
    this.ws.addTab(nextTab);
    await this.ws.persistWorkspaceState();
    await this.hostCoordinator.syncAndRestore();
  }

  protected async selectTab(tabId: string): Promise<void> {
    const tab = await this.ws.selectTab(tabId);
    if (!tab) return;
    await this.hostCoordinator.syncAndRestore();
  }

  protected async closeTab(tabId: string, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();
    const result = await this.ws.closeTab(tabId);
    if (result === 'blocked') {
      this.ws.status = 'At least one tab must remain open.';
      this.util.appendOutput(this.ws.status, 'warn');
      return;
    }
    if (result) await this.hostCoordinator.syncAndRestore();
  }

  protected async focusPane(paneId: string): Promise<void> {
    const result = await this.ws.focusPane(paneId);
    if (result === 'unchanged') return;
    await this.hostCoordinator.syncAndRestore();
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

  protected canControlSession(): boolean {
    return this.terminal.sessionActive;
  }

  protected getRecentCommands() {
    return this.util.getRecentCommands();
  }

  protected getVisibleEnvironmentVariables() {
    return this.system.getVisibleEnvironmentVariables();
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

  protected shouldRenderPanePreview(pane: RuntimePane): boolean {
    return this.ws.shouldRenderPanePreview(pane);
  }

  protected getPanePreviewText(pane: RuntimePane): string {
    return this.ws.getPanePreviewText(pane);
  }

  protected formatClock(value: string): string {
    return this.system.formatClock(value);
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }
}
