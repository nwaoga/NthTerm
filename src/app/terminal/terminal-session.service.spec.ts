import type { Mock } from 'vitest';
import { sanitizeTerminalInput, PREVIEW_REFRESH_INTERVAL_MS } from './terminal-session.service';
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TerminalSessionService } from './terminal-session.service';
import { SystemMonitorService } from '../system/system-monitor.service';
import { TerminalBridgeService } from '../terminal-bridge.service';
import { UtilityPanelService } from '../utility-panel/utility-panel.service';
import { WorkspaceRuntimeService } from '../workspace/workspace-runtime.service';
import { WorkspaceBridgeService } from '../workspace-bridge.service';

class ResizeObserverStub {
    observe(): void { }
    disconnect(): void { }
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
    let terminalBridge: {
        createSession: Mock;
        sendInput: Mock;
        resizeSession: Mock;
        disposeSession: Mock;
        interruptSession: Mock;
        getSessionInfo: Mock;
        listWslDistros: Mock;
        onData: Mock;
        onExit: Mock;
        onInfo: Mock;
    };
    let utility: {
        appendOutput: Mock;
        scanOutputForProblems: Mock;
        trackCommand: Mock;
    };

    beforeAll(() => {
        (window as typeof window & {
            ResizeObserver: typeof ResizeObserverStub;
        }).ResizeObserver =
            ResizeObserverStub as never;
    });

