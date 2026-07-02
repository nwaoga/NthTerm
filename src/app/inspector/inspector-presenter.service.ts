import { Injectable, inject } from '@angular/core';

import { InspectorItem, InspectorSummaryItem } from '../models';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

@Injectable({ providedIn: 'root' })
export class InspectorPresenterService {
  activeTab: 'tab' | 'session' = 'tab';

  private readonly workspace = inject(WorkspaceRuntimeService);
  private readonly terminal = inject(TerminalSessionService);
  private readonly systemMonitor = inject(SystemMonitorService);

  getInspectorItems(): InspectorItem[] {
    const focusedTab = this.workspace.getFocusedTab();
    if (this.activeTab === 'session') {
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
    ];
  }

    return [
      {
        label: 'Directory',
        value: focusedTab?.cwd || this.workspace.workingDirectory || 'n/a',
      },
      { label: 'Shell', value: this.workspace.getFocusedTabShellLabel() },
      {
        label: 'Startup Command',
        value: focusedTab?.startupCommand?.trim() || 'None',
      },
      { label: 'Workspace', value: this.workspace.workspaceName || 'n/a' },
      {
        label: 'Template',
        value: this.workspace.activeWorkspace?.templateId || 'custom',
      },
      { label: 'Layout', value: this.workspace.layoutMode },
      { label: 'Focused Pane', value: this.workspace.focusedPaneId },
      {
        label: 'Launch Profile',
        value: this.workspace.workspaceSummary.launchProfile || 'manual',
      },
      { label: 'Status', value: focusedTab?.status || 'idle' },
      {
        label: 'Last Recovery',
        value: this.workspace.recoverySnapshot.lastStopReason || 'Clean restore',
      },
      {
        label: 'Last Session Ended',
        value:
          this.systemMonitor.formatTimestamp(this.workspace.recoverySnapshot.lastSessionEndedAt) ||
          'n/a',
      },
      { label: 'Last Saved', value: this.workspace.lastSavedAt || 'pending' },
    ];
  }

  getInspectorSummaryItems(): InspectorSummaryItem[] {
    const focusedTab = this.workspace.getFocusedTab();
    return [
      {
        label: 'Shell',
        value: this.workspace.previewMode
          ? 'PowerShell 7.4.2'
          : this.workspace.getFocusedTabShellLabel(),
      },
      {
        label: 'Directory',
        value: focusedTab?.cwd || this.workspace.workingDirectory || 'n/a',
      },
      {
        label: 'Git Branch',
        value: focusedTab?.title === 'Docker' ? 'infra' : 'main',
      },
      {
        label: 'Process',
        value: this.formatProcessSummary(focusedTab),
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
          focusedTab?.title === 'Docker'
            ? 'n/a'
            : focusedTab?.title === 'Database'
              ? '5432'
              : focusedTab?.title === 'API'
                ? 'https://localhost:7192'
                : 'http://localhost:4200',
      },
    ];
  }

  private formatProcessSummary(focusedTab: ReturnType<WorkspaceRuntimeService['getFocusedTab']>): string {
    const command = focusedTab?.startupCommand?.trim();
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
