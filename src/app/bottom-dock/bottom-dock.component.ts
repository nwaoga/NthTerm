import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SearchResultGroup, UtilityPanelId } from '../models';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';

@Component({
  selector: 'app-bottom-dock',
  imports: [FormsModule],
  templateUrl: './bottom-dock.component.html',
})
export class BottomDockComponent {
  @Output() readonly utilityTabChange = new EventEmitter<UtilityPanelId>();

  protected readonly util = inject(UtilityPanelService);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly system = inject(SystemMonitorService);
  private readonly terminal = inject(TerminalSessionService);

  protected getUtilityTabs() {
    return this.util.getUtilityTabs();
  }

  protected setUtilityTab(tab: UtilityPanelId): void {
    this.util.activeTab = tab;
    this.utilityTabChange.emit(tab);
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
}