    beforeEach(() => {
        terminalBridge = {
            createSession: vi.fn().mockName("TerminalBridgeService.createSession"),
            sendInput: vi.fn().mockName("TerminalBridgeService.sendInput"),
            resizeSession: vi.fn().mockName("TerminalBridgeService.resizeSession"),
            disposeSession: vi.fn().mockName("TerminalBridgeService.disposeSession"),
            interruptSession: vi.fn().mockName("TerminalBridgeService.interruptSession"),
            getSessionInfo: vi.fn().mockName("TerminalBridgeService.getSessionInfo"),
            listWslDistros: vi.fn().mockName("TerminalBridgeService.listWslDistros"),
            onData: vi.fn().mockName("TerminalBridgeService.onData"),
            onExit: vi.fn().mockName("TerminalBridgeService.onExit"),
            onInfo: vi.fn().mockName("TerminalBridgeService.onInfo")
        };
        terminalBridge.createSession.mockResolvedValue('session-1');
        terminalBridge.sendInput.mockResolvedValue(undefined);
        terminalBridge.resizeSession.mockResolvedValue(undefined);
        terminalBridge.disposeSession.mockResolvedValue(undefined);
        terminalBridge.interruptSession.mockResolvedValue(undefined);
        terminalBridge.getSessionInfo.mockImplementation(async (id: string) => ({
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
        terminalBridge.listWslDistros.mockResolvedValue([]);
        terminalBridge.onData.mockReturnValue(() => undefined);
        terminalBridge.onExit.mockReturnValue(() => undefined);
        terminalBridge.onInfo.mockReturnValue(() => undefined);
        utility = {
            appendOutput: vi.fn().mockName("UtilityPanelService.appendOutput"),
            scanOutputForProblems: vi.fn().mockName("UtilityPanelService.scanOutputForProblems"),
            trackCommand: vi.fn().mockName("UtilityPanelService.trackCommand")
        };

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
        const runSpy = vi.spyOn(ngZone, 'run');
        const state = (service as any).terminalSessions.get('terminal-1');

        (service as any).trackTerminalInput(state, 'npm run build\r');

        expect(runSpy).toHaveBeenCalled();
        expect(utility.trackCommand).toHaveBeenCalledTimes(1);
        expect(utility.trackCommand).toHaveBeenCalledWith('npm run build', {
            terminalId: 'terminal-1',
            tabTitle: 'Demo',
            terminalTitle: 'PowerShell 1',
        });
    });

    it('keeps terminal sessions alive when focusing another terminal', async () => {
        terminalBridge.createSession.mockReturnValueOnce(Promise.resolve('session-1')).mockReturnValueOnce(Promise.resolve('session-2'));

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
        expect(terminalBridge.disposeSession).toHaveBeenCalledTimes(1);
        expect(terminalBridge.disposeSession).toHaveBeenCalledWith('session-2');
    });

    it('starts one PTY when terminal restores overlap', async () => {
        let resolveSession!: (sessionId: string) => void;
        terminalBridge.createSession.mockReturnValue(new Promise<string>((resolve) => {
            resolveSession = resolve;
        }));

        const firstRestore = service.restoreTerminalSessions();
        const secondRestore = service.restoreTerminalSessions();
        await Promise.resolve();
        await Promise.resolve();

        expect(terminalBridge.createSession).toHaveBeenCalledTimes(1);
        expect(terminalBridge.createSession).toHaveBeenCalledWith(expect.objectContaining({ terminalId: 'terminal-1' }));

        resolveSession('session-1');
        await Promise.all([firstRestore, secondRestore]);
        expect(workspace.terminals[0].session?.sessionId).toBe('session-1');
    });

    it('creates the PTY using the measured xterm dimensions', async () => {
        const terminal = {
            cols: 80,
            rows: 24,
            clear: () => undefined,
            reset: () => undefined,
        };
        const state = {
            terminalId: 'terminal-1',
            terminal,
            fitAddon: {
                fit: () => {
                    terminal.cols = 108;
                    terminal.rows = 34;
                },
            },
            info: null,
            inputBuffer: '',
        };

        await (service as any).startTerminalSession(state, workspace.terminals[0]);

        expect(terminalBridge.createSession).toHaveBeenCalledWith(expect.objectContaining({ terminalId: 'terminal-1', cols: 108, rows: 34 }));
    });

    it('reattaches a terminal surface when focusing it again', async () => {
        const terminalOneHost = document.createElement('div');
        const terminalTwoHost = document.createElement('div');
        service.setTerminalHosts(new Map([
            ['terminal-1', terminalOneHost],
            ['terminal-2', terminalTwoHost],
        ]));

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
        service.setTerminalHosts(new Map([
            ['terminal-1', interactiveHost],
            ['terminal-2', parkHost],
        ]));
        terminalBridge.createSession.mockReturnValueOnce(Promise.resolve('session-1')).mockReturnValueOnce(Promise.resolve('session-2'));

        await service.restoreTerminalSessions();
        terminalBridge.resizeSession.mockClear();

        const interactiveState = (service as any).terminalSessions.get('terminal-1');
        const parkState = (service as any).terminalSessions.get('terminal-2');
        interactiveState.lastCols = undefined;
        interactiveState.lastRows = undefined;
        vi.spyOn(interactiveState.fitAddon, 'fit').mockImplementation(() => {
            Object.defineProperty(interactiveState.terminal, 'cols', { value: 100, configurable: true });
            Object.defineProperty(interactiveState.terminal, 'rows', { value: 40, configurable: true });
        });
        vi.spyOn(parkState.fitAddon, 'fit').mockReturnValue(undefined);

        service.syncTerminalSize();
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

        expect(interactiveState.fitAddon.fit).toHaveBeenCalled();
        expect(parkState.fitAddon.fit).not.toHaveBeenCalled();
        expect(terminalBridge.resizeSession).toHaveBeenCalledWith('session-1', 100, 40);
    });

    it('throttles preview version bumps while still writing every data chunk', async () => {
        let onData: ((event: {
            id: string;
            data: string;
        }) => void) | undefined;
        terminalBridge.onData.mockImplementation((handler: (event: {
            id: string;
            data: string;
        }) => void) => {
            onData = handler;
            return () => undefined;
        });

        await service.restoreTerminalSessions();
        const state = (service as any).terminalSessions.get('terminal-1');
        expect(state?.sessionId).toBe('session-1');
        const writeSpy = vi.spyOn(state.terminal, 'write').mockReturnValue(undefined);
        const runSpy = vi.spyOn(TestBed.inject(NgZone), 'run');
        const initialVersion = service.getPreviewVersion();

        vi.useFakeTimers();
        try {
            onData?.({ id: 'session-1', data: 'line-1\n' });
            onData?.({ id: 'session-1', data: 'line-2\n' });
            onData?.({ id: 'session-1', data: 'line-3\n' });

            expect(writeSpy).toHaveBeenCalledTimes(3);
            expect(utility.scanOutputForProblems).toHaveBeenCalledTimes(3);
            expect(service.getPreviewVersion()).toBe(initialVersion);
            expect(runSpy).not.toHaveBeenCalled();

            vi.advanceTimersByTime(PREVIEW_REFRESH_INTERVAL_MS);
            expect(service.getPreviewVersion()).toBe(initialVersion + 1);
            expect(runSpy).toHaveBeenCalled();

            runSpy.mockClear();
            onData?.({ id: 'session-1', data: 'line-4\n' });
            vi.advanceTimersByTime(PREVIEW_REFRESH_INTERVAL_MS);
            expect(service.getPreviewVersion()).toBe(initialVersion + 2);
            expect(runSpy).toHaveBeenCalled();
        }
        finally {
            vi.useRealTimers();
        }
    });
});
