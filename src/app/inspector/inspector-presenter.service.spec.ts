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
    getFocusedTab: () => ({
      id: 'tab-1',
      title: 'API',
      cwd: 'C:/repo/apps/api',
    }),
    getFocusedTerminal: () => ({
      id: 'terminal-1',
      cwd: 'C:/repo/apps/api',
      startupCommand: 'npm run api',
      status: 'running',
      shell: 'powershell',
    }),
    getFocusedTabShellLabel: () => 'PowerShell',
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

  it('returns tab-focused inspector items by default', () => {
    const service = TestBed.inject(InspectorPresenterService);

    const items = service.getInspectorItems();

    expect(items[0]).toEqual({ label: 'Directory', value: 'C:/repo/apps/api' });
    expect(items.find((item) => item.label === 'Startup Command')?.value).toBe('npm run api');
    expect(items.find((item) => item.label === 'Last Recovery')?.value).toBe('Process exited');
  });

  it('returns live session details when the session tab is active', () => {
    const service = TestBed.inject(InspectorPresenterService);
    service.activeTab = 'session';

    const items = service.getInspectorItems();

    expect(items[0]).toEqual({ label: 'Shell', value: 'PowerShell' });
    expect(items.find((item) => item.label === 'Session Id')?.value).toBe('pty-1');
    expect(items.find((item) => item.label === 'Port')?.value).toBe('7192');
    expect(items.find((item) => item.label === 'Recovery')?.value).toBe('Process exited');
  });
});
