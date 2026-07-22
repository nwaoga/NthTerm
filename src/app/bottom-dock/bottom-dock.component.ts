import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CommandHistoryEntry, OutputLine, SearchResultGroup, UtilityPanelId } from '../models';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Component({
  selector: 'app-bottom-dock',
  imports: [FormsModule],
  templateUrl: './bottom-dock.component.html',
})
export class BottomDockComponent {
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @Output() readonly utilityTabChange = new EventEmitter<UtilityPanelId>();
  @Output() readonly collapseRequested = new EventEmitter<void>();

  protected readonly util = inject(UtilityPanelService);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly system = inject(SystemMonitorService);
  protected readonly workspace = inject(WorkspaceRuntimeService);
  private readonly terminal = inject(TerminalSessionService);

  protected getUtilityTabs() {
    return this.util.getUtilityTabs();
  }

  protected getActiveTabLabel(): string {
    const active = this.getUtilityTabs().find((tab) => tab.id === this.util.activeTab);
    return active?.label || 'Output';
  }

  protected setUtilityTab(tab: UtilityPanelId): void {
    this.util.activeTab = tab;
    this.utilityTabChange.emit(tab);
  }

  protected collapse(): void {
    this.collapseRequested.emit();
  }

  focusSearchInput(): void {
    if (this.util.activeTab !== 'search') {
      this.util.activeTab = 'search';
    }

    setTimeout(() => {
      const input = this.searchInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected clearOutput(): void {
    this.util.clearOutput();
  }

  protected clearProblems(): void {
    this.util.clearProblems();
  }

  protected getSearchResultGroups(): SearchResultGroup[] {
    return this.palette.getSearchResultGroups();
  }

  protected async executeSearchResult(item: SearchResultGroup['items'][number]): Promise<void> {
    await this.palette.executeSearchResult(item);
  }

  protected async rerunCommand(command: string): Promise<void> {
    await this.terminal.rerunCommand(command);
  }

  protected formatClock(value: string): string {
    return this.system.formatClock(value);
  }

  protected formatMetric(value: number | null | undefined, suffix = ''): string {
    return this.system.formatMetric(value, suffix);
  }

  protected getOutputLineCount(): number {
    return this.util.outputLines.length;
  }

  protected getProblemCount(): number {
    return this.util.problems.length;
  }

  protected getWarningCount(): number {
    return this.util.problems.filter((problem) => problem.severity === 'warning').length;
  }

  protected getErrorCount(): number {
    return this.util.problems.filter((problem) => problem.severity === 'error').length;
  }

  protected getCommandHistoryCount(): number {
    return this.util.commandHistory.length;
  }

  protected getSearchResultCount(): number {
    return this.getSearchResultGroups().reduce((total, group) => total + group.items.length, 0);
  }

  protected getMemoryDisplay(): string {
    return this.system.getMemoryDisplay();
  }

  protected getNetworkDisplay(): string {
    return this.system.getNetworkDisplay();
  }

  protected getMetricProgress(metric: 'cpu' | 'memory' | 'disk' | 'network'): number {
    return this.system.getMetricProgress(metric);
  }

  protected getOutputSummary(): string {
    return `${this.getOutputLineCount()} events`;
  }

  protected getProblemsSummary(): string {
    return `${this.getErrorCount()} errors · ${this.getWarningCount()} warnings`;
  }

  protected getSearchSummary(): string {
    const query = this.util.searchQuery.trim();
    if (!query) {
      return 'Workspaces, tabs, commands, output';
    }

    return `${this.getSearchResultCount()} matches for "${query}"`;
  }

  protected getCommandHistorySummary(): string {
    return `${this.getCommandHistoryCount()} captured commands`;
  }

  protected getCommandSource(entry: CommandHistoryEntry): string {
    return this.workspace.getCommandHistorySource(entry);
  }

  protected formatOutputLine(line: OutputLine): string {
    if (this.workspace.previewMode) {
      return line.message;
    }

    return `[${this.formatClock(line.timestamp)}] ${line.level}: ${line.message}`;
  }
}
