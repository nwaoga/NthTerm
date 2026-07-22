import { TestBed } from '@angular/core/testing';

import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalSessionService } from '../terminal/terminal-session.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { InspectorPresenterService } from './inspector-presenter.service';

describe('InspectorPresenterService', () => {
  const workspaceService = {
    previewMode: false,
    workingDirectory: 'C:/repo',
    workspaceName: 'Cloud POS',
    activeWorkspace: { templateId: 'api' },
    layoutMode: 'grid-2',
    focusedPaneId: 'pane-1',
    lastSavedAt: '2026-07-01T08:15:00.000Z',
    workspaceSummary: { launchProfile: 'dev' },
    recoverySnapshot: {
      lastStopReason: 'Process exited',
      lastSessionEndedAt: '2026-07-01T08:14:00.000Z',
    },
    terminals: [
      {
        id: 'terminal-1',
        name: 'API',
        cwd: 'C:/repo/apps/api',
        status: 'running',
        startupCommand: 'npm run api',
        shell: 'powershell',
      },
    ],
    getFocusedTerminal: () => ({
      id: 'terminal-1',
      name: 'API',
      cwd: 'C:/repo/apps/api',
      startupCommand: 'npm run api',
      status: 'running',
      shell: 'powershell',
    }),
    getFocusedTerminalShellLabel: () => 'PowerShell',
    getWorkspaceShellProfileLabel: () => 'PowerShell',
    getActiveLayoutLabel: () => 'Full stage',
  };

  const terminalService = {
    sessionInfo: {
      id: 'pty-1',
      shell: 'PowerShell',
      pid: 1234,
      startedAt: '2026-07-01T08:00:00.000Z',
      endedAt: null,
      lastActiveAt: '2026-07-01T08:12:00.000Z',
      detectedPort: 7192,
      exitCode: null,
    },
  };

  const systemMonitorService = {
    formatTimestamp: (value?: string | null) => value ? `ts:${value}` : 'n/a',
    formatUptime: () => '12m 48s',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InspectorPresenterService,
        { provide: WorkspaceRuntimeService, useValue: workspaceService },
        { provide: TerminalSessionService, useValue: terminalService },
        { provide: SystemMonitorService, useValue: systemMonitorService },
      ],
    });
  });

  it('returns workspace-focused inspector items by default', () => {
    const service = TestBed.inject(InspectorPresenterService);

    const items = service.getInspectorItems();
    const summary = service.getInspectorSummaryItems();

    expect(items[0]).toEqual({ label: 'Workspace', value: 'Cloud POS' });
    expect(items.find((item) => item.label === 'Terminals')?.value).toBe('1');
    expect(items.find((item) => item.label === 'Last Saved')?.value).toBe(
      'ts:2026-07-01T08:15:00.000Z'
    );
    expect(summary.find((item) => item.label === 'Terminals')?.value).toBe('1');
    expect(summary.find((item) => item.label === 'Tabs')).toBeUndefined();
  });

  it('returns workspace-level details when the workspace mode is active', () => {
    const service = TestBed.inject(InspectorPresenterService);
    service.activeTab = 'workspace';

    const items = service.getInspectorItems();
    const summary = service.getInspectorSummaryItems();

    expect(items[0]).toEqual({ label: 'Workspace', value: 'Cloud POS' });
    expect(items.find((item) => item.label === 'Shell Profile')?.value).toBe('PowerShell');
    expect(items.find((item) => item.label === 'Last Saved')?.value).toBe(
      'ts:2026-07-01T08:15:00.000Z'
    );
    expect(summary.find((item) => item.label === 'Terminals')?.value).toBe('1');
  });

  it('returns live terminal details when the terminal mode is active', () => {
    const service = TestBed.inject(InspectorPresenterService);
    service.activeTab = 'terminal';

    const items = service.getInspectorItems();

    expect(items[0]).toEqual({ label: 'Shell', value: 'PowerShell' });
    expect(items.find((item) => item.label === 'Session Id')?.value).toBe('pty-1');
    expect(items.find((item) => item.label === 'Port')?.value).toBe('7192');
    expect(items.find((item) => item.label === 'Recovery')?.value).toBe('Process exited');
  });
});
