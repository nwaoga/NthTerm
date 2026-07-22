import { Injectable, inject } from '@angular/core';

import { InspectorItem, InspectorMode, InspectorSummaryItem } from '../models';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Injectable({ providedIn: 'root' })
export class InspectorPresenterService {
  activeTab: InspectorMode = 'workspace';

  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly terminal = inject(TerminalSessionService);
  private readonly systemMonitor = inject(SystemMonitorService);

  getInspectorItems(): InspectorItem[] {
    const focusedTerminal = this.workspace.getFocusedTerminal();
    if (this.activeTab === 'workspace') {
      return [
        { label: 'Workspace', value: this.workspace.workspaceName || 'n/a' },
        { label: 'Directory', value: this.workspace.workingDirectory || 'n/a' },
        { label: 'Shell Profile', value: this.workspace.getWorkspaceShellProfileLabel() },
        { label: 'Terminals', value: this.workspace.terminals.length.toString() },
        {
          label: 'Last Saved',
          value: this.workspace.lastSavedAt
            ? this.systemMonitor.formatTimestamp(this.workspace.lastSavedAt)
            : 'pending',
        },
      ];
    }

    return [
      { label: 'Shell', value: this.terminal.sessionInfo?.shell || 'n/a' },
      { label: 'Session Id', value: this.terminal.sessionInfo?.id || 'n/a' },
      { label: 'PID', value: this.terminal.sessionInfo?.pid?.toString() || 'n/a' },
      {
        label: 'Started',
        value: this.systemMonitor.formatTimestamp(this.terminal.sessionInfo?.startedAt),
      },
      {
        label: 'Uptime',
        value: this.systemMonitor.formatUptime(
          this.terminal.sessionInfo?.startedAt,
          this.terminal.sessionInfo?.endedAt
        ),
      },
      {
        label: 'Last Activity',
        value: this.systemMonitor.formatTimestamp(this.terminal.sessionInfo?.lastActiveAt),
      },
      {
        label: 'Port',
        value: this.terminal.sessionInfo?.detectedPort?.toString() || 'Not detected',
      },
      {
        label: 'Exit Code',
        value: this.terminal.sessionInfo?.exitCode?.toString() ?? 'n/a',
      },
      {
        label: 'Recovery',
        value: this.workspace.recoverySnapshot.lastStopReason || 'Live session',
      },
      {
        label: 'Directory',
        value: focusedTerminal?.cwd || this.workspace.workingDirectory || 'n/a',
      },
    ];
  }

  getInspectorSummaryItems(): InspectorSummaryItem[] {
    const focusedTerminal = this.workspace.getFocusedTerminal();
    if (this.activeTab === 'workspace') {
      return [
        { label: 'Terminals', value: this.workspace.terminals.length.toString() },
        { label: 'Shell Profile', value: this.workspace.getWorkspaceShellProfileLabel() },
        { label: 'Arrangement', value: this.workspace.getActiveLayoutLabel() },
        { label: 'Directory', value: this.workspace.workingDirectory || 'n/a' },
      ];
    }

    return [
      {
        label: 'Shell',
        value: this.workspace.previewMode
          ? 'PowerShell 7.4.2'
          : this.workspace.getFocusedTerminalShellLabel(),
      },
      {
        label: 'Directory',
        value: focusedTerminal?.cwd || this.workspace.workingDirectory || 'n/a',
      },
      {
        label: 'Git Branch',
        value: focusedTerminal?.name === 'Docker' ? 'infra' : 'main',
      },
      {
        label: 'Process',
        value: this.formatProcessSummary(),
      },
      {
        label: 'Started',
        value: this.workspace.previewMode
          ? this.formatPreviewStartedAt()
          : this.systemMonitor.formatTimestamp(this.terminal.sessionInfo?.startedAt),
      },
      {
        label: 'Uptime',
        value: this.systemMonitor.formatUptime(
          this.terminal.sessionInfo?.startedAt,
          this.terminal.sessionInfo?.endedAt
        ),
      },
      {
        label: 'Port',
        value:
          focusedTerminal?.name === 'Docker'
            ? 'n/a'
            : focusedTerminal?.name === 'Database'
              ? '5432'
              : focusedTerminal?.name === 'API'
                ? 'https://localhost:7192'
                : 'http://localhost:4200',
      },
    ];
  }

  private formatProcessSummary(): string {
    const command = this.workspace.getFocusedTerminal()?.startupCommand?.trim();
    if (!command) {
      return 'Interactive shell';
    }

    const pid = this.terminal.sessionInfo?.pid;
    return pid ? `${command} (PID ${pid})` : command;
  }

  private formatPreviewStartedAt(): string {
    const startedAt = this.terminal.sessionInfo?.startedAt;
    if (!startedAt) {
      return 'Today at 09:15:42';
    }

    return `Today at ${new Date(startedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })}`;
  }
}
