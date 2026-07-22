import { sanitizeTerminalInput } from './terminal-session.service';
import { NgZone } from '@angular/core';
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

  it('removes arrow and navigation sequences from captured commands', () => {
    expect(sanitizeTerminalInput('\u001b[D\u001b[Dgit status\u001b[1;5C\r')).toBe('git status\r');
  });
});

describe('TerminalSessionService', () => {
  let service: TerminalSessionService;
  let workspace: WorkspaceRuntimeService;
  let terminalBridge: jasmine.SpyObj<TerminalBridgeService>;
  let utility: jasmine.SpyObj<UtilityPanelService>;

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
      'listWslDistros',
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
    terminalBridge.listWslDistros.and.resolveTo([]);
    terminalBridge.onData.and.returnValue(() => undefined);
    terminalBridge.onExit.and.returnValue(() => undefined);
    terminalBridge.onInfo.and.returnValue(() => undefined);
    utility = jasmine.createSpyObj<UtilityPanelService>('UtilityPanelService', [
      'appendOutput',
      'scanOutputForProblems',
      'trackCommand',
    ]);

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
        { provide: UtilityPanelService, useValue: utility },
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
    workspace.focusedTerminalId = 'terminal-1';
    workspace.terminals = [
      {
        id: 'terminal-1',
        cwd: 'C:\\Tabs\\One',
        shell: 'powershell',
        startupCommand: '',
        status: 'running',
        session: null,
      },
      {
        id: 'terminal-2',
        cwd: 'C:\\Tabs\\Two',
        shell: 'powershell',
        startupCommand: '',
        status: 'running',
        session: null,
      },
    ];
    service.setTerminalHosts(new Map([['terminal-1', document.createElement('div')]]));
  });

  it('publishes typed commands inside Angular using the terminal and workspace', async () => {
    await service.restoreTerminalSessions();
    workspace.focusedTerminalId = 'terminal-2';
    const ngZone = TestBed.inject(NgZone);
    const runSpy = spyOn(ngZone, 'run').and.callThrough();
    const state = (service as any).terminalSessions.get('terminal-1');

    (service as any).trackTerminalInput(state, 'npm run build\r');

    expect(runSpy).toHaveBeenCalled();
    expect(utility.trackCommand).toHaveBeenCalledOnceWith('npm run build', {
      terminalId: 'terminal-1',
      tabTitle: 'Demo',
      terminalTitle: 'PowerShell 1',
    });
  });

  it('keeps terminal sessions alive when focusing another terminal', async () => {
    terminalBridge.createSession.and.returnValues(
      Promise.resolve('session-1'),
      Promise.resolve('session-2')
    );

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(1);

    workspace.focusedTerminalId = 'terminal-2';
    workspace.workingDirectory = 'C:\\Tabs\\Two';
    service.setTerminalHosts(new Map([['terminal-2', document.createElement('div')]]));

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(2);
    expect(terminalBridge.disposeSession).not.toHaveBeenCalled();
    expect(workspace.terminals[0].session?.sessionId).toBe('session-1');

    workspace.focusedTerminalId = 'terminal-1';
    workspace.workingDirectory = 'C:\\Tabs\\One';
    const restoredHost = document.createElement('div');
    service.setTerminalHosts(new Map([['terminal-1', restoredHost]]));

    await service.restoreTerminalSessions();
    expect(terminalBridge.createSession).toHaveBeenCalledTimes(2);
    expect(terminalBridge.disposeSession).not.toHaveBeenCalled();
    expect(restoredHost.childNodes.length).toBe(1);

    workspace.terminals = workspace.terminals.filter((terminal) => terminal.id !== 'terminal-2');
    await service.restoreTerminalSessions();
    expect(terminalBridge.disposeSession).toHaveBeenCalledOnceWith('session-2');
  });

  it('starts one PTY when terminal restores overlap', async () => {
    let resolveSession!: (sessionId: string) => void;
    terminalBridge.createSession.and.returnValue(
      new Promise<string>((resolve) => {
        resolveSession = resolve;
      })
    );

    const firstRestore = service.restoreTerminalSessions();
    const secondRestore = service.restoreTerminalSessions();
    await Promise.resolve();
    await Promise.resolve();

    expect(terminalBridge.createSession).toHaveBeenCalledTimes(1);
    expect(terminalBridge.createSession).toHaveBeenCalledWith(
      jasmine.objectContaining({ terminalId: 'terminal-1' })
    );

    resolveSession('session-1');
    await Promise.all([firstRestore, secondRestore]);
    expect(workspace.terminals[0].session?.sessionId).toBe('session-1');
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

  it('skips PTY resize for parked hosts and only resizes the interactive terminal', async () => {
    const interactiveHost = document.createElement('div');
    interactiveHost.dataset['terminalInteractive'] = 'true';
    const parkHost = document.createElement('div');
    parkHost.dataset['terminalPark'] = 'true';
    service.setInteractiveTerminalId('terminal-1');
    service.setTerminalHosts(
      new Map([
        ['terminal-1', interactiveHost],
        ['terminal-2', parkHost],
      ])
    );
    terminalBridge.createSession.and.returnValues(
      Promise.resolve('session-1'),
      Promise.resolve('session-2')
    );

    await service.restoreTerminalSessions();
    terminalBridge.resizeSession.calls.reset();

    const interactiveState = (service as any).terminalSessions.get('terminal-1');
    const parkState = (service as any).terminalSessions.get('terminal-2');
    interactiveState.lastCols = undefined;
    interactiveState.lastRows = undefined;
    spyOn(interactiveState.fitAddon, 'fit').and.callFake(() => {
      Object.defineProperty(interactiveState.terminal, 'cols', { value: 100, configurable: true });
      Object.defineProperty(interactiveState.terminal, 'rows', { value: 40, configurable: true });
    });
    spyOn(parkState.fitAddon, 'fit');

    service.syncTerminalSize();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    expect(interactiveState.fitAddon.fit).toHaveBeenCalled();
    expect(parkState.fitAddon.fit).not.toHaveBeenCalled();
    expect(terminalBridge.resizeSession).toHaveBeenCalledWith('session-1', 100, 40);
  });
});
