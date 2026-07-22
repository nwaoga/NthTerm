import { Injectable } from '@angular/core';

import {
  CommandHistoryEntry,
  CommandHistorySource,
  OutputLine,
  ProblemEntry,
  UtilityPanelId,
  UtilityTab,
} from '../models';

@Injectable({ providedIn: 'root' })
export class UtilityPanelService {
  activeTab: UtilityPanelId = 'output';
  outputLines: OutputLine[] = [];
  problems: ProblemEntry[] = [];
  commandHistory: CommandHistoryEntry[] = [];
  searchQuery = '';

  getUtilityTabs(): UtilityTab[] {
    return [
      { id: 'output', label: 'Output' },
      { id: 'problems', label: 'Problems', count: this.problems.length || undefined },
      { id: 'search', label: 'Search' },
      {
        id: 'command-history',
        label: 'Command History',
        count: this.commandHistory.length || undefined,
      },
    ];
  }

  getRecentCommands(): CommandHistoryEntry[] {
    return this.commandHistory.slice(0, 8);
  }

  appendOutput(message: string, level: OutputLine['level'] = 'info'): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    this.outputLines = [
      ...this.outputLines,
      {
        id: `output-${Date.now()}-${this.outputLines.length}`,
        timestamp: new Date().toISOString(),
        level,
        message: trimmed,
      },
    ].slice(-200);
  }

  clearOutput(): void {
    this.outputLines = [];
  }

  clearProblems(): void {
    this.problems = [];
  }

  trackCommand(command: string, source: string | CommandHistorySource): void {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }

    const tabTitle = typeof source === 'string' ? source : source.tabTitle;

    this.commandHistory = [
      {
        id: `cmd-${Date.now()}-${this.commandHistory.length}`,
        command: trimmed,
        timestamp: new Date().toISOString(),
        tabTitle,
        ...(typeof source === 'string'
          ? {}
          : {
              tabId: source.tabId,
              terminalId: source.terminalId,
              terminalTitle: source.terminalTitle,
            }),
      },
      ...this.commandHistory,
    ].slice(0, 100);
  }

  scanOutputForProblems(data: string, source: string): void {
    const lines = data.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const severity = this.detectProblemSeverity(line);
      if (!severity) {
        continue;
      }

      const duplicate = this.problems.some(
        (problem) => problem.message === line && problem.source === source
      );
      if (duplicate) {
        continue;
      }

      this.problems = [
        {
          id: `problem-${Date.now()}-${this.problems.length}`,
          severity,
          message: line,
          source,
          timestamp: new Date().toISOString(),
        },
        ...this.problems,
      ].slice(0, 100);
    }
  }

  private detectProblemSeverity(line: string): ProblemEntry['severity'] | null {
    const normalized = line.toLowerCase();

    if (
      /\berror\b/.test(normalized) ||
      /\bfailed\b/.test(normalized) ||
      /\bfailure\b/.test(normalized) ||
      normalized.includes('exception') ||
      normalized.includes('err!')
    ) {
      return 'error';
    }

    if (/\bwarn(?:ing)?\b/.test(normalized)) {
      return 'warning';
    }

    return null;
  }
}
