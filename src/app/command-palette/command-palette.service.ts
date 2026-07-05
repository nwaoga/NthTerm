import { Injectable, inject } from '@angular/core';

import {
  PaletteActionDispatcher,
  PaletteEntry,
  PaletteEntryKind,
  SearchResultGroup,
  WORKSPACE_TEMPLATES,
} from '../models';
import { SystemMonitorService } from '../system/system-monitor.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  open = false;
  query = '';
  index = 0;

  private dispatcher?: PaletteActionDispatcher;

  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly utility = inject(UtilityPanelService);
  private readonly systemMonitor = inject(SystemMonitorService);

  setDispatcher(dispatcher: PaletteActionDispatcher): void {
    this.dispatcher = dispatcher;
  }

  openPalette(focusSearch = false): void {
    this.open = true;
    this.index = 0;
    if (!focusSearch) {
      this.query = '';
    }
  }

  openGlobalSearch(): void {
    this.utility.activeTab = 'search';
    this.query = this.utility.searchQuery;
    this.openPalette(true);
  }

  close(): void {
    this.open = false;
    this.query = '';
    this.index = 0;
  }

  onQueryChange(): void {
    this.index = 0;
    this.utility.searchQuery = this.query;
  }

  getFilteredEntries(): PaletteEntry[] {
    const query = this.query.trim().toLowerCase();
    const entries = [...this.getActionEntries(), ...this.getSearchEntries()];

    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.group}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  isEntryActive(index: number): boolean {
    return index === this.index;
  }

  moveSelection(direction: 'up' | 'down'): void {
    const entries = this.getFilteredEntries();
    if (!entries.length) {
      this.index = 0;
      return;
    }

    if (direction === 'down') {
      this.index = (this.index + 1) % entries.length;
    } else {
      this.index = (this.index - 1 + entries.length) % entries.length;
    }
  }

  async executeEntry(entry: PaletteEntry): Promise<void> {
    this.close();
    const dispatcher = this.dispatcher;
    if (!dispatcher) {
      return;
    }

    switch (entry.kind) {
      case 'action':
        await this.runAction(entry.id);
        break;
      case 'workspace':
        await dispatcher.selectWorkspace(entry.id);
        break;
      case 'tab':
        await dispatcher.selectTab(entry.id);
        break;
      case 'template':
        await dispatcher.createWorkspaceFromTemplate(entry.id);
        break;
      case 'command':
        await dispatcher.rerunCommand(entry.label);
        break;
      case 'output':
        dispatcher.openUtilityPanel('output');
        dispatcher.appendOutput(`Search match: ${entry.label}`, 'info');
        break;
      case 'problem':
        dispatcher.openUtilityPanel('problems');
        break;
      case 'pane':
        await dispatcher.focusPane(entry.id);
        break;
    }
  }

  async executeSearchResult(item: SearchResultGroup['items'][number]): Promise<void> {
    await this.executeEntry({
      id: item.id,
      kind: item.kind || 'action',
      group: 'Search',
      label: item.title,
      detail: item.detail,
    });
  }

  getSearchResultGroups(): SearchResultGroup[] {
    return this.buildSearchResultGroups(this.utility.searchQuery);
  }

  private getActionEntries(): PaletteEntry[] {
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

  private getSearchEntries(): PaletteEntry[] {
    return this.buildSearchResultGroups(this.query).flatMap((group) =>
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

    const workspaceMatches = this.workspace.workspaces
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

    const templateMatches = WORKSPACE_TEMPLATES.filter(
      (template) => matches(template.name) || matches(template.cwd)
    ).map((template) => ({
      id: template.templateId,
      title: template.name,
      detail: template.cwd,
      kind: 'template' as PaletteEntryKind,
    }));

    if (templateMatches.length) {
      groups.push({ label: 'Templates', items: templateMatches });
    }

    const tabMatches = this.workspace.runtimeTabs
      .filter((tab) => matches(tab.title) || matches(tab.cwd))
      .map((tab) => ({
        id: tab.id,
        title: tab.title,
        detail: `${tab.terminals.length} shell${tab.terminals.length === 1 ? '' : 's'} • ${tab.cwd}`,
        kind: 'tab' as PaletteEntryKind,
      }));

    if (tabMatches.length) {
      groups.push({ label: 'Tabs', items: tabMatches });
    }

    const terminalMatches = this.workspace.runtimeTabs.flatMap((tab) =>
      tab.terminals
        .filter(
          (terminal) =>
            matches(terminal.id) ||
            matches(tab.title) ||
            matches(terminal.cwd) ||
            matches(terminal.status)
        )
        .map((terminal) => ({
          id: terminal.id,
          title: `${tab.title} • ${terminal.cwd}`,
          detail: terminal.status,
          kind: 'pane' as PaletteEntryKind,
        }))
    );

    if (terminalMatches.length) {
      groups.push({ label: 'Terminals', items: terminalMatches });
    }

    const commandMatches = this.utility.commandHistory
      .filter((entry) => matches(entry.command) || matches(entry.tabTitle))
      .map((entry) => ({
        id: entry.id,
        title: entry.command,
        detail: `${entry.tabTitle} • ${this.systemMonitor.formatClock(entry.timestamp)}`,
        kind: 'command' as PaletteEntryKind,
      }));

    if (commandMatches.length) {
      groups.push({ label: 'Commands', items: commandMatches });
    }

    const problemMatches = this.utility.problems
      .filter(
        (problem) =>
          matches(problem.message) || matches(problem.source) || matches(problem.severity)
      )
      .map((problem) => ({
        id: problem.id,
        title: problem.message,
        detail: `${problem.severity} • ${problem.source}`,
        kind: 'problem' as PaletteEntryKind,
      }));

    if (problemMatches.length) {
      groups.push({ label: 'Problems', items: problemMatches });
    }

    const outputMatches = this.utility.outputLines
      .filter((line) => matches(line.message) || matches(line.level))
      .slice(-20)
      .map((line) => ({
        id: line.id,
        title: line.message,
        detail: `${line.level} • ${this.systemMonitor.formatClock(line.timestamp)}`,
        kind: 'output' as PaletteEntryKind,
      }));

    if (outputMatches.length) {
      groups.push({ label: 'Output', items: outputMatches });
    }

    return groups;
  }

  private async runAction(actionId: string): Promise<void> {
    const dispatcher = this.dispatcher;
    if (!dispatcher) {
      return;
    }

    switch (actionId) {
      case 'save-workspace':
        await dispatcher.saveWorkspace();
        break;
      case 'restore-workspace':
        await dispatcher.restoreWorkspace();
        break;
      case 'new-tab':
        await dispatcher.createTab();
        break;
      case 'restart-terminal':
        await dispatcher.relaunchTerminal();
        break;
      case 'stop-terminal':
        await dispatcher.interruptTerminal();
        break;
      case 'kill-terminal':
        await dispatcher.killTerminal();
        break;
      case 'open-output':
        dispatcher.openUtilityPanel('output');
        break;
      case 'open-problems':
        dispatcher.openUtilityPanel('problems');
        break;
      case 'open-search':
        dispatcher.openUtilityPanel('search');
        break;
      case 'open-history':
        dispatcher.openUtilityPanel('command-history');
        break;
      case 'inspector-tab':
        dispatcher.setInspectorTab('tab');
        break;
      case 'inspector-session':
        dispatcher.setInspectorTab('session');
        break;
      case 'layout-2':
        await dispatcher.setLayoutMode('grid-2');
        break;
      case 'layout-2x2':
        await dispatcher.setLayoutMode('grid-2x2');
        break;
      case 'open-palette':
        dispatcher.openCommandPalette();
        break;
    }
  }
}
