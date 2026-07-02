import { Injectable } from '@angular/core';

import {
  CommandHistoryEntry,
  OutputLine,
  ProblemEntry,
  RecoverySnapshot,
  RuntimeSessionInfo,
  SessionHistoryEntry,
} from '../models';
import { EnvironmentVariable, SystemMetrics } from '../system-bridge.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';

export interface ReferenceReviewSeedOptions {
  forceDockContent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReferenceReviewContentService {
  applyFullPreviewState(
    workspace: WorkspaceRuntimeService,
    utility: UtilityPanelService,
    system: SystemMonitorService,
    terminal: TerminalSessionService
  ): void {
    workspace.loadReferencePreviewState();
    this.applyWorkspaceReviewMetadata(workspace);
    this.applyDockContent(utility, system, { forceDockContent: true });
    this.applyTerminalReviewContext(terminal);
    this.applyEnvironmentReviewContext(system);
    utility.activeTab = 'output';
  }

  applySupplementalReviewContent(
    workspace: WorkspaceRuntimeService,
    utility: UtilityPanelService,
    system: SystemMonitorService,
    terminal: TerminalSessionService,
    options: ReferenceReviewSeedOptions = {}
  ): void {
    this.applyDockContent(utility, system, options);

    if (!workspace.sessionHistory.length) {
      this.applyWorkspaceReviewMetadata(workspace);
    }

    if (!system.environmentVariables.length) {
      this.applyEnvironmentReviewContext(system);
    }

    if (!terminal.sessionInfo?.pid) {
      this.applyTerminalReviewContext(terminal);
    }
  }

  applyWorkspaceReviewMetadata(workspace: WorkspaceRuntimeService): void {
    workspace.sessionHistory = this.createSessionHistory();
    workspace.recoverySnapshot = this.createRecoverySnapshot();
    workspace.lastSavedAt = 'Today at 09:12:05';
  }

  applyDockContent(
    utility: UtilityPanelService,
    system: SystemMonitorService,
    options: ReferenceReviewSeedOptions = {}
  ): void {
    const force = options.forceDockContent ?? false;
    const now = new Date().toISOString();

    if (force || !utility.problems.length) {
      utility.problems = this.createProblems(now);
    }

    if (force || !utility.commandHistory.length) {
      utility.commandHistory = this.createCommandHistory(now);
    }

    if (force || !utility.outputLines.length) {
      utility.outputLines = this.createOutputLines(now);
    }

    if (force || !system.systemMetrics) {
      system.systemMetrics = this.createSystemMetrics(now);
    }
  }

  applyTerminalReviewContext(terminal: TerminalSessionService): void {
    terminal.setPreviewSessionInfo(this.createTerminalSessionInfo());
  }

  applyEnvironmentReviewContext(system: SystemMonitorService): void {
    system.environmentVariables = this.createEnvironmentVariables();
  }

  createSessionHistory(): SessionHistoryEntry[] {
    const startedAt = new Date(Date.now() - 12 * 60 * 1000).toISOString();

    return [
      {
        id: 'session-api-live',
        tabId: 'tab-api',
        tabTitle: 'API',
        paneId: 'pane-1',
        shell: 'PowerShell 7.4.2',
        cwd: 'C:\\Projects\\CloudPOS\\Api',
        status: 'running',
        reason: 'Session attached',
        startedAt,
        lastActiveAt: new Date().toISOString(),
        endedAt: null,
        exitCode: null,
        detectedPort: 7192,
      },
      {
        id: 'session-angular-live',
        tabId: 'tab-angular',
        tabTitle: 'Angular',
        paneId: 'pane-2',
        shell: 'PowerShell 7.4.2',
        cwd: 'C:\\Projects\\CloudPOS\\Angular',
        status: 'running',
        reason: 'Session attached',
        startedAt,
        lastActiveAt: new Date().toISOString(),
        endedAt: null,
        exitCode: null,
        detectedPort: 4200,
      },
    ];
  }

  createRecoverySnapshot(): RecoverySnapshot {
    const now = new Date().toISOString();

    return {
      lastLaunchAt: now,
      lastAttachedPaneId: 'pane-1',
      lastAttachedTabId: 'tab-api',
      lastExitCode: null,
      lastStopReason: 'Clean restore',
      lastSessionEndedAt: null,
      lastRecoveredAt: now,
    };
  }

  createProblems(timestamp: string): ProblemEntry[] {
    return [
      {
        id: 'problem-1',
        severity: 'error',
        message: 'Webpack warning in Angular build output',
        source: 'Angular',
        timestamp,
      },
      {
        id: 'problem-2',
        severity: 'warning',
        message: 'Docker container restart detected',
        source: 'Docker',
        timestamp,
      },
    ];
  }

  createCommandHistory(timestamp: string): CommandHistoryEntry[] {
    return [
      { id: 'cmd-1', command: 'dotnet run', timestamp, tabTitle: 'API' },
      { id: 'cmd-2', command: 'dotnet build', timestamp, tabTitle: 'API' },
      { id: 'cmd-3', command: 'dotnet restore', timestamp, tabTitle: 'API' },
      { id: 'cmd-4', command: 'code .', timestamp, tabTitle: 'Angular' },
      { id: 'cmd-5', command: 'git pull', timestamp, tabTitle: 'API' },
    ];
  }

  createOutputLines(timestamp: string): OutputLine[] {
    return [
      { id: 'out-1', timestamp, level: 'info', message: 'OrderService - Processing order 12345' },
      { id: 'out-2', timestamp, level: 'info', message: 'PaymentService - Payment authorized' },
      { id: 'out-3', timestamp, level: 'info', message: 'InventoryService - Stock reserved' },
      {
        id: 'out-4',
        timestamp,
        level: 'info',
        message: 'OrderService - Order 12345 completed successfully',
      },
      {
        id: 'out-5',
        timestamp,
        level: 'info',
        message: 'NotificationService - Email sent to customer',
      },
      { id: 'out-6', timestamp, level: 'info', message: 'OrderService - Order 12346 created' },
    ];
  }

  createSystemMetrics(collectedAt: string): SystemMetrics {
    return {
      cpuPercent: 23,
      memoryUsedGb: 6.2,
      memoryPercent: 39,
      memoryTotalGb: 16,
      diskPercent: 45,
      networkMbps: 12.4,
      networkDownloadMbps: 12.4,
      networkUploadMbps: 8.7,
      collectedAt,
    };
  }

  createTerminalSessionInfo(): RuntimeSessionInfo {
    return {
      id: 'preview-session-api',
      pid: 18452,
      cwd: 'C:\\Projects\\CloudPOS\\Api',
      shell: 'PowerShell 7.4.2',
      status: 'running',
      startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
      endedAt: null,
      exitCode: null,
      detectedPort: 7192,
    };
  }

  createEnvironmentVariables(): EnvironmentVariable[] {
    return [
      { name: 'ASPNETCORE_ENVIRONMENT', value: 'Development' },
      { name: 'DOTNET_ENVIRONMENT', value: 'Development' },
      { name: 'PATH', value: '...,\\bin' },
    ];
  }
}
