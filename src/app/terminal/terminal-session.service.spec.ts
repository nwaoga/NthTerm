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
    workspace.activeTabId = 'tab-1';
    workspace.runtimeTabs = [
      {
        id: 'tab-1',
        title: 'One',
        cwd: 'C:\\Tabs\\One',
        accent: 'violet',
        layoutMode: 'grid-2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-1',
        terminals: [
          {
            id: 'terminal-1',
            cwd: 'C:\\Tabs\\One',
            shell: 'powershell',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
      {
        id: 'tab-2',
        title: 'Two',
        cwd: 'C:\\Tabs\\Two',
        accent: 'amber',
        layoutMode: 'grid-2',
        colSplit: 50,
        rowSplit: 50,
        focusedTerminalId: 'terminal-2',
        terminals: [
          {
            id: 'terminal-2',
            cwd: 'C:\\Tabs\\Two',
            shell: 'powershell',
            startupCommand: '',
            status: 'running',
            session: null,
          },
        ],
      },
    ];
    service.setTerminalHosts(new Map([['terminal-1', document.createElement('div')]]));
  });

  it('keeps terminal sessions alive when switching tabs', async () => {
    terminalBridge.createSession.and.returnValues(
      Promise.resolve('session-1'),
      Promise.resolve('session-2'),
      Promise.resolve('session-1b')
    );

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(1);

    workspace.activeTabId = 'tab-2';
    workspace.workingDirectory = 'C:\\Tabs\\Two';
    service.setTerminalHosts(new Map([['terminal-2', document.createElement('div')]]));

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(2);
    expect(terminalBridge.disposeSession).toHaveBeenCalledTimes(1);

    workspace.activeTabId = 'tab-1';
    workspace.workingDirectory = 'C:\\Tabs\\One';
    service.setTerminalHosts(new Map([['terminal-1', document.createElement('div')]]));

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(3);
  });

  it('reattaches a terminal surface when focusing it again', async () => {
    const terminalOneHost = document.createElement('div');
    const terminalTwoHost = document.createElement('div');
    service.setTerminalHosts(
      new Map([
        ['terminal-1', terminalOneHost],
        ['terminal-2', terminalTwoHost],
      ])
    );
    workspace.runtimeTabs[0].terminals.push({
      id: 'terminal-2',
      cwd: 'C:\\Tabs\\One-B',
      shell: 'powershell',
      startupCommand: '',
      status: 'running',
      session: null,
    });

    await service.restoreTerminalSessions();
    expect(terminalOneHost.childNodes.length).toBe(1);

    terminalTwoHost.replaceChildren(...Array.from(terminalOneHost.childNodes));
    terminalOneHost.replaceChildren();
    expect(terminalOneHost.childNodes.length).toBe(0);
    expect(terminalTwoHost.childNodes.length).toBe(1);

    service.reattachTerminalSession('terminal-1');
    expect(terminalOneHost.childNodes.length).toBe(1);
    expect(terminalTwoHost.childNodes.length).toBe(0);
  });
});
