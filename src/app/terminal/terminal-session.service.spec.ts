import { sanitizeTerminalInput } from './terminal-session.service';
import { TestBed } from '@angular/core/testing';

import { TerminalSessionService } from './terminal-session.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalBridgeService } from '../terminal-bridge.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { WorkspaceBridgeService } from '../workspace-bridge.service';

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe('sanitizeTerminalInput', () => {
  it('removes focus-reporting control sequences before forwarding input', () => {
    expect(sanitizeTerminalInput('\u001b[Ipwd\r')).toBe('pwd\r');
    expect(sanitizeTerminalInput('\u001b[O')).toBe('');
  });

  it('unwraps bracketed paste markers and null bytes', () => {
    expect(sanitizeTerminalInput('\u0000\u001b[200~pwd\u001b[201~\r')).toBe('pwd\r');
  });
});

describe('TerminalSessionService', () => {
  let service: TerminalSessionService;
  let workspace: WorkspaceRuntimeService;
  let terminalBridge: jasmine.SpyObj<TerminalBridgeService>;

  beforeAll(() => {
    (window as typeof window & { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub as never;
  });

  beforeEach(() => {
    terminalBridge = jasmine.createSpyObj<TerminalBridgeService>('TerminalBridgeService', [
      'createSession',
      'sendInput',
      'resizeSession',
      'disposeSession',
      'interruptSession',
      'getSessionInfo',
      'onData',
      'onExit',
      'onInfo',
    ]);
    terminalBridge.createSession.and.resolveTo('session-1');
    terminalBridge.sendInput.and.resolveTo();
    terminalBridge.resizeSession.and.resolveTo();
    terminalBridge.disposeSession.and.resolveTo();
    terminalBridge.interruptSession.and.resolveTo();
    terminalBridge.getSessionInfo.and.callFake(async (id: string) => ({
      id,
      pid: 1234,
      cwd: 'C:\\Tabs',
      shell: 'powershell',
      status: 'running',
      startedAt: '2026-07-02T10:00:00.000Z',
      lastActiveAt: '2026-07-02T10:00:00.000Z',
      endedAt: null,
      exitCode: null,
      detectedPort: null,
    }));
    terminalBridge.onData.and.returnValue(() => undefined);
    terminalBridge.onExit.and.returnValue(() => undefined);
    terminalBridge.onInfo.and.returnValue(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        TerminalSessionService,
        WorkspaceRuntimeService,
        {
          provide: WorkspaceBridgeService,
          useValue: {
            listWorkspaces: async () => [],
            saveWorkspace: async (draft: any) => ({
              ...draft,
              updatedAt: '2026-07-02T10:00:00.000Z',
            }),
          },
        },
        { provide: TerminalBridgeService, useValue: terminalBridge },
        {
          provide: UtilityPanelService,
          useValue: {
            appendOutput: () => undefined,
            scanOutputForProblems: () => undefined,
            trackCommand: () => undefined,
          },
        },
        {
          provide: SystemMonitorService,
          useValue: {
            refreshSessionEnvironment: async () => undefined,
          },
        },
      ],
    });

    service = TestBed.inject(TerminalSessionService);
    workspace = TestBed.inject(WorkspaceRuntimeService);
    workspace.selectedWorkspaceId = 'ws-1';
    workspace.workspaceName = 'Demo';
    workspace.workingDirectory = 'C:\\Tabs';
    workspace.focusedPaneId = 'pane-1';
    workspace.activeTabId = 'tab-1';
    workspace.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'One',
        cwd: 'C:\\Tabs\\One',
        status: 'running',
        accent: 'violet',
        shell: 'powershell',
        startupCommand: '',
      },
      {
        id: 'tab-2',
        title: 'Two',
        cwd: 'C:\\Tabs\\Two',
        status: 'running',
        accent: 'amber',
        shell: 'powershell',
        startupCommand: '',
      },
    ];
    workspace.runtimePanes = [{ id: 'pane-1', tabId: 'tab-1', session: null }];
    service.setTerminalHosts(new Map([['pane-1', document.createElement('div')]]));
  });

  it('keeps tab sessions alive when switching a pane between tabs', async () => {
    terminalBridge.createSession.and.returnValues(
      Promise.resolve('session-1'),
      Promise.resolve('session-2')
    );

    await service.restorePaneSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(1);

    workspace.runtimePanes = [{ id: 'pane-1', tabId: 'tab-2', session: null }];
    workspace.activeTabId = 'tab-2';
    workspace.workingDirectory = 'C:\\Tabs\\Two';

    await service.restorePaneSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(2);
    expect(terminalBridge.disposeSession).not.toHaveBeenCalled();

    workspace.runtimePanes = [{ id: 'pane-1', tabId: 'tab-1', session: null }];
    workspace.activeTabId = 'tab-1';
    workspace.workingDirectory = 'C:\\Tabs\\One';

    await service.restorePaneSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(2);
    expect(terminalBridge.disposeSession).not.toHaveBeenCalled();
  });
});
